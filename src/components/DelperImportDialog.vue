<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Upload, Download } from '@element-plus/icons-vue'
import type { TrackingEvent } from '../types'

const props = defineProps<{
  visible: boolean
  events: TrackingEvent[]
  prdFilename?: string
  funcVersion?: string
}>()
const emit = defineEmits<{ close: []; imported: [result: any] }>()

interface DictItem { id: number; code: string; name: string; terminals?: DictItem[] }

const step = ref(1)
const loading = ref(false)
const importing = ref(false)
const importResult = ref<any>(null)

const industries = ref<DictItem[]>([])
const applications = ref<DictItem[]>([])
const businesses = ref<DictItem[]>([])
const terminals = ref<DictItem[]>([])

const selectedIndustryId = ref<number | null>(null)
const selectedAppId = ref<number | null>(null)
const selectedTerminalId = ref<number | null>(null)
const selectedBusinessId = ref<number | null>(null)
const featureName = ref('')
const featureCode = ref('')

const selectedApp = computed(() => applications.value.find(a => a.id === selectedAppId.value))
const selectedTerminal = computed(() => terminals.value.find(t => t.id === selectedTerminalId.value))
const selectedBusiness = computed(() => businesses.value.find(b => b.id === selectedBusinessId.value))

const zhEnMap: Record<string, string> = {
  '任务': 'task', '中心': 'center', '首页': 'home', '商城': 'mall', '活动': 'activity',
  '签到': 'checkin', '会员': 'member', '设置': 'settings', '搜索': 'search', '详情': 'detail',
  '列表': 'list', '推荐': 'recommend', '个人': 'profile', '消息': 'message', '通知': 'notify',
  '登录': 'login', '注册': 'register', '支付': 'payment', '订单': 'order', '购物车': 'cart',
  '收藏': 'favorite', '分享': 'share', '评论': 'comment', '反馈': 'feedback', '帮助': 'help',
  '字体': 'font', '模板': 'template', '文档': 'doc', '表格': 'sheet', '演示': 'slide',
  '写作': 'writing', '翻译': 'translate', '排版': 'layout', '素材': 'material', '图片': 'image',
  '视频': 'video', '音频': 'audio', '下载': 'download', '上传': 'upload', '导出': 'export',
  '导入': 'import', '编辑': 'edit', '预览': 'preview', '打印': 'print', '云': 'cloud',
  '新人': 'newbie', '专区': 'zone', '福利': 'welfare', '优惠': 'promo', '券': 'coupon',
  '礼包': 'gift', '红包': 'redpacket', '抽奖': 'lottery', '积分': 'points', '等级': 'level',
  '弹窗': 'popup', '引导': 'guide', '广告': 'ad', '横幅': 'banner', '浮窗': 'float',
  '工具': 'tool', '管理': 'manage', '统计': 'stats', '报表': 'report', '数据': 'data',
  '升级': 'upgrade', '更新': 'update', '版本': 'version', '体验': 'experience', '试用': 'trial',
  '合作': 'collab', '签到改造': 'checkin_revamp', '鹅鸭杀': 'goose_duck',
}

function autoGenerateCode(name: string): string {
  const prefix = selectedBusiness.value?.code ? `${selectedBusiness.value.code}_` : ''
  const parts: string[] = []
  let remaining = name.trim()
  const sortedKeys = Object.keys(zhEnMap).sort((a, b) => b.length - a.length)
  while (remaining.length > 0) {
    let matched = false
    for (const zh of sortedKeys) {
      if (remaining.startsWith(zh)) {
        parts.push(zhEnMap[zh])
        remaining = remaining.slice(zh.length)
        matched = true
        break
      }
    }
    if (!matched) {
      if (/^[a-zA-Z0-9_]/.test(remaining)) {
        const m = remaining.match(/^[a-zA-Z0-9_]+/)!
        parts.push(m[0].toLowerCase())
        remaining = remaining.slice(m[0].length)
      } else {
        remaining = remaining.slice(1)
      }
    }
  }
  return prefix + parts.join('_')
}

const codeManuallyEdited = ref(false)

const canProceed = computed(() => {
  if (step.value === 1) return !!selectedAppId.value && !!selectedTerminalId.value && !!selectedBusinessId.value
  if (step.value === 2) return !!featureName.value.trim() && !!featureCode.value.trim()
  return false
})

watch(featureName, (name) => {
  if (!codeManuallyEdited.value && name.trim()) {
    featureCode.value = autoGenerateCode(name)
  }
})

watch(() => props.visible, async (v) => {
  if (v) {
    step.value = 1
    importResult.value = null
    codeManuallyEdited.value = false
    if (industries.value.length === 0) await loadIndustries()
  }
})

