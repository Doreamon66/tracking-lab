import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import type { ServerResponse } from 'node:http'
import Database from 'better-sqlite3'
import ExcelJS from 'exceljs'

// ── SQLite 初始化 ──────────────────────────────────────────

const DATA_DIR = resolve(__dirname, 'data')
mkdirSync(DATA_DIR, { recursive: true })

const db = new Database(join(DATA_DIR, 'tracking-lab.db'))
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS skills (
    skill_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    file_path TEXT DEFAULT '',
    current_stable_version TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS skill_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    skill_id TEXT NOT NULL,
    version TEXT NOT NULL,
    base_version TEXT,
    prd_text TEXT,
    changelog TEXT,
    skill_json TEXT NOT NULL,
    status TEXT DEFAULT 'draft',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (skill_id) REFERENCES skills(skill_id)
  );

  CREATE INDEX IF NOT EXISTS idx_snapshots_skill ON skill_snapshots(skill_id);
`)

// 兼容旧表：添加 file_path 列（如果不存在）
try {
  db.exec(`ALTER TABLE skills ADD COLUMN file_path TEXT DEFAULT ''`)
} catch {
  // 列已存在，忽略
}

// 兼容旧表：prd_documents 添加 category 列
try {
  db.exec(`ALTER TABLE prd_documents ADD COLUMN category TEXT DEFAULT '未分类'`)
} catch {
  // 列已存在，忽略
}

try {
  db.exec(`ALTER TABLE run_records ADD COLUMN spec_version_id TEXT DEFAULT ''`)
} catch {
  // 列已存在
}

// 通用规范版本表
db.exec(`
  CREATE TABLE IF NOT EXISTS spec_versions (
    id TEXT PRIMARY KEY,
    version INTEGER NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    note TEXT DEFAULT '',
    created_at INTEGER NOT NULL
  );
`)

try {
  db.exec(`ALTER TABLE spec_versions ADD COLUMN file_path TEXT DEFAULT '__general__'`)
} catch {
  // 列已存在
}

// ── PRD / Run 持久化到 SQLite ──────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS prd_documents (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    raw_text TEXT NOT NULL,
    uploaded_at INTEGER NOT NULL,
    category TEXT DEFAULT '未分类'
  );

  CREATE TABLE IF NOT EXISTS run_records (
    id TEXT PRIMARY KEY,
    prd_id TEXT NOT NULL,
    skill_version_id TEXT DEFAULT '',
    model TEXT DEFAULT '',
    result TEXT DEFAULT '{}',
    raw_response TEXT DEFAULT '',
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS app_state (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`)

interface PrdDoc {
  id: string
  filename: string
  rawText: string
  uploadedAt: number
  category: string
}

interface RunRecord {
  id: string
  prdId: string
  skillVersionId: string
  model: string
  result: unknown
  rawResponse: string
  createdAt: number
  specVersionId?: string
}

function loadPrdDocuments(): PrdDoc[] {
  const rows = db.prepare('SELECT * FROM prd_documents ORDER BY uploaded_at DESC').all() as any[]
  return rows.map(r => ({ id: r.id, filename: r.filename, rawText: r.raw_text, uploadedAt: r.uploaded_at, category: r.category ?? '未分类' }))
}

function savePrdDoc(doc: PrdDoc) {
  db.prepare('INSERT OR REPLACE INTO prd_documents (id, filename, raw_text, uploaded_at, category) VALUES (?, ?, ?, ?, ?)').run(doc.id, doc.filename, doc.rawText, doc.uploadedAt, doc.category || '未分类')
}

function loadRunRecords(): RunRecord[] {
  const rows = db.prepare('SELECT * FROM run_records ORDER BY created_at DESC').all() as any[]
  return rows.map(r => ({
    id: r.id, prdId: r.prd_id, skillVersionId: r.skill_version_id,
    model: r.model, result: JSON.parse(r.result || '{}'),
    rawResponse: r.raw_response, createdAt: r.created_at,
    specVersionId: r.spec_version_id || '',
  }))
}

function saveRunRecord(rec: RunRecord) {
  db.prepare('INSERT OR REPLACE INTO run_records (id, prd_id, skill_version_id, model, result, raw_response, created_at, spec_version_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
    rec.id, rec.prdId, rec.skillVersionId, rec.model,
    JSON.stringify(rec.result), rec.rawResponse, rec.createdAt, rec.specVersionId || '',
  )
}

function deleteRunRecord(id: string) {
  db.prepare('DELETE FROM run_records WHERE id = ?').run(id)
}

function getAppState(key: string): string | null {
  const row = db.prepare('SELECT value FROM app_state WHERE key = ?').get(key) as any
  return row?.value ?? null
}

function setAppState(key: string, value: string | null) {
  if (value === null) {
    db.prepare('DELETE FROM app_state WHERE key = ?').run(key)
  } else {
    db.prepare('INSERT OR REPLACE INTO app_state (key, value) VALUES (?, ?)').run(key, value)
  }
}

// 预设 Delper 认证（仅首次）
if (!getAppState('delperUid')) setAppState('delperUid', '1712864357')
if (!getAppState('delperApiKey')) setAppState('delperApiKey', 'ak_!Z)z6#mdG0F13Y(8IO92UmRdrkt9ph8g')

let prdDocuments: PrdDoc[] = loadPrdDocuments()
let runRecords: RunRecord[] = loadRunRecords()
let activePrdId: string | null = getAppState('activePrdId')
let activeRunId: string | null = getAppState('activeRunId')
const sseClients: Set<ServerResponse> = new Set()

function broadcast(event: string, data: unknown) {
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
  for (const client of sseClients) {
    client.write(msg)
  }
}

async function readBody(req: NodeJS.ReadableStream): Promise<string> {
  let body = ''
  for await (const chunk of req) body += chunk
  return body
}

function json(res: ServerResponse, status: number, data: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.end(JSON.stringify(data))
}

// ── WPS 金山文档导出 ──────────────────────────────────────

interface WpsBlock {
  type: string
  attrs?: Record<string, any>
  content?: WpsBlock[]
  id?: string
}

function extractFileIdFromUrl(url: string): string {
  const m = url.match(/\/l\/([A-Za-z0-9_-]+)/)
  if (m) return m[1]
  const m2 = url.match(/\/(\w{12,})/)
  return m2?.[1] ?? url
}

function getWpsToken(): string {
  const tokenPath = join(
    process.env.USERPROFILE || process.env.HOME || '',
    '.wps-agent',
    'tokens-cli-user.json',
  )
  const data = JSON.parse(readFileSync(tokenPath, 'utf-8'))
  return data['cli-user']?.access_token ?? ''
}

