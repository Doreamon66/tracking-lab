<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import {
  MagicStick, Plus, Check, InfoFilled, QuestionFilled,
  Link, Delete, Document, Upload, Right, FolderOpened, DataAnalysis, Setting, EditPen, Promotion,
  Search, MoreFilled, VideoPause,
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { usePrdStore } from '../stores/prdStore'
import { useRunStore } from '../stores/runStore'
import { useSkillDbStore } from '../stores/skillDbStore'
import { useServerSync } from '../composables/useServerSync'
import { useSettingsStore } from '../stores/settingsStore'
import { useTrackingRun } from '../composables/useTrackingRun'
import { diffSkillJson } from '../utils/skillDiff'
import MarkdownView from '../components/MarkdownView.vue'
import ResultPanel from '../components/ResultPanel.vue'
import SettingsDialog from '../components/SettingsDialog.vue'
import SkillDrawer from '../components/SkillDrawer.vue'
import SpecEditor from '../components/SpecEditor.vue'
import VersionManagerDrawer from '../components/VersionManagerDrawer.vue'
import type { PrdDocument, SkillJsonData } from '../types'

const prdStore = usePrdStore()
const runStore = useRunStore()
const store = useSkillDbStore()
const { connected } = useServerSync()
const settingsStore = useSettingsStore()
const trackingRun = useTrackingRun()

const showVersionDrawer = ref(false)
const showDocDrawer = ref(false)

// ── 文档管理 ──
const wpsUrl = ref('')
const wpsLoading = ref(false)
const pasteText = ref('')
const pasteFilename = ref('')
const pasteCategory = ref('未分类')
const importCategory = ref('未分类')
const showPasteDialog = ref(false)
const showAddCategoryDialog = ref(false)
const newCategoryName = ref('')
const selectedPrdId = ref<string | null>(null)
const activeCategory = ref<string | null>(null)
const searchQuery = ref('')
const dragOver = ref(false)
const selectedPrd = computed(() =>
  prdStore.documents.find(d => d.id === selectedPrdId.value) ?? null
)

const filteredDocs = computed(() => {
  let docs = activeCategory.value
    ? prdStore.documents.filter(d => (d.category || '未分类') === activeCategory.value)
    : prdStore.documents
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return docs
  return docs.filter(d => {
    const name = d.filename.toLowerCase()
    const preview = d.rawText.slice(0, 200).toLowerCase()
    return name.includes(q) || preview.includes(q)
  })
})

async function importFromWps() {
  const url = wpsUrl.value.trim()
  if (!url) { ElMessage.warning('请输入金山文档链接'); return }
  if (!/kdocs\.cn/i.test(url)) { ElMessage.warning('请输入包含 kdocs.cn 的金山文档链接'); return }
  wpsLoading.value = true
  try {
    const resp = await fetch('/api/wps-import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, category: importCategory.value }),
    })
    const data = await resp.json()
    if (!resp.ok || data.error) throw new Error(data.error || `请求失败 (${resp.status})`)
    wpsUrl.value = ''
    const state = await (await fetch('/api/state')).json()
    if (state.prdDocuments?.length) {
      for (const doc of state.prdDocuments) {
        if (!prdStore.documents.find(d => d.id === doc.id)) prdStore.documents.unshift(doc)
      }
    }
    ElMessage.success(`已导入：${data.filename}`)
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '导入失败')
  } finally {
    wpsLoading.value = false
  }
}

function handlePasteImport() {
  const text = pasteText.value.trim()
  if (!text) { ElMessage.warning('请输入内容'); return }
  const filename = pasteFilename.value.trim() || '手动粘贴 PRD.md'
  const category = pasteCategory.value || '未分类'
  const doc = prdStore.addFromText(filename, text, category)
  fetch('/api/prd', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: doc.id, filename, rawText: text, category }),
  }).catch(() => {})
  showPasteDialog.value = false
  pasteText.value = ''
  pasteFilename.value = ''
  pasteCategory.value = '未分类'
  ElMessage.success(`已添加：${filename}`)
}

async function handleDeleteDoc(doc: PrdDocument) {
  try {
    await ElMessageBox.confirm(
      `确定删除「${displayName(doc.filename)}」？此操作不可恢复。`,
      '删除确认',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' },
    )
    prdStore.remove(doc.id)
    if (selectedPrdId.value === doc.id) selectedPrdId.value = null
    ElMessage.success('已删除')
  } catch {
    // 用户取消
  }
}

async function handleRenameDoc(doc: PrdDocument) {
  try {
    const { value } = await ElMessageBox.prompt('请输入新名称', '重命名文档', {
      inputValue: displayName(doc.filename),
      confirmButtonText: '确定',
      cancelButtonText: '取消',
    })
    if (!value?.trim()) return
    let newName = value.trim()
    if (!/\.(md|txt)$/i.test(newName)) newName += '.md'
    prdStore.rename(doc.id, newName)
    ElMessage.success('已重命名')
  } catch {
    // 用户取消
  }
}

function selectPrd(docId: string) {
  prdStore.setActive(docId)
  const doc = prdStore.documents.find(d => d.id === docId)
  if (doc) {
    const skillId = prdStore.getSkillForCategory(doc.category || '未分类')
    if (skillId) {
      store.fetchHistory(skillId)
      const skill = store.skills.find(s => s.skill_id === skillId)
      if (skill?.file_path) {
        selectedBusinessSpec.value = skill.file_path
        loadSpecVersions(skill.file_path)
      }
    }
  }
  showDocDrawer.value = false
}

function handleDocCommand(cmd: string, doc: PrdDocument) {
  if (cmd === 'delete') {
    handleDeleteDoc(doc)
  } else if (cmd === '__rename__') {
    handleRenameDoc(doc)
  } else if (cmd === '__workbench__') {
    selectPrd(doc.id)
  } else {
    prdStore.updateCategory(doc.id, cmd)
  }
}

const showBindSkillDialog = ref(false)
const bindSkillCategory = ref('')
const bindSelectedFile = ref('')
const bindNewFileName = ref('')