watch(selectedIndustryId, async (id) => {
  selectedAppId.value = null
  applications.value = []
  businesses.value = []
  terminals.value = []
  if (id) await loadApplications(id)
})

watch(selectedAppId, async (id) => {
  selectedTerminalId.value = null
  selectedBusinessId.value = null
  businesses.value = []
  terminals.value = []
  if (!id) return
  const app = applications.value.find(a => a.id === id)
  if (app?.terminals?.length) {
    terminals.value = app.terminals
  }
  await loadBusinesses(id)
})

async function loadIndustries() {
  loading.value = true
  try {
    const resp = await fetch('/api/delper/industries')
    const data = await resp.json()
    if (data.error) throw new Error(data.error)
    industries.value = data.data || []
    if (industries.value.length === 1) {
      selectedIndustryId.value = industries.value[0].id
    }
  } catch (e: any) {
    ElMessage.error(e.message || '获取行业列表失败')
  } finally {
    loading.value = false
  }
}

async function loadApplications(industryId: number) {
  loading.value = true
  try {
    const resp = await fetch(`/api/delper/applications?industryId=${industryId}`)
    const data = await resp.json()
    if (data.error) throw new Error(data.error)
    applications.value = data.data || []
  } catch (e: any) {
    ElMessage.error(e.message || '获取应用列表失败')
  } finally {
    loading.value = false
  }
}

async function loadBusinesses(applicationId: number) {
  loading.value = true
  try {
    const resp = await fetch(`/api/delper/businesses?applicationId=${applicationId}`)
    const data = await resp.json()
    if (data.error) throw new Error(data.error)
    businesses.value = data.data || []
  } catch (e: any) {
    ElMessage.error(e.message || '获取业务列表失败')
  } finally {
    loading.value = false
  }
}

function nextStep() {
  if (step.value < 3) step.value++
}
function prevStep() {
  if (step.value > 1) step.value--
}

function buildMeta() {
  return {
    applicationId: selectedAppId.value || undefined,
    applicationName: selectedApp.value?.name || '',
    applicationCode: selectedApp.value?.code || '',
    terminalId: selectedTerminalId.value || undefined,
    terminalName: selectedTerminal.value?.name || '',
    terminalCode: selectedTerminal.value?.code || '',
    businessId: selectedBusinessId.value || undefined,
    businessName: selectedBusiness.value?.name || '',
    businessCode: selectedBusiness.value?.code || '',
    featureName: featureName.value.trim(),
    featureCode: featureCode.value.trim(),
    prdName: props.prdFilename || '',
  }
}

