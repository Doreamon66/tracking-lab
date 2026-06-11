const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')

const BASE = 'http://localhost:5173'
const OUT = path.join(__dirname, 'screenshots')

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

async function safeClick(page, selector, timeout = 3000) {
  try {
    const el = await page.waitForSelector(selector, { state: 'visible', timeout })
    if (el) { await el.click(); return true }
  } catch { /* ignore */ }
  return false
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  })
  const page = await context.newPage()

  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 })
  await sleep(3000)

  // ── 1. 文档管理页 ──
  console.log('[1/5] 文档管理页...')
  await safeClick(page, '.el-menu-item:has-text("文档管理")')
  await sleep(1000)
  await safeClick(page, '.category-item', 2000)
  await sleep(300)
  await safeClick(page, '.doc-item', 2000)
  await sleep(500)
  await page.screenshot({ path: path.join(OUT, '01-doc-management.png'), fullPage: false })
  console.log('  done')

  // ── 2. 进入工作台 → 生成埋点 ──
  console.log('[2/5] 生成埋点页...')
  // Try clicking "进入工作台" button first
  const entered = await safeClick(page, 'button:has-text("进入工作台")', 3000)
  if (entered) {
    await sleep(2000)
  } else {
    await safeClick(page, '.el-menu-item:has-text("埋点工作台")')
    await sleep(1500)
  }
  await safeClick(page, '.el-tabs__item:has-text("生成埋点")', 2000)
  await sleep(800)
  await page.screenshot({ path: path.join(OUT, '02-generate-tracking.png'), fullPage: false })
  console.log('  done')

  // ── 3. 规范编辑器抽屉 ──
  console.log('[3/5] 规范编辑器...')
  const opened = await safeClick(page, 'button:has-text("编辑规范")', 3000)
  if (opened) {
    await sleep(1500)
    await page.screenshot({ path: path.join(OUT, '03-spec-editor.png'), fullPage: false })
    await page.keyboard.press('Escape')
    await sleep(600)
  } else {
    console.log('  "编辑规范" not found, capturing current')
    await page.screenshot({ path: path.join(OUT, '03-spec-editor.png'), fullPage: false })
  }
  console.log('  done')

  // ── 4. Skill 版本管理 ──
  console.log('[4/5] Skill 版本管理...')
  await safeClick(page, '.el-tabs__item:has-text("Skill 版本管理")', 3000)
  await sleep(1500)
  // Try to click a version item but don't fail if not found
  await safeClick(page, '.version-item', 2000)
  await sleep(500)
  await page.screenshot({ path: path.join(OUT, '04-skill-versions.png'), fullPage: false })
  console.log('  done')

  // ── 5. 对比模式 ──
  console.log('[5/5] 对比模式...')
  const switched = await safeClick(page, '.el-switch', 3000)
  if (switched) {
    await sleep(800)
    // Click first two version items
    const items = await page.$$('.version-item')
    if (items.length >= 2) {
      try { await items[0].click({ timeout: 2000 }); await sleep(300) } catch {}
      try { await items[1].click({ timeout: 2000 }); await sleep(500) } catch {}
    }
  }
  await page.screenshot({ path: path.join(OUT, '05-compare-mode.png'), fullPage: false })
  console.log('  done')

  await browser.close()
  console.log('\nAll screenshots taken.')

  // ── Embed into presentation.html ──
  console.log('\n--- Embedding into presentation.html ---')
  const htmlPath = path.join(__dirname, 'presentation.html')
  let html = fs.readFileSync(htmlPath, 'utf-8')

  const mapping = [
    { label: '文档管理页', file: '01-doc-management.png' },
    { label: '生成埋点页', file: '02-generate-tracking.png' },
    { label: '规范编辑器', file: '03-spec-editor.png' },
    { label: '版本管理页', file: '04-skill-versions.png' },
    { label: '版本对比',   file: '05-compare-mode.png' },
  ]

  for (const { label, file } of mapping) {
    const imgPath = path.join(OUT, file)
    if (!fs.existsSync(imgPath)) {
      console.log(`  skip ${file} (not found)`)
      continue
    }

    const imgData = fs.readFileSync(imgPath)
    const base64 = imgData.toString('base64')
    const dataUri = `data:image/png;base64,${base64}`

    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const re = new RegExp(
      `(<div class="screenshot-placeholder">\\s*<div class="label">${escaped}</div>)[\\s\\S]*?(<\\/div>\\s*<\\/div>)`,
      'm'
    )

    if (re.test(html)) {
      html = html.replace(re,
        `$1\n      <img src="${dataUri}" alt="${label}" style="max-width:100%; border-radius:8px; box-shadow: 0 2px 12px rgba(0,0,0,0.08);" />\n    $2`
      )
      console.log(`  embedded: ${file} -> "${label}"`)
    } else {
      console.log(`  no match: "${label}"`)
    }
  }

  fs.writeFileSync(htmlPath, html, 'utf-8')
  console.log('\nDone! presentation.html updated.')
}

main().catch(e => {
  console.error('Error:', e)
  process.exit(1)
})