function openBindSkill(cat: string) {
  bindNewFileName.value = ''
  bindSkillCategory.value = cat
  // 反查当前绑定的 Skill 对应的文件
  const skillId = prdStore.getSkillForCategory(cat)
  if (skillId) {
    const skill = store.skills.find(s => s.skill_id === skillId)
    bindSelectedFile.value = skill?.file_path || ''
  } else {
    bindSelectedFile.value = ''
  }
  showBindSkillDialog.value = true
}

async function saveBindByFile() {
  const filePath = bindSelectedFile.value
  if (!filePath) {
    // 解绑
    await prdStore.setCategorySkill(bindSkillCategory.value, null)
    showBindSkillDialog.value = false
    ElMessage.success(`分类「${bindSkillCategory.value}」已解绑`)
    return
  }

  // 查找是否已有对应文件的 Skill
  let skill = store.skills.find(s => s.file_path === filePath)

  if (!skill) {
    // 自动创建：从文件名推导 ID 和名称
    const filename = filePath.split('/').pop() || filePath
    const id = filename.replace(/[-_]?specs?\.md$/i, '').replace(/\.md$/i, '') || 'custom'
    const name = displayName(filename)
    try {
      await store.createSkill(id, name, filePath)
      skill = store.skills.find(s => s.skill_id === id)
    } catch {
      ElMessage.error('创建 Skill 失败')
      return
    }
  }

  if (skill) {
    await prdStore.setCategorySkill(bindSkillCategory.value, skill.skill_id)
    showBindSkillDialog.value = false
    ElMessage.success(`分类「${bindSkillCategory.value}」已绑定「${skill.name}」`)
  }
}

async function createNewSpecAndBind() {
  const name = bindNewFileName.value.trim()
  if (!name) return
  const filename = `${name}-specs.md`
  try {
    const resp = await fetch('/api/spec-create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename }),
    })
    if (!resp.ok) {
      const data = await resp.json()
      ElMessage.error(data.error || '创建失败')
      return
    }
    const data = await resp.json()
    await store.fetchSpecFiles()
    // 自动创建 Skill 并绑定
    const id = name.replace(/\s+/g, '-').toLowerCase()
    try {
      await store.createSkill(id, name, data.path)
    } catch { /* Skill ID 可能重复，忽略 */ }
    const skill = store.skills.find(s => s.file_path === data.path)
    if (skill) {
      await prdStore.setCategorySkill(bindSkillCategory.value, skill.skill_id)
    }
    showBindSkillDialog.value = false
    ElMessage.success(`已新建「${filename}」并绑定到分类「${bindSkillCategory.value}」`)
  } catch {
    ElMessage.error('创建规范文件失败')
  }
}

function getSkillNameForCategory(cat: string): string | null {
  const skillId = prdStore.getSkillForCategory(cat)
  if (!skillId) return null
  const skill = store.skills.find(s => s.skill_id === skillId)
  return skill?.name || skillId
}

async function handleCategoryAction(cmd: string, cat: string) {
  if (cmd === 'bind') {
    openBindSkill(cat)
    return
  }
  if (cmd === 'rename') {
    try {
      const { value } = await ElMessageBox.prompt('请输入新分类名称', '重命名分类', {
        inputValue: cat,
        confirmButtonText: '确定',
        cancelButtonText: '取消',
      })
      const newName = value?.trim()
      if (!newName || newName === cat) return
      await prdStore.renameCategory(cat, newName)
      if (activeCategory.value === cat) activeCategory.value = newName
      ElMessage.success(`分类已重命名为「${newName}」`)
    } catch {
      // 用户取消
    }
  } else if (cmd === 'delete') {
    try {
      await ElMessageBox.confirm(
        `确定删除分类「${cat}」？该分类下的文档将移至「未分类」。`,
        '删除分类',
        { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' },
      )
      await prdStore.removeCategory(cat)
      if (activeCategory.value === cat) activeCategory.value = null
      ElMessage.success('分类已删除')
    } catch {
      // 用户取消
    }
  }
}

async function handleFileDrop(e: DragEvent) {
  dragOver.value = false
  const files = e.dataTransfer?.files
  if (!files?.length) return
  let count = 0
  for (const file of Array.from(files)) {
    if (!/\.(md|txt)$/i.test(file.name)) continue
    const text = await file.text()
    const doc = prdStore.addFromText(file.name, text, importCategory.value)
    fetch('/api/prd', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: doc.id, filename: file.name, rawText: text, category: importCategory.value }),
    }).catch(() => {})
    count++
  }
  if (count) ElMessage.success(`已导入 ${count} 个文件`)
  else ElMessage.warning('请拖入 .md 或 .txt 文件')
}

function handleAddCategory() {
  const name = newCategoryName.value.trim()
  if (!name) { ElMessage.warning('请输入分类名称'); return }
  if (prdStore.categories.includes(name) || prdStore.categoryList.includes(name)) {
    prdStore.addCategory(name)
    ElMessage.success(`分类「${name}」已就绪`)
  } else {
    prdStore.addCategory(name)
    ElMessage.success(`分类「${name}」已创建`)
  }
  showAddCategoryDialog.value = false
  newCategoryName.value = ''
}

// ── 埋点工作台 ──
const showSettings = ref(false)
const showSkill = ref(false)

// ── 方案模式切换 ──
const specMode = ref<'overlay' | 'standalone'>('overlay')
const standaloneSpecPath = 'tracking-design/references/ops-activity-specs.md'

watch(specMode, (mode) => {
  trackingRun.setSpecMode(mode)
  if (mode === 'standalone') {
    loadBusinessSpec(standaloneSpecPath)
  } else {
    const doc = prdStore.activeDoc()
    if (doc) {
      const skillId = prdStore.getSkillForCategory(doc.category || '未分类')
      if (skillId) {
        const skill = store.skills.find(s => s.skill_id === skillId)
        if (skill?.file_path) {
          loadBusinessSpec(skill.file_path)
          return
        }
      }
    }
    loadBusinessSpec('')
  }
})

// ── 业务 Skill 选择（生成埋点用）──
const selectedBusinessSpec = ref('')
const businessSpecContent = ref('')