async function wpsApiRequest(path: string, body: unknown, token: string): Promise<any> {
  const resp = await fetch(`https://openapi.wps.cn${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!resp.ok) throw new Error(`WPS API ${resp.status}: ${await resp.text()}`)
  const data = await resp.json() as { code: number; msg: string; data: any }
  if (data.code !== 0) throw new Error(`WPS API error: ${data.msg}`)
  return data.data
}

function collectSourceKeys(blocks: WpsBlock[]): string[] {
  const keys: Set<string> = new Set()
  const walk = (list: WpsBlock[]) => {
    for (const b of list) {
      if ((b.type === 'picture' || b.type === 'processon') && b.attrs?.sourceKey) {
        keys.add(b.attrs.sourceKey)
      }
      if (Array.isArray(b.content)) walk(b.content)
    }
  }
  walk(blocks)
  return [...keys]
}

async function downloadAsBase64(url: string): Promise<string> {
  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`Image download failed: ${resp.status}`)
  const buf = Buffer.from(await resp.arrayBuffer())
  const ct = resp.headers.get('content-type') || 'image/png'
  const mime = ct.startsWith('image/') ? ct.split(';')[0] : 'image/png'
  return `data:${mime};base64,${buf.toString('base64')}`
}

async function resolveImageUrls(
  fileId: string,
  sourceKeys: string[],
  token: string,
): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  if (sourceKeys.length === 0) return map

  const data = await wpsApiRequest(
    `/v7/documents/${fileId}/attachments/batch_get`,
    { attachment_ids: sourceKeys },
    token,
  )

  const downloadTasks = (data.attachment_infos ?? []).map(async (att: any) => {
    try {
      const b64 = await downloadAsBase64(att.download_url)
      map.set(att.attachment_id, b64)
    } catch {
      map.set(att.attachment_id, att.download_url)
    }
  })
  await Promise.all(downloadTasks)
  return map
}

// ── Blocks → Markdown 转换器 ──

function blocksToMarkdown(blocks: WpsBlock[], imageUrls: Map<string, string>): string {
  const lines: string[] = []

  function inlineText(nodes: WpsBlock[]): string {
    return (nodes ?? [])
      .map((n) => {
        if (n.type === 'text') {
          let t = n.content as unknown as string ?? ''
          if (n.attrs?.bold) t = `**${t}**`
          if (n.attrs?.italic) t = `*${t}*`
          if (n.attrs?.code) t = `\`${t}\``
          if (n.attrs?.strikethrough) t = `~~${t}~~`
          const link = n.attrs?.link
          if (link) {
            const url = typeof link === 'string' ? link : link.url ?? ''
            if (url) t = `[${t}](${url})`
          }
          return t
        }
        return ''
      })
      .join('')
  }

  function renderPicture(attrs: Record<string, any>): string {
    const key = attrs?.sourceKey ?? ''
    const url = imageUrls.get(key) || key
    const caption = attrs?.caption ?? ''
    return `![${caption}](${url})`
  }

  function renderCell(cell: WpsBlock): string {
    const parts: string[] = []
    for (const child of cell.content ?? []) {
      if (child.type === 'paragraph' || child.type === 'heading') {
        const t = inlineText(child.content ?? [])
        if (t) parts.push(t)
      } else if (child.type === 'picture' || child.type === 'processon') {
        parts.push(renderPicture(child.attrs ?? {}))
      } else {
        const t = inlineText(child.content ?? [])
        if (t) parts.push(t)
      }
    }
    return parts.join(' ').replace(/\|/g, '\\|').replace(/\n/g, ' ')
  }

  function processBlock(block: WpsBlock) {
    const { type, attrs = {}, content = [] } = block

    switch (type) {
      case 'doc':
        for (const child of content) processBlock(child)
        break
      case 'title':
        lines.push(`# ${inlineText(content)}`)
        lines.push('')
        break
      case 'heading': {
        const level = Math.min(attrs.level ?? 2, 6)
        lines.push(`${'#'.repeat(level)} ${inlineText(content)}`)
        lines.push('')
        break
      }
      case 'paragraph': {
        const listAttrs = attrs.listAttrs
        if (listAttrs) {
          const indent = '  '.repeat(listAttrs.level ?? 0)
          const marker = listAttrs.type === 1 ? '1.' : '-'
          lines.push(`${indent}${marker} ${inlineText(content)}`)
        } else {
          lines.push(inlineText(content))
          lines.push('')
        }
        break
      }
      case 'picture':
      case 'processon':
        lines.push(renderPicture(attrs))
        lines.push('')
        break
      case 'table': {
        const rows: string[][] = []
        for (const row of content) {
          if (row.type !== 'tableRow') continue
          const cells: string[] = []
          for (const cell of row.content ?? []) {
            if (cell.type === 'tableCell') cells.push(renderCell(cell))
          }
          rows.push(cells)
        }
        if (!rows.length) break
        const ncols = Math.max(...rows.map((r) => r.length))
        for (const r of rows) while (r.length < ncols) r.push('')
        lines.push('| ' + rows[0].map((c) => c || ' ').join(' | ') + ' |')
        lines.push('| ' + rows[0].map(() => '---').join(' | ') + ' |')
        for (let i = 1; i < rows.length; i++) {
          lines.push('| ' + rows[i].map((c) => c || ' ').join(' | ') + ' |')
        }
        lines.push('')
        break
      }
      case 'codeBlock': {
        const lang = attrs.lang ?? ''
        const code = (content ?? [])
          .filter((n: WpsBlock) => n.type === 'text')
          .map((n: WpsBlock) => (n.content as unknown as string) ?? '')
          .join('')
        lines.push('```' + lang)
        lines.push(code)
        lines.push('```')
        lines.push('')
        break
      }
      case 'blockQuote':
      case 'highLightBlock': {
        const emoji = attrs.emoji ?? ''
        if (emoji) lines.push(`> ${emoji}`)
        for (const child of content) {
          const tmpLines = lines.length
          processBlock(child)
          const added = lines.splice(tmpLines)
          for (const l of added) {
            lines.push(l.trim() ? `> ${l}` : '>')
          }
        }
        lines.push('')
        break
      }
      case 'hr':
        lines.push('---')
        lines.push('')
        break
      case 'column':
      case 'lockBlock':
        for (const child of content) processBlock(child)
        break
      case 'pictureColumn':
        for (const child of content) {
          if (child.type === 'picture') {
            lines.push(renderPicture(child.attrs ?? {}))
            lines.push('')
          }
        }
        break
      default:
        for (const child of content) processBlock(child)
        break
    }
  }

  for (const block of blocks) processBlock(block)
  return lines.join('\n')
}

// ── Delper 埋点平台导入 ──────────────────────────────────