async function downloadExcel() {
  try {
    const resp = await fetch('/api/delper/preview-excel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: props.events, meta: buildMeta(), funcVersion: props.funcVersion }),
    })
    if (!resp.ok) {
      const err = await resp.json()
      throw new Error(err.error || '生成失败')
    }
    const blob = await resp.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${featureName.value || 'tracking'}_埋点方案.xlsx`
    a.click()
    URL.revokeObjectURL(url)
    ElMessage.success('Excel 已下载')
  } catch (e: any) {
    ElMessage.error(e.message)
  }
}

async function doImport() {
  importing.value = true
  try {
    const resp = await fetch('/api/delper/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: props.events, meta: buildMeta(), funcVersion: props.funcVersion }),
    })
    const data = await resp.json()
    if (!resp.ok || data.error) throw new Error(data.error || '导入失败')
    importResult.value = data.result
    step.value = 4
    ElMessage.success('导入 Delper 成功')
    emit('imported', data.result)
  } catch (e: any) {
    ElMessage.error(e.message || '导入失败')
  } finally {
    importing.value = false
  }
}
</script>

<template>
  <el-dialog
    :model-value="visible"
    title="导入 Delper 埋点平台"
    width="580px"
    @close="emit('close')"
    :close-on-click-modal="false"
  >
    <el-steps :active="step - 1" finish-status="success" simple class="import-steps">
      <el-step title="选择归属" />
      <el-step title="功能信息" />
      <el-step title="确认导入" />
    </el-steps>

    <div class="step-content" v-loading="loading">
      <!-- Step 1: 选择归属 -->
      <template v-if="step === 1">
        <el-form label-width="80px" label-position="left">
          <el-form-item label="行业" required>
            <el-select v-model="selectedIndustryId" placeholder="选择行业" style="width: 100%">
              <el-option v-for="i in industries" :key="i.id" :label="i.name" :value="i.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="应用" required>
            <el-select v-model="selectedAppId" placeholder="选择应用" style="width: 100%" :disabled="!selectedIndustryId" filterable>
              <el-option v-for="a in applications" :key="a.id" :label="a.name" :value="a.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="终端" required>
            <el-select v-model="selectedTerminalId" placeholder="选择终端" style="width: 100%" :disabled="!selectedAppId">
              <el-option v-for="t in terminals" :key="t.id" :label="t.name" :value="t.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="业务" required>
            <el-select v-model="selectedBusinessId" placeholder="选择业务" style="width: 100%" :disabled="!selectedAppId" filterable>
              <el-option v-for="b in businesses" :key="b.id" :label="b.name" :value="b.id" />
            </el-select>
          </el-form-item>
        </el-form>
      </template>

      <!-- Step 2: 功能信息 -->
      <template v-if="step === 2">
        <el-form label-width="80px" label-position="left">
          <el-form-item label="功能名称" required>
            <el-input v-model="featureName" placeholder="如：稻壳_商城" />
          </el-form-item>
          <el-form-item label="功能标识" required>
            <el-input v-model="featureCode" placeholder="如：docer_mall" @input="codeManuallyEdited = true" />
            <div class="field-hint">建议格式：{业务}_{功能}，如 ai_writing、vas_member</div>
          </el-form-item>
          <el-form-item label="PRD 来源">
            <el-input :model-value="prdFilename || '未关联'" disabled />
          </el-form-item>
        </el-form>
      </template>

      <!-- Step 3: 确认导入 -->
      <template v-if="step === 3">
        <div class="confirm-info">
          <div class="confirm-row">
            <span class="confirm-label">应用归属</span>
            <span>{{ selectedApp?.name }} ({{ selectedApp?.code }})</span>
          </div>
          <div class="confirm-row">
            <span class="confirm-label">应用终端</span>
            <span>{{ selectedTerminal?.name }} ({{ selectedTerminal?.code }})</span>
          </div>
          <div class="confirm-row">
            <span class="confirm-label">业务归属</span>
            <span>{{ selectedBusiness?.name }} ({{ selectedBusiness?.code }})</span>
          </div>
          <div class="confirm-row">
            <span class="confirm-label">功能名称</span>
            <span>{{ featureName }} ({{ featureCode }})</span>
          </div>
          <div class="confirm-row highlight">
            <span class="confirm-label">事件数量</span>
            <span>{{ events.length }} 个事件</span>
          </div>
        </div>
        <el-alert
          type="info"
          :closable="false"
          show-icon
          style="margin-top: 16px"
        >
          <template #title>
            将按照位置模型格式生成 Excel 并上传至 Delper 平台，
            系统会自动创建对应的功能和事件。
          </template>
        </el-alert>
      </template>

      <!-- Step 4: 导入结果 -->
      <template v-if="step === 4">
        <el-result icon="success" title="导入成功" sub-title="埋点方案已成功导入 Delper 平台">
          <template #extra>
            <el-button type="primary" @click="emit('close')">完成</el-button>
          </template>
        </el-result>
      </template>
    </div>

    <template #footer v-if="step < 4">
      <div class="dialog-footer">
        <div class="footer-left">
          <el-button v-if="step === 3" :icon="Download" @click="downloadExcel" text>
            下载 Excel
          </el-button>
        </div>
        <div class="footer-right">
          <el-button @click="step > 1 ? prevStep() : emit('close')">
            {{ step > 1 ? '上一步' : '取消' }}
          </el-button>
          <el-button
            v-if="step < 3"
            type="primary"
            :disabled="!canProceed"
            @click="nextStep"
          >
            下一步
          </el-button>
          <el-button
            v-if="step === 3"
            type="primary"
            :icon="Upload"
            :loading="importing"
            @click="doImport"
          >
            {{ importing ? '导入中...' : '确认导入' }}
          </el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped>
.import-steps { margin-bottom: 24px; }

.step-content { min-height: 200px; }

.field-hint { font-size: 12px; color: var(--text-tertiary); margin-top: 4px; }

.confirm-info {
  background: var(--bg-hover);
  border-radius: var(--radius-sm, 6px);
  padding: 16px 20px;
}
.confirm-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 8px 0; font-size: 14px; color: var(--text-primary);
  border-bottom: 1px solid var(--border-subtle, #f0f0f0);
}
.confirm-row:last-child { border-bottom: none; }
.confirm-row.highlight { font-weight: 600; color: var(--accent, #409eff); }
.confirm-label { color: var(--text-secondary); min-width: 80px; }

.dialog-footer { display: flex; justify-content: space-between; align-items: center; width: 100%; }
.footer-left { flex: 1; }
.footer-right { display: flex; gap: 8px; }
</style>