async function loadBusinessSpec(filePath: string) {
  if (!filePath) {
    businessSpecContent.value = ''
    trackingRun.setBusinessSpec('')
    return
  }
  try {
    const resp = await fetch(`/api/spec-content?path=${encodeURIComponent(filePath)}`)
    const data = await resp.json()
    businessSpecContent.value = data.content ?? ''
    trackingRun.setBusinessSpec(businessSpecContent.value)
  } catch {
    businessSpecContent.value = ''
    trackingRun.setBusinessSpec('')
  }
}

watch(selectedBusinessSpec, (v) => loadBusinessSpec(v))

const currentDocSkillInfo = computed(() => {
  const doc = prdStore.activeDoc()
  if (!doc) return null
  const skillId = prdStore.getSkillForCategory(doc.category || '未分类')
  if (!skillId) return null
  const skill = store.skills.find(s => s.skill_id === skillId)
  if (!skill) return null
  return { skillId: skill.skill_id, name: skill.name, filePath: skill.file_path }
})

watch(() => prdStore.activeId, () => {
  const doc = prdStore.activeDoc()
  if (!doc) return
  const skillId = prdStore.getSkillForCategory(doc.category || '未分类')
  if (skillId) {
    const skill = store.skills.find(s => s.skill_id === skillId)
    if (skill?.file_path) {
      selectedBusinessSpec.value = skill.file_path
      selectedSpecVersion.value = ''
      loadSpecVersions(skill.file_path)
      return
    }
  }
  selectedBusinessSpec.value = ''
  specVersions.value = []
  selectedSpecVersion.value = ''
  trackingRun.setBusinessSpec('')
  trackingRun.setSpecVersionId('')
})

const activeSpecLabel = computed(() => {
  if (specMode.value === 'standalone') return '运营活动方案（独立规范）'
  if (!selectedBusinessSpec.value) return '位置模型方案 (SKILL.md)'
  const f = store.specFiles.find(s => s.path === selectedBusinessSpec.value)
  return f ? `位置模型 + ${f.filename}` : '位置模型 + 业务规范'
})

// ── 业务规范版本管理 ──
const showSpecEditor = ref(false)
const specVersions = ref<{ id: string; version: number; content: string; note: string; created_at: number; file_path: string }[]>([])
const selectedSpecVersion = ref<string>('')

async function loadSpecVersions(filePath: string) {
  if (!filePath) { specVersions.value = []; return }
  try {
    const resp = await fetch(`/api/spec-versions?file=${encodeURIComponent(filePath)}`)
    specVersions.value = await resp.json()
    if (specVersions.value.length && !selectedSpecVersion.value) {
      selectedSpecVersion.value = specVersions.value[0].id
    }
    if (specVersions.value.length) {
      const latest = specVersions.value[0]
      businessSpecContent.value = latest.content
      trackingRun.setBusinessSpec(latest.content)
      trackingRun.setSpecVersionId(latest.id)
    }
  } catch { specVersions.value = [] }
}

function onSpecVersionChange(versionId: string) {
  selectedSpecVersion.value = versionId
  const ver = specVersions.value.find(v => v.id === versionId)
  if (ver) {
    businessSpecContent.value = ver.content
    trackingRun.setBusinessSpec(ver.content)
    trackingRun.setSpecVersionId(ver.id)
  }
}

function onSpecSaved() {
  if (currentDocSkillInfo.value?.filePath) {
    loadSpecVersions(currentDocSkillInfo.value.filePath)
  }
}


// ── Skill 版本管理 ──
const newVersion = ref('')
const saveStatus = ref<'draft' | 'released'>('draft')
const showCreateDialog = ref(false)
const newSkillId = ref('')
const newSkillName = ref('')
const newSkillFilePath = ref('')

// ── 初始化向导 ──
const showWizard = ref(false)
const wizardStep = ref(0)
const wizardSpecDir = ref('tracking-design')
const wizardModel = ref(settingsStore.settings.model)
const wizardSkillId = ref('')
const wizardSkillName = ref('')
const wizardSkillFile = ref('')

interface PlatformConfig {
  specDir: string
  hasSkills: boolean
  hasPrds: boolean
  aiConfigured: boolean
  specDirExists: boolean
}

async function checkFirstRun() {
  try {
    const resp = await fetch('/api/config')
    const cfg: PlatformConfig = await resp.json()
    if (!cfg.hasSkills && !cfg.hasPrds) {
      wizardSpecDir.value = cfg.specDir
      showWizard.value = true
    }
  } catch { /* ignore */ }
}

async function wizardFinish() {
  // 1. 保存规范目录
  await fetch('/api/config', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ specDir: wizardSpecDir.value.trim() || 'tracking-design' }),
  }).catch(() => {})

  // 2. 保存模型
  settingsStore.save({ ...settingsStore.settings, model: wizardModel.value })

  // 3. 创建 Skill（如果填了）
  if (wizardSkillId.value.trim() && wizardSkillName.value.trim()) {
    try {
      await store.createSkill(
        wizardSkillId.value.trim(),
        wizardSkillName.value.trim(),
        wizardSkillFile.value || undefined,
      )
    } catch { /* ignore */ }
  }

  showWizard.value = false
  store.fetchSpecFiles()
  store.fetchSpecs()
  ElMessage.success('配置完成，开始使用吧！')
}

const modelOptions = [
  { label: 'Claude Opus 4.6', value: 'aws/claude-opus-4-6-v1' },
  { label: 'Claude Sonnet 4.6', value: 'aws/claude-sonnet-4-6' },
  { label: 'Claude Sonnet 4.5', value: 'aws/claude-sonnet-4-5' },
  { label: 'GPT-5.4', value: 'azure/gpt-5.4' },
  { label: 'GPT-5-Mini', value: 'azure/gpt-5-mini' },
  { label: 'Qwen Plus Latest (Qwen3)', value: 'ali/qwen-plus-latest' },
  { label: 'Qwen Max', value: 'ali/qwen-max' },
  { label: 'DeepSeek V4 Flash', value: 'deepseek/deepseek-v4-flash' },
  { label: 'DeepSeek V3.2', value: 'deepseek/deepseek-v3.2' },
  { label: 'GLM-5.1', value: 'zhipu/glm-5.1' },
  { label: 'Doubao Seed 2.0 Pro', value: 'doubao/Doubao-Seed-2.0-pro' },
  { label: 'Kimi K2.5', value: 'moonshot/kimi-k2.5' },
]

function handleKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
    e.preventDefault()
    trackingRun.generateWithAI()
  }
}

onMounted(() => {
  store.fetchSkills()
  store.fetchSpecs()
  store.fetchSpecFiles()
  prdStore.fetchCategories()
  prdStore.fetchCategoryConfig()
  checkFirstRun()
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

watch(() => store.currentSkillId, () => { store.clearGenerated() })

const diffResult = computed(() => {
  if (!store.generatedSkillJson) return null
  return diffSkillJson(store.baseSkillJson, store.generatedSkillJson)
})

const suggestedVersion = computed(() => {
  if (!store.snapshots.length) return '1.0.0'
  const latest = store.snapshots[0].version
  const parts = latest.split('.').map(Number)
  if (diffResult.value) {
    if (diffResult.value.addedCount > 0 || diffResult.value.removedCount > 0) {
      parts[1] = (parts[1] ?? 0) + 1; parts[2] = 0
    } else { parts[2] = (parts[2] ?? 0) + 1 }
  } else { parts[2] = (parts[2] ?? 0) + 1 }
  return parts.join('.')
})

watch(suggestedVersion, v => { newVersion.value = v }, { immediate: true })

async function handleGenerate() {
  const prd = prdStore.activeDoc()
  if (!prd) { ElMessage.warning('请先选择一个 PRD 文档'); return }
  const ok = await store.generateNewVersion(prd.rawText)
  if (ok) ElMessage.success('AI 增量生成完成')
}

async function handleSave() {
  if (!newVersion.value.trim()) { ElMessage.warning('请输入版本号'); return }
  const prd = prdStore.activeDoc()
  const ok = await store.saveSnapshot(newVersion.value, prd?.rawText ?? '', saveStatus.value)
  if (ok) ElMessage.success(`版本 ${newVersion.value} 已保存`)
}

async function handleCreateSkill() {
  if (!newSkillId.value.trim() || !newSkillName.value.trim()) { ElMessage.warning('请填写完整'); return }
  try {
    await store.createSkill(newSkillId.value.trim(), newSkillName.value.trim(), newSkillFilePath.value)
    showCreateDialog.value = false; newSkillId.value = ''; newSkillName.value = ''; newSkillFilePath.value = ''
    ElMessage.success('Skill 已创建')
  } catch { ElMessage.error('创建失败') }
}

async function handlePublish(version: string) {
  if (!store.currentSkillId) return
  const skill = store.currentSkill
  if (!skill?.file_path) {
    ElMessage.warning('该 Skill 未绑定文件，无法发布')
    return
  }
  try {
    await ElMessageBox.confirm(
      `确认将 v${version} 发布到 ${skill.file_path}？\n这将覆盖文件中的当前内容。`,
      '发布确认',
      { type: 'warning', confirmButtonText: '确认发布', cancelButtonText: '取消' },
    )
    const msg = await store.publishToFile(store.currentSkillId, version)
    ElMessage.success(msg)
  } catch {
    // 用户取消
  }
}

function formatTime(ts: string | number) {
  return new Date(ts).toLocaleString('zh-CN')
}

function displayName(filename: string) {
  return filename.replace(/\.md$/i, '')
}

const groupedPrdOptions = computed(() => {
  const groups: { label: string; docs: { id: string; name: string }[] }[] = []
  for (const cat of prdStore.categoryList) {
    const docs = prdStore.documents
      .filter(d => (d.category || '未分类') === cat)
      .map(d => ({ id: d.id, name: displayName(d.filename) }))
    if (docs.length) groups.push({ label: cat, docs })
  }
  return groups
})

const phaseLabel = computed(() => {
  const p = trackingRun.streamProgress.value.phase
  if (p === 'connecting') return '连接中...'
  if (p === 'reasoning') return 'AI 思考中...'
  if (p === 'generating') return '生成方案中...'
  return '完成'
})

function formatElapsed(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return m > 0 ? `${m}:${sec.toString().padStart(2, '0')}` : `${sec}s`
}

async function handleGenerateFromParent() {
  await trackingRun.generateWithAI()
}

function parseSkillJson(jsonStr: string): SkillJsonData | null {
  try { return JSON.parse(jsonStr) } catch { return null }
}
</script>

<template>
  <div class="layout">
    <!-- ── 全宽顶栏 ── -->
    <header class="top-bar">
      <div class="top-left">
        <span class="brand-text">Tracking Lab</span>
        <el-divider direction="vertical" />
        <el-tag :type="connected ? 'success' : 'danger'" size="small" effect="dark" round>
          {{ connected ? '已连接' : '未连接' }}
        </el-tag>
      </div>
      <div class="top-right">
        <el-button :icon="FolderOpened" text size="small" @click="showDocDrawer = true">文档管理</el-button>
        <el-button :icon="Setting" text size="small" @click="showSettings = true">设置</el-button>
      </div>
    </header>

    <!-- ── 工作台主体 ── -->
    <div class="workbench">
      <!-- 方案模式切换 + Skill 信息 -->
      <div class="wb-toolbar">
        <div class="wb-toolbar-left">
          <span class="wb-scheme-label">方案模式：</span>
          <el-radio-group v-model="specMode" size="small">
            <el-radio-button value="overlay">位置模型方案</el-radio-button>
            <el-radio-button value="standalone">运营活动方案</el-radio-button>
          </el-radio-group>
          <el-tooltip placement="bottom">
            <template #content>
              <div style="max-width: 300px; line-height: 1.6">
                <strong>位置模型方案</strong>：使用得谱平台位置模型规范（SKILL.md），按页面→模块→元素层级组织埋点<br/><br/>
                <strong>运营活动方案</strong>：使用运营活动团队自定义规范，采用独立的事件定义和属性体系
              </div>
            </template>
            <el-icon style="margin-left: 4px; color: #909399; cursor: help"><QuestionFilled /></el-icon>
          </el-tooltip>

          <el-divider direction="vertical" />

          <!-- Skill 信息 -->
          <template v-if="specMode === 'overlay' && currentDocSkillInfo">
            <el-icon style="color: #409eff"><MagicStick /></el-icon>
            <span class="wb-skill-name">{{ currentDocSkillInfo.name }}</span>
            <el-select
              v-if="specVersions.length"
              v-model="selectedSpecVersion"
              size="small"
              style="width: 150px"
              @change="onSpecVersionChange"
            >
              <el-option
                v-for="v in specVersions"
                :key="v.id"
                :label="`v${v.version} - ${v.note || '未命名'}`"
                :value="v.id"
              />
            </el-select>
            <el-tag v-else size="small" type="info" effect="plain">无版本</el-tag>
            <el-button text size="small" type="primary" @click="showVersionDrawer = true">管理版本</el-button>
            <el-button text size="small" @click="showSpecEditor = true">编辑规范</el-button>
          </template>
          <template v-else-if="specMode === 'overlay' && !currentDocSkillInfo && prdStore.activeDoc()">
            <el-icon style="color: #e6a23c"><InfoFilled /></el-icon>
            <span style="color: #e6a23c; font-size: 13px">未绑定业务 Skill，使用通用规范</span>
            <el-button text size="small" type="primary" @click="openBindSkill(prdStore.activeDoc()?.category || '未分类')">绑定 Skill</el-button>
          </template>
        </div>
        <div class="wb-toolbar-right">
          <el-tag size="small" effect="plain">{{ settingsStore.settings.model.split('/').pop() }}</el-tag>
          <span v-if="runStore.generating" class="toolbar-elapsed">{{ formatElapsed(trackingRun.elapsedSeconds.value) }}</span>
          <el-tooltip :content="runStore.generating ? '终止生成' : '生成埋点 (Ctrl+G)'" placement="bottom">
            <el-button
              :type="runStore.generating ? 'danger' : 'primary'"
              :icon="runStore.generating ? VideoPause : MagicStick"
              :disabled="!runStore.generating && !prdStore.activeDoc()"
              :circle="runStore.generating"
              @click="runStore.generating ? trackingRun.abort() : handleGenerateFromParent()"
            >
              <template v-if="!runStore.generating">生成埋点</template>
            </el-button>
          </el-tooltip>
        </div>
      </div>

      <!-- 两栏主体 -->
      <div class="wb-body">
        <!-- 左栏：PRD 预览 -->
        <div class="wb-prd-preview">
          <div class="panel-hd">
            <div class="panel-hd-left">
              <el-icon><Document /></el-icon>
              <span>PRD 文档</span>
            </div>
            <div class="panel-hd-right">
              <el-select
                v-model="prdStore.activeId"
                placeholder="选择文档"
                class="wb-doc-select"
                size="small"
                filterable
              >
                <el-option-group
                  v-for="group in groupedPrdOptions"
                  :key="group.label"
                  :label="group.label"
                >
                  <el-option
                    v-for="doc in group.docs"
                    :key="doc.id"
                    :label="doc.name"
                    :value="doc.id"
                  />
                </el-option-group>
              </el-select>
              <el-popover placement="bottom-end" :width="420" trigger="click">
                <template #reference>
                  <el-button :icon="Plus" size="small" text>导入</el-button>
                </template>
                <div class="import-popover">
                  <div class="import-popover-title">导入 PRD 文档</div>
                  <el-select v-model="importCategory" placeholder="分类" size="small" style="width: 100%; margin-bottom: 8px">
                    <el-option v-for="c in prdStore.categoryList" :key="c" :label="c" :value="c" />
                  </el-select>
                  <el-input
                    v-model="wpsUrl"
                    placeholder="粘贴金山文档链接 (kdocs.cn) 后回车"
                    clearable
                    :disabled="wpsLoading"
                    size="small"
                    @keyup.enter="importFromWps"
                  >
                    <template #prepend><el-icon><Link /></el-icon></template>
                    <template #append>
                      <el-button :loading="wpsLoading" size="small" @click="importFromWps">导入</el-button>
                    </template>
                  </el-input>
                  <div class="import-popover-btns">
                    <el-button size="small" @click="showPasteDialog = true">粘贴文本</el-button>
                    <el-button size="small" @click="showDocDrawer = true">文档管理</el-button>
                  </div>
                </div>
              </el-popover>
            </div>
          </div>
          <div v-if="prdStore.activeDoc()" class="prd-preview-body">
            <MarkdownView :content="prdStore.activeDoc()!.rawText" />
          </div>
          <div v-else class="empty-guide">
            <el-icon :size="48" color="#c0c4cc"><Document /></el-icon>
            <h3>开始使用</h3>
            <p>在上方选择已有文档，或点击「导入」添加新的 PRD 文档</p>
          </div>
        </div>

        <!-- 右栏：埋点结果 -->
        <div class="wb-result">
          <div class="panel-hd">
            <div class="panel-hd-left">
              <el-icon><DataAnalysis /></el-icon>
              <span>埋点方案</span>
            </div>
            <el-tag v-if="currentDocSkillInfo" size="small" effect="plain">
              {{ currentDocSkillInfo.name }}
            </el-tag>
          </div>
          <div class="result-body">
            <el-alert
              v-if="runStore.error"
              :title="runStore.error"
              type="error"
              show-icon
              closable
              style="margin: 0 0 12px"
              @close="runStore.setError(null)"
            />
            <ResultPanel
              :spec-versions="specVersions"
              :on-generate="handleGenerateFromParent"
              :on-abort="trackingRun.abort"
              :generating="runStore.generating"
              :stream-progress="trackingRun.streamProgress.value"
              :elapsed-seconds="trackingRun.elapsedSeconds.value"
              :spec-mode="specMode"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- ── 文档管理抽屉 ── -->
    <el-drawer v-model="showDocDrawer" size="440px" direction="ltr" :with-header="false">
      <div class="doc-drawer">
        <div class="drawer-search">
          <el-input v-model="searchQuery" placeholder="搜索文档..." clearable size="default" :prefix-icon="Search" />
        </div>

        <!-- 分类筛选 -->
        <div class="drawer-cats">
          <span class="drawer-cat" :class="{ active: !activeCategory }" @click="activeCategory = null">全部 {{ prdStore.documents.length }}</span>
          <span
            v-for="cat in prdStore.categoryList"
            :key="cat"
            class="drawer-cat"
            :class="{ active: activeCategory === cat }"
            @click="activeCategory = activeCategory === cat ? null : cat"
          >{{ cat }} {{ prdStore.groupedDocs[cat]?.length ?? 0 }}</span>
          <span class="drawer-cat drawer-cat-add" @click="showAddCategoryDialog = true">+</span>
        </div>

        <!-- 导入栏 -->
        <div class="drawer-import"
          :class="{ 'drag-active': dragOver }"
          @dragover.prevent="dragOver = true"
          @dragleave="dragOver = false"
          @drop.prevent="handleFileDrop"
        >
          <el-input
            v-model="wpsUrl"
            placeholder="粘贴 kdocs.cn 链接导入"
            clearable
            :disabled="wpsLoading"
            size="small"
            @keyup.enter="importFromWps"
          >
            <template #append>
              <el-button :loading="wpsLoading" size="small" @click="importFromWps">导入</el-button>
            </template>
          </el-input>
          <el-button size="small" text @click="showPasteDialog = true">粘贴文本</el-button>
        </div>

        <!-- 文档列表 -->
        <div class="drawer-list">
          <el-empty v-if="!filteredDocs.length" :description="activeCategory ? `「${activeCategory}」下暂无文档` : '暂无文档'" :image-size="48" />
          <div
            v-for="doc in filteredDocs"
            :key="doc.id"
            class="drawer-doc"
            :class="{ active: prdStore.activeId === doc.id }"
            @click="selectPrd(doc.id)"
          >
            <div class="drawer-doc-main">
              <div class="drawer-doc-name">{{ displayName(doc.filename) }}</div>
              <div class="drawer-doc-meta">
                <span>{{ doc.category || '未分类' }}</span>
                <span>{{ (doc.rawText.length / 1024).toFixed(1) }}KB</span>
              </div>
            </div>
            <el-dropdown trigger="click" @command="(cmd: string) => handleDocCommand(cmd, doc)" @click.stop>
              <el-icon class="drawer-doc-more" @click.stop><MoreFilled /></el-icon>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item :icon="EditPen" command="__rename__">重命名</el-dropdown-item>
                  <el-dropdown-item divided disabled>移动到分类</el-dropdown-item>
                  <el-dropdown-item v-for="c in prdStore.categoryList" :key="c" :command="c">
                    <span :style="{ fontWeight: (doc.category || '未分类') === c ? '700' : '400' }">{{ c }}</span>
                  </el-dropdown-item>
                  <el-dropdown-item divided :icon="Delete" command="delete" class="danger-item">删除</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
      </div>
    </el-drawer>

    <!-- 粘贴文本导入对话框 -->
    <el-dialog v-model="showPasteDialog" title="粘贴文本导入 PRD" width="640px">
      <el-form label-width="70px">
        <el-form-item label="文档名称"><el-input v-model="pasteFilename" placeholder="如：新人专区 PRD v2.md" /></el-form-item>
        <el-form-item label="所属分类">
          <el-select v-model="pasteCategory" placeholder="选择分类" style="width:100%">
            <el-option v-for="c in prdStore.categoryList" :key="c" :label="c" :value="c" />
          </el-select>
        </el-form-item>
        <el-form-item label="PRD 内容"><el-input v-model="pasteText" type="textarea" :rows="12" placeholder="粘贴 PRD 全文..." /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showPasteDialog = false">取消</el-button>
        <el-button type="primary" :disabled="!pasteText.trim()" @click="handlePasteImport">导入</el-button>
      </template>
    </el-dialog>

    <!-- 新建分类对话框 -->
    <el-dialog v-model="showAddCategoryDialog" title="新建分类" width="400px">
      <el-form label-width="80px">
        <el-form-item label="分类名称"><el-input v-model="newCategoryName" placeholder="如：外部合作、积分活动" @keyup.enter="handleAddCategory" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddCategoryDialog = false">取消</el-button>
        <el-button type="primary" :disabled="!newCategoryName.trim()" @click="handleAddCategory">创建</el-button>
      </template>
    </el-dialog>

    <!-- 新建 Skill 对话框 -->
    <el-dialog v-model="showCreateDialog" title="新建 Skill" width="500px">
      <el-form label-width="90px">
        <el-form-item label="Skill ID"><el-input v-model="newSkillId" placeholder="英文标识，如 activity" /></el-form-item>
        <el-form-item label="业务名称"><el-input v-model="newSkillName" placeholder="如 运营活动" /></el-form-item>
        <el-form-item label="关联文件">
          <el-select v-model="newSkillFilePath" placeholder="选择 references 目录下的文件（可选）" clearable style="width:100%">
            <el-option
              v-for="f in store.specFiles.filter(s => s.path !== 'tracking-design/SKILL.md')"
              :key="f.path"
              :label="f.filename"
              :value="f.path"
            />
          </el-select>
          <div class="form-hint">关联后可将调试好的版本发布回该文件</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="handleCreateSkill">创建</el-button>
      </template>
    </el-dialog>

    <!-- 绑定 Skill 对话框 -->
    <el-dialog v-model="showBindSkillDialog" title="绑定业务规范" width="480px">
      <p class="bind-desc">为分类「{{ bindSkillCategory }}」选择一个业务规范文件，进入工作台时将自动加载</p>

      <div class="bind-file-list">
        <div
          v-for="f in store.specFiles.filter(s => !s.path.endsWith('SKILL.md'))"
          :key="f.path"
          class="bind-file-item"
          :class="{ active: bindSelectedFile === f.path }"
          @click="bindSelectedFile = bindSelectedFile === f.path ? '' : f.path"
        >
          <el-icon><Document /></el-icon>
          <div class="bind-file-info">
            <div class="bind-file-name">{{ displayName(f.filename) }}</div>
            <div class="bind-file-path">{{ f.path }}</div>
          </div>
          <el-icon v-if="bindSelectedFile === f.path" class="bind-file-check"><Check /></el-icon>
        </div>
        <el-empty v-if="!store.specFiles.filter(s => !s.path.endsWith('SKILL.md')).length" description="references/ 目录下暂无规范文件" :image-size="48" />
      </div>

      <el-divider content-position="center" style="margin: 16px 0 12px">或</el-divider>

      <div class="bind-create-row">
        <el-input v-model="bindNewFileName" placeholder="输入新规范文件名，如 external" size="default">
          <template #append>-specs.md</template>
        </el-input>
        <el-button type="success" :disabled="!bindNewFileName.trim()" @click="createNewSpecAndBind">新建并绑定</el-button>
      </div>

      <template #footer>
        <el-button @click="showBindSkillDialog = false">取消</el-button>
        <el-button v-if="bindSelectedFile" type="warning" @click="bindSelectedFile = ''; saveBindByFile()">解绑</el-button>
        <el-button type="primary" :disabled="!bindSelectedFile" @click="saveBindByFile">确定绑定</el-button>
      </template>
    </el-dialog>

    <VersionManagerDrawer
      v-model:visible="showVersionDrawer"
      :skill-name="currentDocSkillInfo?.name ?? ''"
      :file-path="currentDocSkillInfo?.filePath ?? ''"
      :spec-versions="specVersions"
      :selected-version-id="selectedSpecVersion"
      @select-version="onSpecVersionChange"
      @open-editor="showSpecEditor = true"
      @open-skill="showSkill = true"
    />

    <SkillDrawer :visible="showSkill" @close="showSkill = false" />
    <SpecEditor
      :visible="showSpecEditor"
      :file-path="currentDocSkillInfo?.filePath ?? ''"
      :title="currentDocSkillInfo ? `编辑规范：${currentDocSkillInfo.name}` : '编辑规范'"
      @close="showSpecEditor = false"
      @saved="onSpecSaved"
    />
    <SettingsDialog :visible="showSettings" @close="showSettings = false" />

    <!-- 初始化向导 -->
    <el-dialog v-model="showWizard" title="欢迎使用 Tracking Lab" width="560px" :close-on-click-modal="false" :show-close="false">
      <div class="wizard">
        <!-- Step 0: 规范目录 -->
        <div v-show="wizardStep === 0" class="wizard-step">
          <div class="wizard-step-title">① 配置规范目录</div>
          <p class="wizard-desc">指定存放埋点规范文件的目录（包含 SKILL.md 主规范和 references/ 下的补充规范）</p>
          <el-input v-model="wizardSpecDir" placeholder="如 tracking-design">
            <template #prepend>项目根目录 /</template>
          </el-input>
        </div>

        <!-- Step 1: AI 模型 -->
        <div v-show="wizardStep === 1" class="wizard-step">
          <div class="wizard-step-title">② 选择 AI 模型</div>
          <p class="wizard-desc">用于生成埋点方案的大语言模型（AI Token 已在 .env 中配置）</p>
          <el-select v-model="wizardModel" style="width: 100%">
            <el-option v-for="opt in modelOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
        </div>

        <!-- Step 2: 创建 Skill -->
        <div v-show="wizardStep === 2" class="wizard-step">
          <div class="wizard-step-title">③ 创建第一个业务 Skill（可跳过）</div>
          <p class="wizard-desc">每个业务方向有自己的专属规范，如"活动业务"对应 SKILL.md（主规范）</p>
          <el-form label-width="90px" size="default">
            <el-form-item label="Skill ID">
              <el-input v-model="wizardSkillId" placeholder="英文标识，如 activity" />
            </el-form-item>
            <el-form-item label="业务名称">
              <el-input v-model="wizardSkillName" placeholder="如 运营活动" />
            </el-form-item>
            <el-form-item label="关联文件">
              <el-select v-model="wizardSkillFile" placeholder="references/ 下的规范文件（可选）" clearable style="width:100%">
                <el-option
                  v-for="f in store.specFiles.filter(s => !s.path.endsWith('SKILL.md'))"
                  :key="f.path"
                  :label="f.filename"
                  :value="f.path"
                />
              </el-select>
            </el-form-item>
          </el-form>
        </div>

        <!-- 步骤指示 -->
        <div class="wizard-dots">
          <span v-for="i in 3" :key="i" class="dot" :class="{ active: wizardStep === i - 1 }" />
        </div>
      </div>

      <template #footer>
        <el-button v-if="wizardStep > 0" @click="wizardStep--">上一步</el-button>
        <el-button @click="showWizard = false">跳过</el-button>
        <el-button v-if="wizardStep < 2" type="primary" @click="wizardStep++">下一步</el-button>
        <el-button v-else type="primary" @click="wizardFinish">完成</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--bg-primary);
}