async function callDelperMcp(toolName: string, args: Record<string, any> = {}): Promise<any> {
  const uid = getAppState('delperUid') || ''
  const apiKey = getAppState('delperApiKey') || ''
  if (!uid || !apiKey) throw new Error('请先在平台设置中配置 Delper UID 和 API Key')

  const resp = await fetch('http://delper-api.wps.cn/service/tracking/api/v1/mcp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      'x-api-key': apiKey,
      uid,
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now().toString(),
      method: 'tools/call',
      params: { name: toolName, arguments: args },
    }),
  })
  if (!resp.ok) {
    const errText = await resp.text()
    throw new Error(`Delper API ${resp.status}: ${errText.slice(0, 500)}`)
  }

  const ct = resp.headers.get('content-type') || ''
  if (ct.includes('text/event-stream')) {
    const text = await resp.text()
    let lastData = ''
    for (const line of text.split('\n')) {
      if (line.startsWith('data: ')) lastData = line.slice(6)
    }
    if (!lastData) throw new Error('SSE 响应中未找到数据')
    const parsed = JSON.parse(lastData)
    if (parsed?.error) throw new Error(parsed.error.message || JSON.stringify(parsed.error))
    if (parsed?.result?.isError) {
      const errMsg = parsed.result.content?.[0]?.text || '未知错误'
      throw new Error(`Delper 平台错误: ${errMsg}`)
    }
    const t = parsed?.result?.content?.[0]?.text
    if (!t) return parsed
    try { return JSON.parse(t) } catch { return t }
  }

  const rawText = await resp.text()
  let data: any
  try {
    data = JSON.parse(rawText)
  } catch {
    throw new Error(`Delper 返回非 JSON 响应: ${rawText.slice(0, 300)}`)
  }
  if (data.error) throw new Error(data.error.message || JSON.stringify(data.error))
  if (data.result?.isError) {
    const errMsg = data.result.content?.[0]?.text || '未知错误'
    throw new Error(`Delper 平台错误: ${errMsg}`)
  }
  const t = data?.result?.content?.[0]?.text
  if (!t) return data.result ?? data
  try { return JSON.parse(t) } catch { return t }
}

interface DelperMeta {
  applicationId?: number; applicationName: string; applicationCode: string
  terminalId?: number; terminalName: string; terminalCode: string
  businessId?: number; businessName: string; businessCode: string
  featureName: string; featureCode: string
  prdName?: string; prdUrl?: string
}

async function generatePositionModelExcel(
  events: Array<{
    eventId: string; eventName: string
    page?: string; pageLabel?: string
    module?: string; moduleLabel?: string
    element?: string; elementLabel?: string
    trigger?: string; timing?: string
    params?: Array<{ name: string; description?: string; example?: string; enum?: string[] }>
  }>,
  meta: DelperMeta,
  funcVersion?: string,
): Promise<Buffer> {
  const templatePath = resolve(__dirname, 'assets', '位置模型模板.xlsx')
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(templatePath)

  const infoSheet = wb.getWorksheet(1)!
  infoSheet.getCell('B3').value = meta.applicationName
  infoSheet.getCell('C3').value = meta.applicationCode
  infoSheet.getCell('B4').value = meta.terminalName
  infoSheet.getCell('C4').value = meta.terminalCode
  infoSheet.getCell('B5').value = meta.businessName
  infoSheet.getCell('C5').value = meta.businessCode
  infoSheet.getCell('B6').value = meta.featureName
  infoSheet.getCell('C6').value = meta.featureCode
  infoSheet.getCell('B7').value = meta.prdName || ''
  infoSheet.getCell('C7').value = meta.prdUrl || ''

  const planSheet = wb.getWorksheet(3)!

  // 清除模板数据区域(行3+)的已有合并和内容，避免冲突及残留模板数据
  const existingMerges = [...(planSheet.model.merges || [])]
  for (const ref of existingMerges) {
    try {
      const m = ref.match(/[A-Z]+(\d+)/)
      if (m && parseInt(m[1]) >= 3) planSheet.unMergeCells(ref)
    } catch { /* ignore */ }
  }
  for (let r = 3; r <= planSheet.rowCount; r++) {
    const row = planSheet.getRow(r)
    row.eachCell((cell) => { cell.value = null })
  }

  function safeMerge(startR: number, startC: number, endR: number, endC: number) {
    if (endR <= startR && endC <= startC) return
    try { planSheet.mergeCells(startR, startC, endR, endC) } catch { /* skip conflict */ }
  }

  const dataFont: Partial<ExcelJS.Font> = { name: '微软雅黑', size: 10.5 }
  const dataAlign: Partial<ExcelJS.Alignment> = { vertical: 'middle', wrapText: true }
  const dataBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin' }, bottom: { style: 'thin' },
    left: { style: 'thin' }, right: { style: 'thin' },
  }

  let row = 3
  const pageMerges: Array<{ col: number; start: number; end: number }> = []
  const pageGroups = new Map<string, { start: number; end: number }>()
  const moduleGroups = new Map<string, { start: number; end: number }>()
  const elementGroups = new Map<string, { start: number; end: number }>()

  for (const ev of events) {
    const pageLabel = ev.pageLabel || ev.page || ''
    const moduleLabel = ev.moduleLabel || ev.module || ''
    const elementLabel = ev.elementLabel || ev.element || ''
    const timing = ev.timing || ev.trigger || ''

    const publicAttrs = [
      ['event_id', '事件ID', '公共属性', ev.eventId || ''],
      ['page_name', '页面名称', '公共属性', ev.page || ''],
      ['module_name', '模块名称', '公共属性', ev.module || ''],
      ['element_name', '元素名称', '公共属性', ev.element || ''],
      ['element_type', '元素类型', '公共属性', timing === 'click' ? 'button' : 'page'],
      ['klm', '点位信息', '公共属性', ''],
      ['func_version', '功能版本', '公共属性', funcVersion || ''],
      ['is_login', '是否登录', '公共属性', ''],
      ['member_identity', '会员身份', '公共属性', ''],
      ['entry_id', '入口标识', '公共属性', ''],
    ]
    const customAttrs = (ev.params || []).map(p => [
      p.name,
      p.description || p.name,
      '自定义属性',
      p.example || (p.enum ? p.enum.join('|') : ''),
      p.enum ? p.enum.join(', ') : '',
    ])
    const allAttrs = [...publicAttrs, ...customAttrs]
    const eventStart = row

    // 事件头行（无属性数据，与模板格式一致）
    const headerRow = planSheet.getRow(row)
    for (let c = 1; c <= 12; c++) {
      const cell = headerRow.getCell(c)
      cell.font = dataFont
      cell.alignment = dataAlign
      cell.border = dataBorder
    }
    headerRow.getCell(1).value = pageLabel
    headerRow.getCell(2).value = moduleLabel
    headerRow.getCell(3).value = elementLabel
    headerRow.getCell(4).value = ev.eventId || ''
    headerRow.getCell(5).value = ev.eventName || ''
    headerRow.getCell(12).value = timing
    row++

    // 属性行
    for (let i = 0; i < allAttrs.length; i++) {
      const a = allAttrs[i]
      const r = planSheet.getRow(row)
      for (let c = 1; c <= 12; c++) {
        const cell = r.getCell(c)
        cell.font = dataFont
        cell.alignment = dataAlign
        cell.border = dataBorder
      }
      r.getCell(6).value = a[0]
      r.getCell(7).value = a[1]
      r.getCell(8).value = a[2]
      r.getCell(9).value = a[3]
      r.getCell(10).value = a[4] || ''
      r.getCell(11).value = ''
      row++
    }
    const eventEnd = row - 1

    if (eventEnd > eventStart) {
      safeMerge(eventStart, 4, eventEnd, 4)
      safeMerge(eventStart, 5, eventEnd, 5)
      safeMerge(eventStart, 12, eventEnd, 12)
    }

    const pageKey = pageLabel
    const moduleKey = `${pageLabel}||${moduleLabel}`
    const elemKey = `${pageLabel}||${moduleLabel}||${elementLabel}`
    if (!pageGroups.has(pageKey)) pageGroups.set(pageKey, { start: eventStart, end: eventEnd })
    else pageGroups.get(pageKey)!.end = eventEnd
    if (!moduleGroups.has(moduleKey)) moduleGroups.set(moduleKey, { start: eventStart, end: eventEnd })
    else moduleGroups.get(moduleKey)!.end = eventEnd
    if (!elementGroups.has(elemKey)) elementGroups.set(elemKey, { start: eventStart, end: eventEnd })
    else elementGroups.get(elemKey)!.end = eventEnd
  }

  for (const g of pageGroups.values()) {
    if (g.end > g.start) safeMerge(g.start, 1, g.end, 1)
  }
  for (const g of moduleGroups.values()) {
    if (g.end > g.start) safeMerge(g.start, 2, g.end, 2)
  }
  for (const g of elementGroups.values()) {
    if (g.end > g.start) safeMerge(g.start, 3, g.end, 3)
  }

  const buf = await wb.xlsx.writeBuffer()
  return Buffer.from(buf)
}

async function wpsExportWithImages(docUrl: string): Promise<string> {
  const fileId = extractFileIdFromUrl(docUrl)
  const token = getWpsToken()

  const raw = execSync(`wps-doc export "${docUrl}" --blocks`, {
    encoding: 'utf-8',
    timeout: 60000,
  })
  const jsonStart = raw.indexOf('{')
  if (jsonStart < 0) throw new Error('wps-doc --blocks 输出中未找到 JSON')
  const blocksData = JSON.parse(raw.slice(jsonStart))
  const blocks: WpsBlock[] = blocksData.blocks ?? []

  const sourceKeys = collectSourceKeys(blocks)
  const imageUrls = await resolveImageUrls(fileId, sourceKeys, token)

  return blocksToMarkdown(blocks, imageUrls)
}

// ── Vite 插件 ──────────────────────────────────────────────

function trackingLabPlugin(): Plugin {
  return {
    name: 'vite-plugin-tracking-lab',
    configureServer(server) {

      // ═══════════════════════════════════════════════════
      //  规范文件 API
      // ═══════════════════════════════════════════════════

      const defaultSpecDir = 'tracking-design'

      function getSpecDir(): string {
        return getAppState('specDir') || defaultSpecDir
      }

      function getRefsDir(): string {
        return resolve(__dirname, getSpecDir(), 'references')
      }

      function getMainSkillPath(): string {
        return resolve(__dirname, getSpecDir(), 'SKILL.md')
      }

      // GET/PUT /api/config — 平台配置
      server.middlewares.use('/api/config', async (req, res, next) => {
        if (req.method === 'OPTIONS') {
          res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET,PUT,OPTIONS' })
          res.end()
          return
        }
        if (req.method === 'GET') {
          json(res, 200, {
            specDir: getSpecDir(),
            specDirAbsolute: resolve(__dirname, getSpecDir()),
            specDirExists: existsSync(resolve(__dirname, getSpecDir())),
            hasSkills: (db.prepare('SELECT COUNT(*) as cnt FROM skills').get() as any).cnt > 0,
            hasPrds: (db.prepare('SELECT COUNT(*) as cnt FROM prd_documents').get() as any).cnt > 0,
            aiConfigured: !!(process.env.VITE_AI_TOKEN || getAppState('aiToken')),
            delperUid: getAppState('delperUid') || '',
            delperApiKey: getAppState('delperApiKey') || '',
            aiSettings: {
              token: getAppState('aiToken') || process.env.VITE_AI_TOKEN || '',
              uid: getAppState('aiUid') || process.env.VITE_AI_UID || '1712864357',
              model: getAppState('aiModel') || process.env.VITE_AI_MODEL || 'ali/qwen-plus',
              baseUrl: getAppState('aiBaseUrl') || process.env.VITE_AI_BASE_URL || '/api/v3',
              productName: getAppState('aiProductName') || 'wps-public-pc',
              companyId: getAppState('aiCompanyId') || '41000207',
            },
          })
          return
        }
        if (req.method === 'PUT') {
          try {
            const body = JSON.parse(await readBody(req))
            if (body.specDir !== undefined) {
              const dir = body.specDir.trim() || defaultSpecDir
              const absDir = resolve(__dirname, dir)
              if (!existsSync(absDir)) {
                mkdirSync(absDir, { recursive: true })
              }
              const refs = join(absDir, 'references')
              if (!existsSync(refs)) {
                mkdirSync(refs, { recursive: true })
              }
              setAppState('specDir', dir)
            }
            if (body.delperUid !== undefined) setAppState('delperUid', body.delperUid || null)
            if (body.delperApiKey !== undefined) setAppState('delperApiKey', body.delperApiKey || null)
            if (body.aiSettings) {
              const ai = body.aiSettings
              if (ai.token !== undefined) setAppState('aiToken', ai.token || null)
              if (ai.uid !== undefined) setAppState('aiUid', ai.uid || null)
              if (ai.model !== undefined) setAppState('aiModel', ai.model || null)
              if (ai.baseUrl !== undefined) setAppState('aiBaseUrl', ai.baseUrl || null)
              if (ai.productName !== undefined) setAppState('aiProductName', ai.productName || null)
              if (ai.companyId !== undefined) setAppState('aiCompanyId', ai.companyId || null)
            }
            json(res, 200, { ok: true, specDir: getSpecDir() })
          } catch (e) {
            json(res, 400, { error: e instanceof Error ? e.message : '请求解析失败' })
          }
          return
        }
        next()
      })

      function buildSpecRegistry() {
        const mainPath = getMainSkillPath()
        const refs = getRefsDir()
        const registry: Record<string, { label: string; file: string; description: string }> = {
          general: { label: '通用规范', file: mainPath, description: '通用埋点方案设计规范' },
        }
        if (existsSync(refs)) {
          for (const f of readdirSync(refs)) {
            if (f.endsWith('.md') && f !== 'examples.md' && f !== 'schema.md') {
              const key = f.replace(/\.md$/, '').replace(/-specs$/, '')
              registry[key] = { label: `${key} 业务规范`, file: join(refs, f), description: f }
            }
          }
        }
        return registry
      }

      server.middlewares.use('/api/specs', (req, res, next) => {
        if (req.method === 'OPTIONS') {
          res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' })
          res.end()
          return
        }
        if (req.method !== 'GET') return next()
        const registry = buildSpecRegistry()
        const specs = Object.entries(registry).map(([key, val]) => ({
          key, label: val.label, description: val.description, available: existsSync(val.file),
        }))
        json(res, 200, specs)
      })

      // GET /api/spec-files — 扫描 references 目录下的 .md 文件
      // POST /api/spec-create — 新建空规范文件
      server.middlewares.use('/api/spec-create', async (req, res, next) => {
        if (req.method === 'OPTIONS') {
          res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' })
          res.end()
          return
        }
        if (req.method !== 'POST') return next()
        try {
          const body = JSON.parse(await readBody(req))
          const filename = body.filename?.trim()
          if (!filename || !filename.endsWith('.md')) {
            json(res, 400, { error: '文件名必须以 .md 结尾' })
            return
          }
          const refs = getRefsDir()
          if (!existsSync(refs)) mkdirSync(refs, { recursive: true })
          const fullPath = join(refs, filename)
          if (existsSync(fullPath)) {
            json(res, 400, { error: `文件 ${filename} 已存在` })
            return
          }
          const specDir = getSpecDir()
          const relativePath = `${specDir}/references/${filename}`
          writeFileSync(fullPath, `# ${filename.replace(/[-_]?specs?\.md$/i, '').replace(/\.md$/i, '')} 业务规范\n\n> 在此编写该业务方向的专属埋点规范\n`, 'utf-8')
          json(res, 200, { ok: true, filename, path: relativePath })
        } catch (e) {
          json(res, 500, { error: e instanceof Error ? e.message : '创建失败' })
        }
      })

      // PUT /api/spec-write — 写入规范文件内容
      server.middlewares.use('/api/spec-write', async (req, res, next) => {
        if (req.method === 'OPTIONS') {
          res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'PUT,OPTIONS' })
          res.end()
          return
        }
        if (req.method !== 'PUT') return next()
        try {
          const body = JSON.parse(await readBody(req))
          const { path: filePath, content } = body
          if (!filePath) { json(res, 400, { error: '缺少 path 参数' }); return }
          const fullPath = resolve(__dirname, filePath)
          writeFileSync(fullPath, content, 'utf-8')
          json(res, 200, { ok: true })
        } catch (e) {
          json(res, 500, { error: e instanceof Error ? e.message : '写入失败' })
        }
      })

      server.middlewares.use('/api/spec-files', (req, res, next) => {
        if (req.method !== 'GET') return next()
        try {
          const specDir = getSpecDir()
          const refs = getRefsDir()
          const mainPath = getMainSkillPath()
          const files: { filename: string; path: string; size: number }[] = []
          if (existsSync(refs)) {
            for (const f of readdirSync(refs)) {
              if (f.endsWith('.md')) {
                const fullPath = join(refs, f)
                const stat = readFileSync(fullPath)
                files.push({ filename: f, path: `${specDir}/references/${f}`, size: stat.length })
              }
            }
          }
          files.unshift({
            filename: 'SKILL.md',
            path: `${specDir}/SKILL.md`,
            size: existsSync(mainPath) ? readFileSync(mainPath).length : 0,
          })
          json(res, 200, files)
        } catch (e) {
          json(res, 500, { error: e instanceof Error ? e.message : '扫描失败' })
        }
      })

      // GET /api/spec-content — 读取某个规范文件的内容
      server.middlewares.use('/api/spec-content', (req, res, next) => {
        if (req.method !== 'GET') return next()
        const urlObj = new URL(req.url ?? '/', `http://${req.headers.host}`)
        const relPath = urlObj.searchParams.get('path')
        if (!relPath) { json(res, 400, { error: '缺少 path 参数' }); return }
        const fullPath = resolve(__dirname, relPath)
        if (!existsSync(fullPath)) { json(res, 404, { error: '文件不存在' }); return }
        try {
          const content = readFileSync(fullPath, 'utf-8')
          json(res, 200, { content, path: relPath })
        } catch (e) {
          json(res, 500, { error: e instanceof Error ? e.message : '读取失败' })
        }
      })

      // ═══════════════════════════════════════════════════
      //  SQLite Skill API
      // ═══════════════════════════════════════════════════

      // GET /api/skills — 获取所有 Skill 列表
      server.middlewares.use('/api/skills', async (req, res, next) => {
        if (req.method === 'OPTIONS') {
          res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE' })
          res.end()
          return
        }

        const urlObj = new URL(req.url ?? '/', `http://${req.headers.host}`)
        const pathParts = urlObj.pathname.replace(/^\/api\/skills\/?/, '').split('/').filter(Boolean)

        // GET /api/skills — 列表
        if (req.method === 'GET' && pathParts.length === 0) {
          const rows = db.prepare('SELECT * FROM skills ORDER BY created_at DESC').all()
          json(res, 200, rows)
          return
        }

        // POST /api/skills — 创建新 Skill
        if (req.method === 'POST' && pathParts.length === 0) {
          try {
            const body = JSON.parse(await readBody(req))
            const { skill_id, name, file_path } = body
            if (!skill_id || !name) { json(res, 400, { error: '缺少 skill_id 或 name' }); return }

            db.prepare('INSERT OR IGNORE INTO skills (skill_id, name, file_path) VALUES (?, ?, ?)').run(skill_id, name, file_path || '')
            json(res, 200, { ok: true, skill_id })
          } catch (e) {
            json(res, 400, { error: e instanceof Error ? e.message : '请求解析失败' })
          }
          return
        }

        // POST /api/skills/publish — 将某个版本的内容发布回文件
        if (req.method === 'POST' && pathParts.length === 1 && pathParts[0] === 'publish') {
          try {
            const body = JSON.parse(await readBody(req))
            const { skill_id, version } = body
            if (!skill_id || !version) { json(res, 400, { error: '缺少 skill_id 或 version' }); return }

            const skill = db.prepare('SELECT * FROM skills WHERE skill_id = ?').get(skill_id) as any
            if (!skill) { json(res, 404, { error: 'Skill 不存在' }); return }
            if (!skill.file_path) { json(res, 400, { error: '该 Skill 未绑定文件' }); return }

            const snapshot = db.prepare('SELECT * FROM skill_snapshots WHERE skill_id = ? AND version = ?').get(skill_id, version) as any
            if (!snapshot) { json(res, 404, { error: `版本 ${version} 不存在` }); return }

            const fullPath = resolve(__dirname, skill.file_path)
            const dir = resolve(fullPath, '..')
            if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

            // 将 skill_json 格式化写入文件
            let content = ''
            try {
              const skillData = JSON.parse(snapshot.skill_json)
              content = JSON.stringify(skillData, null, 2)
            } catch {
              content = snapshot.skill_json
            }
            writeFileSync(fullPath, content, 'utf8')

            // 更新 skill 的 current_stable_version 和 snapshot 状态
            db.prepare('UPDATE skills SET current_stable_version = ? WHERE skill_id = ?').run(version, skill_id)
            db.prepare('UPDATE skill_snapshots SET status = ? WHERE skill_id = ? AND version = ?').run('released', skill_id, version)

            json(res, 200, { ok: true, message: `已发布 v${version} 到 ${skill.file_path}` })
          } catch (e) {
            json(res, 500, { error: e instanceof Error ? e.message : '发布失败' })
          }
          return
        }

        // GET /api/skills/:skill_id/history — 版本历史
        if (req.method === 'GET' && pathParts.length === 2 && pathParts[1] === 'history') {
          const skillId = decodeURIComponent(pathParts[0])
          const skill = db.prepare('SELECT * FROM skills WHERE skill_id = ?').get(skillId)
          if (!skill) { json(res, 404, { error: 'Skill 不存在' }); return }

          const snapshots = db.prepare(
            'SELECT * FROM skill_snapshots WHERE skill_id = ? ORDER BY created_at DESC'
          ).all(skillId)

          json(res, 200, { skill, snapshots })
          return
        }

        // POST /api/skills/generate — AI 增量生成新版本
        if (req.method === 'POST' && pathParts.length === 1 && pathParts[0] === 'generate') {
          try {
            const body = JSON.parse(await readBody(req))
            const { skill_id, base_version, new_prd_text, spec_type } = body

            if (!skill_id || !new_prd_text) {
              json(res, 400, { error: '缺少 skill_id 或 new_prd_text' })
              return
            }

            let baseSkillJson = '{}'
            if (base_version) {
              const baseRow = db.prepare(
                'SELECT skill_json FROM skill_snapshots WHERE skill_id = ? AND version = ?'
              ).get(skill_id, base_version) as any
              if (baseRow) baseSkillJson = baseRow.skill_json
            }

            // 读取选中的规范文件
            let specContent = ''
            const specKey = spec_type || 'general'
            const registry = buildSpecRegistry()
            const specEntry = registry[specKey]
            if (specEntry && existsSync(specEntry.file)) {
              specContent = readFileSync(specEntry.file, 'utf-8')
            }

            const aiBaseUrl = process.env.VITE_AI_BASE_URL || '/api/v3'
            const aiToken = process.env.VITE_AI_TOKEN || ''
            const aiModel = process.env.VITE_AI_MODEL || 'ali/qwen-plus'
            const aiUid = process.env.VITE_AI_UID || 'tracking-lab'

            const specSection = specContent
              ? `\n\n## 埋点设计规范（${specEntry?.label ?? specKey}）\n\n以下是必须严格遵循的埋点设计规范，所有事件命名、属性定义、层级划分都必须符合此规范：\n\n${specContent}`
              : ''

            const systemPrompt = `你是一位专业的数据埋点方案设计专家。你的任务是基于已有的埋点 Skill（基线版本）和新的 PRD 变更需求，进行增量更新。
${specSection}

## 增量更新规则

1. 保留基线 Skill 中未被 PRD 提及的所有事件和属性（不要删除）
2. 根据新 PRD 新增必要的事件和属性
3. 根据新 PRD 修改已有事件的触发时机、参数等
4. 如果 PRD 明确废弃某功能，将对应事件标记 "deprecated": true
5. 生成一段人类可读的 changelog（变更日志），说明本次改了什么
6. 所有新增/修改的事件必须严格遵循上方的埋点设计规范

## 输出格式（严格 JSON）

\`\`\`json
{
  "skill_json": { ... 完整的新版 Skill 结构 ... },
  "changelog": "本次变更说明..."
}
\`\`\`

skill_json 结构要求：
{
  "summary": "方案概述",
  "conventions": { "feature_id": "xxx", "eventNaming": "xxx" },
  "commonParams": [{ "name": "...", "type": "...", "description": "..." }],
  "events": [{
    "eventId": "...", "eventName": "...",
    "page": "...", "pageLabel": "...",
    "module": "...", "moduleLabel": "...",
    "element": "...", "elementLabel": "...",
    "trigger": "...", "timing": "display|click|hover|load|scroll|stay",
    "priority": "P0|P1|P2",
    "params": [{ "name": "...", "type": "...", "description": "...", "enum": [...] }],
    "deprecated": false
  }],
  "funnels": [{ "name": "...", "steps": ["eventId1", "eventId2"] }],
  "gaps": ["..."]
}`

            const userMessage = `## 基线 Skill（${base_version || '空'}）

\`\`\`json
${baseSkillJson}
\`\`\`

## 新 PRD 变更需求

${new_prd_text}

---

请基于以上信息和埋点设计规范，输出增量更新后的完整 Skill JSON 和 changelog。`

            const apiUrl = aiBaseUrl.startsWith('http')
              ? `${aiBaseUrl}/chat/completions`
              : `http://ai-gateway.wps.cn${aiBaseUrl}/chat/completions`

            const aiResp = await fetch(apiUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${aiToken}`,
                'AI-Gateway-Uid': aiUid,
                'AI-Gateway-Product-Name': 'wps-public-pc',
                'AI-Gateway-Company-Id': '41000207',
              },
              body: JSON.stringify({
                model: aiModel,
                messages: [
                  { role: 'system', content: systemPrompt },
                  { role: 'user', content: userMessage },
                ],
                stream: false,
              }),
            })

            if (!aiResp.ok) {
              const errText = await aiResp.text()
              json(res, 502, { error: `AI 请求失败 (${aiResp.status}): ${errText.slice(0, 500)}` })
              return
            }

            const aiData = await aiResp.json() as any
            const rawContent = aiData?.choices?.[0]?.message?.content ?? ''

            const jsonMatch = rawContent.match(/```json\s*\n([\s\S]*?)\n```/)
            if (!jsonMatch) {
              json(res, 200, { raw: rawContent, error: '未找到 JSON 代码块', skill_json: null, changelog: null })
              return
            }

            try {
              const parsed = JSON.parse(jsonMatch[1].trim())
              json(res, 200, {
                skill_json: parsed.skill_json ?? parsed,
                changelog: parsed.changelog ?? '（AI 未生成 changelog）',
                raw: rawContent,
              })
            } catch {
              json(res, 200, { raw: rawContent, error: 'JSON 解析失败', skill_json: null, changelog: null })
            }
          } catch (e) {
            json(res, 500, { error: e instanceof Error ? e.message : '生成失败' })
          }
          return
        }

        // POST /api/skills/save — 保存版本快照
        if (req.method === 'POST' && pathParts.length === 1 && pathParts[0] === 'save') {
          try {
            const body = JSON.parse(await readBody(req))
            const { skill_id, version, base_version, prd_text, changelog, skill_json, status } = body

            if (!skill_id || !version || !skill_json) {
              json(res, 400, { error: '缺少 skill_id, version 或 skill_json' })
              return
            }

            db.prepare('INSERT OR IGNORE INTO skills (skill_id, name) VALUES (?, ?)').run(skill_id, skill_id)

            const skillJsonStr = typeof skill_json === 'string' ? skill_json : JSON.stringify(skill_json)

            db.prepare(`
              INSERT INTO skill_snapshots (skill_id, version, base_version, prd_text, changelog, skill_json, status)
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `).run(
              skill_id,
              version,
              base_version ?? null,
              prd_text ?? null,
              changelog ?? null,
              skillJsonStr,
              status ?? 'draft',
            )

            if (status === 'released') {
              db.prepare('UPDATE skills SET current_stable_version = ? WHERE skill_id = ?').run(version, skill_id)
            }

            json(res, 200, { ok: true, skill_id, version })
          } catch (e) {
            json(res, 400, { error: e instanceof Error ? e.message : '保存失败' })
          }
          return
        }

        next()
      })

      // ═══════════════════════════════════════════════════
      //  原有 API（保留）
      // ═══════════════════════════════════════════════════

      // SSE
      server.middlewares.use('/api/events', (req, res) => {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
          'Access-Control-Allow-Origin': '*',
        })
        res.write(`event: init\ndata: ${JSON.stringify({
          prdDocuments,
          runRecords,
          activePrdId,
          activeRunId,
        })}\n\n`)
        sseClients.add(res)
        req.on('close', () => sseClients.delete(res))
      })

      // ── 规范版本管理 API ──
      server.middlewares.use('/api/spec-versions', async (req, res, next) => {
        if (req.method === 'OPTIONS') {
          res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
          })
          res.end()
          return
        }

        if (req.method === 'GET') {
          const url = new URL(req.url ?? '', 'http://localhost')
          const filePath = url.searchParams.get('file') || '__general__'
          const rows = db.prepare('SELECT * FROM spec_versions WHERE file_path = ? ORDER BY version DESC').all(filePath)
          json(res, 200, rows)
          return
        }

        if (req.method === 'POST') {
          try {
            const body = JSON.parse(await readBody(req))
            const { id, version, content, note, file_path } = body
            const fp = file_path || '__general__'
            db.prepare('INSERT OR REPLACE INTO spec_versions (id, version, content, note, created_at, file_path) VALUES (?, ?, ?, ?, ?, ?)').run(
              id, version, content || '', note || '', Date.now(), fp,
            )
            json(res, 200, { ok: true })
          } catch (e) {
            json(res, 400, { error: e instanceof Error ? e.message : '保存失败' })
          }
          return
        }

        if (req.method === 'DELETE') {
          try {
            const url = new URL(req.url ?? '', 'http://localhost')
            const id = url.searchParams.get('id')
            if (id) {
              db.prepare('DELETE FROM spec_versions WHERE id = ?').run(id)
            }
            json(res, 200, { ok: true })
          } catch (e) {
            json(res, 400, { error: e instanceof Error ? e.message : '删除失败' })
          }
          return
        }

        next()
      })

      // GET /api/state
      server.middlewares.use('/api/state', (req, res, next) => {
        if (req.method !== 'GET') return next()
        json(res, 200, { prdDocuments, runRecords, activePrdId, activeRunId })
      })

      // GET/PUT /api/skill
      server.middlewares.use('/api/skill', async (req, res, next) => {
        if (req.method === 'OPTIONS') {
          res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' })
          res.end()
          return
        }
        const skillDir = resolve(__dirname, getSpecDir())
        const skillPath = join(skillDir, 'SKILL.md')
        if (req.method === 'GET') {
          try {
            const content = existsSync(skillPath) ? readFileSync(skillPath, 'utf8') : ''
            json(res, 200, { content, path: skillPath })
          } catch (e) {
            json(res, 500, { error: e instanceof Error ? e.message : '读取失败' })
          }
          return
        }
        if (req.method === 'PUT') {
          try {
            const body = JSON.parse(await readBody(req))
            if (!body.content) { json(res, 400, { error: '缺少 content 字段' }); return }
            if (!existsSync(skillDir)) mkdirSync(skillDir, { recursive: true })
            writeFileSync(skillPath, body.content, 'utf8')
            json(res, 200, { ok: true })
          } catch (e) {
            json(res, 500, { error: e instanceof Error ? e.message : '写入失败' })
          }
          return
        }
        next()
      })

      // GET /api/prd-categories — 获取所有已有分类
      server.middlewares.use('/api/prd-categories', (req, res, next) => {
        if (req.method !== 'GET') return next()
        const rows = db.prepare("SELECT DISTINCT category FROM prd_documents WHERE category != '' ORDER BY category").all() as any[]
        const categories = rows.map(r => r.category).filter(Boolean)
        if (!categories.includes('未分类')) categories.push('未分类')
        json(res, 200, categories)
      })

      // GET/PUT /api/category-config — 分类与 Skill 的绑定关系
      server.middlewares.use('/api/category-config', async (req, res, next) => {
        if (req.method === 'OPTIONS') {
          res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET,PUT,OPTIONS' })
          res.end()
          return
        }
        if (req.method === 'GET') {
          const raw = getAppState('category-config')
          json(res, 200, raw ? JSON.parse(raw) : {})
          return
        }
        if (req.method === 'PUT') {
          try {
            const body = JSON.parse(await readBody(req))
            setAppState('category-config', JSON.stringify(body))
            json(res, 200, { ok: true })
          } catch (e) {
            json(res, 400, { error: e instanceof Error ? e.message : '保存失败' })
          }
          return
        }
        next()
      })

      // POST|PATCH|DELETE /api/prd
      server.middlewares.use('/api/prd', async (req, res, next) => {
        if (req.method === 'OPTIONS') {
          res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST,PATCH,DELETE,OPTIONS' })
          res.end()
          return
        }
        if (req.method === 'DELETE') {
          db.prepare('DELETE FROM prd_documents').run()
          prdDocuments.length = 0
          activePrdId = null
          setAppState('activePrdId', '')
          broadcast('prd-cleared', {})
          json(res, 200, { ok: true, message: '所有 PRD 文档已清空' })
          return
        }
        if (req.method === 'PATCH') {
          try {
            const body = JSON.parse(await readBody(req))
            const { id, category } = body
            if (!id) { json(res, 400, { error: '缺少 id' }); return }
            if (category !== undefined) {
              db.prepare('UPDATE prd_documents SET category = ? WHERE id = ?').run(category, id)
              const doc = prdDocuments.find(d => d.id === id)
              if (doc) doc.category = category
            }
            if (body.filename) {
              db.prepare('UPDATE prd_documents SET filename = ? WHERE id = ?').run(body.filename, body.id)
              const doc = prdDocuments.find((d: any) => d.id === body.id)
              if (doc) doc.filename = body.filename
            }
            json(res, 200, { ok: true })
          } catch (e) {
            json(res, 400, { error: e instanceof Error ? e.message : '请求解析失败' })
          }
          return
        }
        if (req.method !== 'POST') return next()
        try {
          const body = JSON.parse(await readBody(req))
          const doc: PrdDoc = {
            id: body.id ?? `prd-${Date.now()}`,
            filename: body.filename ?? '未命名 PRD.md',
            rawText: body.rawText ?? body.content ?? '',
            uploadedAt: Date.now(),
            category: body.category || '未分类',
          }
          if (!doc.rawText) {
            json(res, 400, { error: '缺少 rawText 或 content 字段' })
            return
          }
          prdDocuments.unshift(doc)
          activePrdId = doc.id
          savePrdDoc(doc)
          setAppState('activePrdId', activePrdId)
          broadcast('prd-added', { doc, activePrdId })
          json(res, 200, { ok: true, id: doc.id, filename: doc.filename })
        } catch (e) {
          json(res, 400, { error: e instanceof Error ? e.message : '请求体解析失败' })
        }
      })

      // POST /api/wps-import
      server.middlewares.use('/api/wps-import', async (req, res, next) => {
        if (req.method !== 'POST') return next()
        let url: string
        let category = '未分类'
        try {
          const parsed = JSON.parse(await readBody(req))
          url = parsed.url
          if (parsed.category) category = parsed.category
        } catch {
          json(res, 400, { error: '请求体需要 { "url": "..." }' })
          return
        }
        if (!url || !/kdocs\.cn/i.test(url)) {
          json(res, 400, { error: '请提供有效的金山文档链接（包含 kdocs.cn）' })
          return
        }
        try {
          const content = await wpsExportWithImages(url)
          const h1 = content.match(/^#\s+(.+)/m)?.[1]?.trim()
          const filename = h1 ? `${h1}.md` : '金山文档_PRD.md'
          const doc: PrdDoc = {
            id: `prd-${Date.now()}`,
            filename,
            rawText: content,
            uploadedAt: Date.now(),
            category,
          }
          prdDocuments.unshift(doc)
          activePrdId = doc.id
          savePrdDoc(doc)
          setAppState('activePrdId', activePrdId)
          broadcast('prd-added', { doc, activePrdId })
          json(res, 200, { ok: true, id: doc.id, filename: doc.filename })
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e)
          json(res, 500, { error: `金山文档导入失败: ${msg}` })
        }
      })

      // ═══════════════════════════════════════════════════
      //  Delper 埋点导入 API
      // ═══════════════════════════════════════════════════

      server.middlewares.use('/api/delper', async (req, res, next) => {
        if (req.method === 'OPTIONS') {
          res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS' })
          res.end()
          return
        }

        const urlObj = new URL(req.url ?? '/', `http://${req.headers.host}`)
        const sub = urlObj.pathname.replace(/^\/+/, '')

        if (req.method === 'GET' && sub === 'industries') {
          try {
            const data = await callDelperMcp('tracking_list_industry')
            json(res, 200, data)
          } catch (e) {
            json(res, 500, { error: e instanceof Error ? e.message : '获取行业列表失败' })
          }
          return
        }

        if (req.method === 'GET' && sub === 'applications') {
          try {
            const industryId = Number(urlObj.searchParams.get('industryId'))
            if (!industryId) { json(res, 400, { error: '缺少 industryId' }); return }
            const data = await callDelperMcp('tracking_list_application', { industryId })
            json(res, 200, data)
          } catch (e) {
            json(res, 500, { error: e instanceof Error ? e.message : '获取应用列表失败' })
          }
          return
        }

        if (req.method === 'GET' && sub === 'businesses') {
          try {
            const applicationId = Number(urlObj.searchParams.get('applicationId'))
            if (!applicationId) { json(res, 400, { error: '缺少 applicationId' }); return }
            const data = await callDelperMcp('tracking_list_business', { applicationId })
            json(res, 200, data)
          } catch (e) {
            json(res, 500, { error: e instanceof Error ? e.message : '获取业务列表失败' })
          }
          return
        }

        if (req.method === 'GET' && sub === 'terminals') {
          try {
            const applicationId = Number(urlObj.searchParams.get('applicationId'))
            const data = await callDelperMcp('tracking_list_terminal', applicationId ? { applicationId } : {})
            json(res, 200, data)
          } catch (e) {
            json(res, 500, { error: e instanceof Error ? e.message : '获取终端列表失败' })
          }
          return
        }

        if (req.method === 'POST' && sub === 'import') {
          try {
            const body = JSON.parse(await readBody(req))
            const { events, meta, funcVersion } = body
            if (!events?.length) { json(res, 400, { error: '没有可导入的事件数据' }); return }
            if (!meta?.applicationName || !meta?.terminalName || !meta?.featureName) {
              json(res, 400, { error: '请完善基本信息（应用、终端、功能名称）' }); return
            }

            const excelBuf = await generatePositionModelExcel(events, meta, funcVersion)
            const fileBase64 = excelBuf.toString('base64')

            const result = await callDelperMcp('tracking_project_create', { fileBase64 })
            json(res, 200, { ok: true, result })
          } catch (e) {
            json(res, 500, { error: e instanceof Error ? e.message : '导入失败' })
          }
          return
        }

        if (req.method === 'POST' && sub === 'preview-excel') {
          try {
            const body = JSON.parse(await readBody(req))
            const { events, meta, funcVersion } = body
            const excelBuf = await generatePositionModelExcel(events || [], meta || {}, funcVersion)
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
            res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(meta?.featureName || 'tracking')}.xlsx"`)
            res.end(excelBuf)
          } catch (e) {
            json(res, 500, { error: e instanceof Error ? e.message : '生成预览失败' })
          }
          return
        }

        if (req.method === 'GET' && sub === 'test') {
          try {
            const data = await callDelperMcp('tracking_list_industry')
            json(res, 200, { ok: true, message: 'Delper 连接成功', data })
          } catch (e) {
            json(res, 500, { ok: false, error: e instanceof Error ? e.message : '连接失败' })
          }
          return
        }

        next()
      })

      // POST/PATCH/DELETE /api/run
      server.middlewares.use('/api/run', async (req, res, next) => {
        if (req.method === 'OPTIONS') {
          res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' })
          res.end()
          return
        }
        if (req.method === 'PATCH') {
          try {
            const body = JSON.parse(await readBody(req))
            const rec = runRecords.find((r: RunRecord) => r.id === body.id)
            if (!rec) { json(res, 404, { error: '运行记录不存在' }); return }
            if (body.prdId !== undefined) rec.prdId = body.prdId
            if (body.model !== undefined) rec.model = body.model
            saveRunRecord(rec)
            broadcast('run-updated', { record: rec })
            json(res, 200, { ok: true, id: rec.id })
          } catch (e) {
            json(res, 400, { error: e instanceof Error ? e.message : '请求体解析失败' })
          }
          return
        }
        if (req.method === 'DELETE') {
          try {
            const body = JSON.parse(await readBody(req))
            const idx = runRecords.findIndex((r: RunRecord) => r.id === body.id)
            if (idx === -1) { json(res, 404, { error: '运行记录不存在' }); return }
            runRecords.splice(idx, 1)
            deleteRunRecord(body.id)
            if (activeRunId === body.id) activeRunId = runRecords[0]?.id ?? null
            setAppState('activeRunId', activeRunId)
            broadcast('run-deleted', { id: body.id, activeRunId })
            json(res, 200, { ok: true })
          } catch (e) {
            json(res, 400, { error: e instanceof Error ? e.message : '请求体解析失败' })
          }
          return
        }
        if (req.method !== 'POST') return next()
        try {
          const body = JSON.parse(await readBody(req))
          const record: RunRecord = {
            id: body.id ?? `run-${Date.now()}`,
            prdId: body.prdId ?? activePrdId ?? '',
            skillVersionId: body.skillVersionId ?? 'cursor',
            model: body.model ?? 'cursor',
            result: body.result ?? {},
            rawResponse: body.rawResponse ?? '',
            createdAt: Date.now(),
            specVersionId: body.specVersionId ?? '',
          }
          runRecords.unshift(record)
          activeRunId = record.id
          saveRunRecord(record)
          setAppState('activeRunId', activeRunId)
          broadcast('run-added', { record, activeRunId })
          json(res, 200, { ok: true, id: record.id })
        } catch (e) {
          json(res, 400, { error: e instanceof Error ? e.message : '请求体解析失败' })
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [vue(), trackingLabPlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: {
      '/api/v3': {
        target: 'http://ai-gateway.wps.cn',
        changeOrigin: true,
        headers: { Host: 'ai-gateway.wps.cn' },
      },
    },
  },
})