/* ── 顶栏 ── */
.top-bar {
  height: 48px;
  background: #16171f;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  flex-shrink: 0;
  z-index: 10;
}

.top-left { display: flex; align-items: center; gap: 10px; }
.brand-text { font-size: 15px; font-weight: 700; color: #fff; letter-spacing: -0.3px; }
.top-left :deep(.el-divider) { border-color: rgba(255,255,255,0.1); }

.top-right { display: flex; align-items: center; gap: 2px; }
.top-right :deep(.el-button) { color: rgba(255,255,255,0.6); font-size: 13px; }
.top-right :deep(.el-button:hover) { color: #fff; background: rgba(255,255,255,0.08); }

/* ── 工具栏 ── */
.workbench { flex: 1; display: flex; flex-direction: column; overflow: hidden; }

.wb-toolbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 6px 16px; background: var(--bg-card);
  border-bottom: 1px solid var(--border-subtle); flex-shrink: 0; gap: 12px;
}

.wb-toolbar-left { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; min-width: 0; }
.wb-toolbar-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.wb-skill-name { font-size: 13px; font-weight: 600; color: var(--text-primary); }

.wb-scheme-label { color: var(--text-secondary); font-weight: 500; white-space: nowrap; font-size: 13px; }
.toolbar-elapsed { font-size: 13px; color: var(--text-tertiary); font-variant-numeric: tabular-nums; font-weight: 500; }

/* ── 导入 Popover ── */
.import-popover-title { font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 10px; }
.import-popover-btns { display: flex; gap: 8px; margin-top: 10px; }

/* ── 文档管理抽屉 ── */
.doc-drawer { height: 100%; display: flex; flex-direction: column; overflow: hidden; }

.drawer-search { padding: 16px 16px 12px; flex-shrink: 0; }

.drawer-cats {
  display: flex; flex-wrap: wrap; gap: 6px;
  padding: 0 16px 12px; flex-shrink: 0;
}

.drawer-cat {
  font-size: 12px; padding: 4px 12px; border-radius: 20px;
  cursor: pointer; color: var(--text-secondary); background: var(--bg-hover);
  transition: all 0.15s; user-select: none; font-weight: 500;
}

.drawer-cat:hover { background: var(--accent-light); color: var(--accent); }
.drawer-cat.active { background: var(--accent); color: #fff; }
.drawer-cat-add { font-weight: 700; font-size: 14px; padding: 4px 10px; }

.drawer-import {
  margin: 0 16px 12px; padding: 10px 12px;
  background: var(--bg-hover); border-radius: var(--radius-sm);
  display: flex; align-items: center; gap: 8px; flex-shrink: 0;
}

.drawer-import.drag-active { background: var(--accent-light); }

.drawer-list { flex: 1; overflow-y: auto; padding: 0 8px 16px; }

.drawer-doc {
  display: flex; align-items: center; padding: 10px 12px;
  border-radius: var(--radius-sm); cursor: pointer; transition: all 0.12s;
  margin-bottom: 2px;
}

.drawer-doc:hover { background: var(--bg-hover); }
.drawer-doc.active { background: var(--accent-light); }

.drawer-doc-main { flex: 1; min-width: 0; }

.drawer-doc-name {
  font-size: 13px; font-weight: 500; color: var(--text-primary);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

.drawer-doc-meta {
  font-size: 11px; color: var(--text-tertiary); margin-top: 2px;
  display: flex; gap: 8px;
}

.drawer-doc-more {
  font-size: 16px; color: var(--text-tertiary); opacity: 0;
  transition: opacity 0.1s; cursor: pointer; padding: 4px;
}

.drawer-doc:hover .drawer-doc-more { opacity: 1; }
.drawer-doc-more:hover { color: var(--text-primary); }

/* ── 两栏主体 ── */
.wb-body {
  flex: 1; display: flex; overflow: hidden;
  gap: 1px; background: var(--border-subtle);
}

.wb-prd-preview {
  flex: 1; background: var(--bg-card);
  display: flex; flex-direction: column; overflow: hidden; min-width: 0;
}

.panel-hd {
  height: 44px; display: flex; align-items: center; justify-content: space-between;
  padding: 0 16px; background: var(--bg-card);
  border-bottom: 1px solid var(--border-subtle); flex-shrink: 0;
}

.panel-hd-left {
  display: flex; align-items: center; gap: 8px;
  font-size: 13px; font-weight: 600; color: var(--text-primary);
}

.panel-hd-right { display: flex; align-items: center; gap: 8px; }
.wb-doc-select { width: 220px; }
.prd-preview-body { flex: 1; overflow: auto; padding: 20px; }

.empty-guide {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  height: 100%; gap: 8px; color: var(--text-tertiary); text-align: center;
}
.empty-guide h3 { margin: 8px 0 0; font-size: 15px; color: var(--text-secondary); font-weight: 600; }
.empty-guide p { margin: 0; font-size: 13px; max-width: 280px; line-height: 1.6; }

.wb-result {
  flex: 1; min-width: 0; overflow: hidden;
  background: var(--bg-card); display: flex; flex-direction: column;
}

.result-body { flex: 1; overflow: hidden; display: flex; flex-direction: column; }

:deep(.danger-item) { color: var(--danger) !important; }

.form-hint { font-size: 12px; color: var(--text-tertiary); margin-top: 4px; }

/* ── 向导 ── */
.wizard-step { min-height: 120px; }
.wizard-step-title { font-size: 16px; font-weight: 700; color: var(--text-primary); margin-bottom: 8px; }
.wizard-desc { font-size: 13px; color: var(--text-tertiary); margin: 0 0 16px; line-height: 1.5; }
.wizard-dots { display: flex; justify-content: center; gap: 8px; margin-top: 20px; }
.dot { width: 8px; height: 8px; border-radius: 50%; background: #dcdfe6; transition: all 0.2s; }
.dot.active { background: var(--accent); width: 24px; border-radius: 4px; }

/* ── Skill 标签 ── */
.cat-skill-tag {
  font-size: 10px; background: rgba(79,110,247,0.1); color: var(--accent);
  padding: 1px 6px; border-radius: 3px; margin-left: 6px; font-weight: 400;
}

/* ── 绑定文件 ── */
.bind-desc { font-size: 13px; color: var(--text-secondary); margin: 0 0 12px; line-height: 1.5; }
.bind-file-list { display: flex; flex-direction: column; gap: 6px; max-height: 280px; overflow-y: auto; }

.bind-file-item {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px; border: 1px solid var(--border-light);
  border-radius: var(--radius-sm); cursor: pointer; transition: all 0.12s;
}

.bind-file-item:hover { border-color: var(--accent); background: var(--accent-light); }
.bind-file-item.active { border-color: var(--accent); background: var(--accent-light); }
.bind-file-info { flex: 1; min-width: 0; }
.bind-file-name { font-size: 14px; font-weight: 600; color: var(--text-primary); }
.bind-file-path { font-size: 11px; color: var(--text-tertiary); margin-top: 2px; }
.bind-file-check { color: var(--accent); font-size: 18px; flex-shrink: 0; }
.bind-create-row { display: flex; align-items: center; gap: 10px; }
</style>
