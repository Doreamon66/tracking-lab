<script setup lang="ts">
import { computed, ref } from 'vue'
import { MagicStick, Check, Download, Upload } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { usePrdStore } from '../stores/prdStore'
import { useRunStore } from '../stores/runStore'
import { useAiReview } from '../composables/useAiReview'
import EventTable from './EventTable.vue'
import OpsEventTable from './OpsEventTable.vue'
import MarkdownView from './MarkdownView.vue'
import DelperImportDialog from './DelperImportDialog.vue'

interface SpecVersionOption {
  id: string
  version: number
  note: string
}

interface StreamProgress {
  phase: 'connecting' | 'reasoning' | 'generating' | 'done'
  contentLength: number
  reasoningLength: number
}

const props = withDefaults(defineProps<{
  specVersions?: SpecVersionOption[]
  onGenerate?: () => Promise<void>
  onAbort?: () => void
  generating?: boolean
  streamProgress?: StreamProgress
  elapsedSeconds?: number
  specMode?: 'overlay' | 'standalone'
}>(), {
  specVersions: () => [],
  generating: false,
  streamProgress: () => ({ phase: 'connecting' as const, contentLength: 0, reasoningLength: 0 }),
  elapsedSeconds: 0,
  specMode: 'overlay',
})

const prdStore = usePrdStore()
const runStore = useRunStore()
const { reviewing, reviewResult, reviewCurrentRun, clearReview } = useAiReview()

const historyVersionFilter = ref<string>('')
const showDelperImport = ref(false)

const activePrd = computed(() => prdStore.activeDoc())

function inferSpecMode(r: { specMode?: string; result?: { opsResult?: any } }): 'overlay' | 'standalone' {
  if (r.specMode === 'overlay' || r.specMode === 'standalone') return r.specMode
  return r.result?.opsResult ? 'standalone' : 'overlay'
}

const activeRun = computed(() => {
  const prdId = prdStore.activeId
  if (!prdId) return null

  const current = runStore.activeRun()
  if (current && current.prdId === prdId && inferSpecMode(current) === props.specMode) {
    return current
  }

  const prdRuns = runStore.runsForPrd(prdId)
  const modeRuns = prdRuns.filter(r => inferSpecMode(r) === props.specMode)
  return modeRuns[0] ?? null
})

const result = computed(() => activeRun.value?.result)
const isOpsResult = computed(() => !!result.value?.opsResult)

const mainTab = computed(() => {
  if (activeRun.value) return 'result'
  if (activePrd.value) return 'prd'
  return 'empty'
})

const prdRuns = computed(() => {
  const prdId = prdStore.activeId
  if (!prdId) return []
  return runStore.runsForPrd(prdId).filter(r => inferSpecMode(r) === props.specMode)
})

const filteredPrdRuns = computed(() => {
  if (!historyVersionFilter.value) return prdRuns.value
  return prdRuns.value.filter(r => r.specVersionId === historyVersionFilter.value)
})

function getSpecVersionLabel(specVersionId: string) {
  const sv = props.specVersions.find(v => v.id === specVersionId)
  return sv ? `v${sv.version}` : ''
}

function formatModelName(model: string) {
  if (model === 'cursor' || model === 'cursor-skill') return 'Cursor'
  const m = model.toLowerCase()
  if (m.includes('claude')) return model.split('/').pop() || 'Claude'
  if (m.includes('gpt') || m.includes('/o3')) return model.split('/').pop() || 'GPT'
  if (m.includes('qwen') || m.includes('qwq')) return model.split('/').pop() || 'Qwen'
  if (m.includes('deepseek')) return model.split('/').pop() || 'DeepSeek'
  if (m.includes('glm')) return model.split('/').pop() || 'GLM'
  if (m.includes('doubao') || m.includes('seed')) return model.split('/').pop() || 'Doubao'
  if (m.includes('kimi')) return model.split('/').pop() || 'Kimi'
  return model.split('/').pop() || model
}

const scoreType = computed(() => {
  const s = reviewResult.value?.score ?? 0
  if (s >= 80) return 'success'
  if (s >= 60) return 'warning'
  return 'danger'
})

function severityType(sev: string) {
  if (sev === 'error') return 'danger'
  if (sev === 'warning') return 'warning'
  return 'info'
}

async function handleGenerate() {
  clearReview()
  if (props.onGenerate) {
    await props.onGenerate()
  }
}

function handleExport() {
  const run = activeRun.value
  if (!run?.rawResponse) {
    ElMessage.warning('暂无可导出的内容')
    return
  }
  const blob = new Blob([run.rawResponse], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const prd = activePrd.value
  a.download = `埋点方案_${prd?.filename?.replace(/\.md$/i, '') || 'tracking'}_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.md`
  a.click()
  URL.revokeObjectURL(url)
  ElMessage.success('已导出 Markdown 文件')
}

const genPhaseLabel = computed(() => {
  const p = props.streamProgress.phase
  if (p === 'connecting') return '连接中'
  if (p === 'reasoning') return 'AI 深度思考中'
  if (p === 'generating') return '方案生成中'
  return '完成'
})

const ringOffset = computed(() => {
  const circumference = 226
  const p = props.streamProgress.phase
  if (p === 'connecting') return circumference * 0.85
  if (p === 'reasoning') return circumference * 0.5
  if (p === 'generating') {
    const kb = props.streamProgress.contentLength / 1024
    const progress = Math.min(kb / 15, 0.9)
    return circumference * (1 - (0.5 + progress * 0.45))
  }
  return 0
})

function formatGenElapsed(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return m > 0 ? `${m} 分 ${sec} 秒` : `${sec} 秒`
}
</script>

<template>
  <div class="panel">
    <!-- 空状态 -->
    <el-empty
      v-if="mainTab === 'empty'"
      description="粘贴金山文档链接导入 PRD，即可一键生成埋点方案"
    />

    <!-- 有 PRD 但无结果 -->
    <template v-if="mainTab === 'prd'">
      <div class="generate-placeholder">
        <template v-if="generating">
          <div class="gen-stage">
            <!-- 阶段指示器 -->
            <div class="gen-steps">
              <div class="gen-step" :class="{ active: true, done: streamProgress.phase !== 'connecting' }">
                <div class="gen-step-dot" />
                <span>连接</span>
              </div>
              <div class="gen-step-line" :class="{ filled: streamProgress.phase !== 'connecting' }" />
              <div class="gen-step" :class="{ active: streamProgress.phase === 'reasoning' || streamProgress.phase === 'generating', done: streamProgress.phase === 'generating' }">
                <div class="gen-step-dot" />
                <span>思考</span>
              </div>
              <div class="gen-step-line" :class="{ filled: streamProgress.phase === 'generating' }" />
              <div class="gen-step" :class="{ active: streamProgress.phase === 'generating' }">
                <div class="gen-step-dot" />
                <span>生成</span>
              </div>
            </div>

            <!-- 主视觉区 -->
            <div class="gen-visual">
              <div class="gen-ring">
                <svg viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="36" fill="none" stroke="#e4e7ed" stroke-width="3" />
                  <circle cx="40" cy="40" r="36" fill="none" stroke="#409eff" stroke-width="3"
                    stroke-linecap="round" stroke-dasharray="226" :stroke-dashoffset="ringOffset"
                    class="gen-ring-progress" />
                </svg>
                <span class="gen-ring-time">{{ formatGenElapsed(elapsedSeconds) }}</span>
              </div>
            </div>

            <h3 class="gen-stage-title">{{ genPhaseLabel }}</h3>
            <p class="gen-stage-detail">
              <template v-if="streamProgress.phase === 'connecting'">正在连接 AI 服务，请稍候</template>
              <template v-else-if="streamProgress.phase === 'reasoning'">
                AI 正在深度分析 PRD 文档
                <span class="gen-stage-metric" v-if="streamProgress.reasoningLength > 0">{{ (streamProgress.reasoningLength / 1024).toFixed(1) }} KB 思考链</span>
              </template>
              <template v-else-if="streamProgress.phase === 'generating'">
                方案内容输出中
                <span class="gen-stage-metric">{{ (streamProgress.contentLength / 1024).toFixed(1) }} KB</span>
              </template>
            </p>
          </div>
        </template>
        <template v-else>
          <el-icon :size="48" color="#c0c4cc"><MagicStick /></el-icon>
          <h3>{{ activePrd?.filename }}</h3>
          <p>点击右上角「生成埋点」开始生成方案</p>
        </template>
      </div>
    </template>

    <!-- 有结果：展示埋点方案 -->
    <template v-if="mainTab === 'result'">
      <!-- 顶部操作栏 -->
      <div class="result-toolbar">
        <el-row :gutter="12" align="middle">
          <el-col :span="14">
            <el-row v-if="isOpsResult" :gutter="12">
              <el-col :span="8">
                <el-statistic title="埋点数" :value="result!.opsResult!.changes.length" />
              </el-col>
              <el-col :span="8">
                <el-statistic title="继承" :value="result!.opsResult!.inherited.length" />
              </el-col>
              <el-col :span="8">
                <el-statistic title="组件" :value="result!.opsResult!.component ? 1 : 0" />
              </el-col>
            </el-row>
            <el-row v-else :gutter="12">
              <el-col :span="8">
                <el-statistic title="事件数" :value="result?.events.length ?? 0" />
              </el-col>
              <el-col :span="8">
                <el-statistic
                  title="P0 事件"
                  :value="result?.events.filter((e) => e.priority === 'P0').length ?? 0"
                />
              </el-col>
              <el-col :span="8">
                <el-statistic title="信息缺口" :value="result?.gaps?.length ?? 0" />
              </el-col>
            </el-row>
          </el-col>
          <el-col :span="10" class="toolbar-actions">
            <el-button :icon="Upload" @click="showDelperImport = true" :disabled="isOpsResult">
              导入 Delper
            </el-button>
            <el-button :icon="Download" @click="handleExport">导出方案</el-button>
            <el-button
              :icon="Check"
              :loading="reviewing"
              @click="reviewCurrentRun"
            >
              {{ reviewing ? '审查中...' : 'AI 审查' }}
            </el-button>
            <el-button
              :icon="MagicStick"
              type="primary"
              :loading="generating"
              @click="handleGenerate"
            >
              重新生成
            </el-button>
          </el-col>
        </el-row>
      </div>

      <!-- 审查结果卡片 -->
      <el-card v-if="reviewResult" class="review-card" shadow="never">
        <template #header>
          <div class="review-header">
            <span class="review-title">AI 审查结果</span>
            <el-tag :type="scoreType" size="large" effect="dark" round>
              {{ reviewResult.score }} 分
            </el-tag>
          </div>
        </template>

        <p class="review-summary">{{ reviewResult.summary }}</p>

        <div v-if="reviewResult.strengths.length" class="review-section">
          <h5>优点</h5>
          <el-tag
            v-for="(s, i) in reviewResult.strengths"
            :key="i"
            type="success"
            style="margin: 4px"
          >
            {{ s }}
          </el-tag>
        </div>

        <div v-if="reviewResult.issues.length" class="review-section">
          <h5>待改进项 ({{ reviewResult.issues.length }})</h5>
          <el-table :data="reviewResult.issues" size="small" stripe>
            <el-table-column label="级别" width="80">
              <template #default="{ row }">
                <el-tag :type="severityType(row.severity)" size="small">
                  {{ row.severity === 'error' ? '必修' : row.severity === 'warning' ? '建议' : '优化' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="category" label="维度" width="100" />
            <el-table-column prop="description" label="问题" />
            <el-table-column prop="suggestion" label="建议" />
          </el-table>
        </div>
      </el-card>

      <el-alert
        v-if="result?.parseError"
        :title="result.parseError"
        type="warning"
        show-icon
        :closable="false"
        style="margin-bottom: 12px"
      />

      <el-tabs>
        <el-tab-pane :label="isOpsResult ? '埋点方案' : '事件表'">
          <OpsEventTable v-if="isOpsResult" :data="result!.opsResult!" />
          <EventTable v-else :events="result?.events ?? []" />
        </el-tab-pane>

        <el-tab-pane label="缺口 & 漏斗">
          <div v-if="result?.gaps?.length" class="section">
            <h4>PRD 信息缺口</h4>
            <el-tag v-for="(g, i) in result.gaps" :key="i" style="margin: 4px" type="warning">
              {{ g }}
            </el-tag>
          </div>
          <div v-if="result?.funnels?.length" class="section">
            <h4>漏斗</h4>
            <el-card v-for="(f, i) in result.funnels" :key="i" shadow="never" style="margin-bottom: 8px">
              <template #header>{{ f.name }}</template>
              <el-steps :active="f.steps.length" finish-status="success" simple>
                <el-step v-for="(step, j) in f.steps" :key="j" :title="step" />
              </el-steps>
            </el-card>
          </div>
          <el-empty
            v-if="!result?.gaps?.length && !result?.funnels?.length"
            description="暂无缺口或漏斗数据"
          />
        </el-tab-pane>

        <el-tab-pane label="方案文档">
          <MarkdownView :content="result?.rawMarkdown ?? ''" />
        </el-tab-pane>

        <el-tab-pane label="原始响应">
          <pre class="raw">{{ activeRun?.rawResponse }}</pre>
        </el-tab-pane>

        <el-tab-pane label="生成历史">
          <div v-if="props.specVersions.length > 0" class="history-filter">
            <span class="filter-label">按规范版本：</span>
            <el-select v-model="historyVersionFilter" clearable placeholder="全部版本" size="small" style="width: 200px">
              <el-option label="全部版本" value="" />
              <el-option
                v-for="sv in props.specVersions"
                :key="sv.id"
                :label="`v${sv.version} - ${sv.note || '未命名'}`"
                :value="sv.id"
              />
            </el-select>
          </div>
          <div v-if="filteredPrdRuns.length === 0" class="empty-history">
            <el-empty :description="historyVersionFilter ? '该版本暂无生成记录' : '暂无生成记录'" :image-size="60" />
          </div>
          <div v-else class="run-history-list">
            <div
              v-for="run in filteredPrdRuns"
              :key="run.id"
              class="run-history-item"
              :class="{ active: activeRun?.id === run.id }"
              @click="runStore.selectRun(run.id)"
            >
              <div class="run-history-main">
                <el-tag size="small" effect="plain">{{ formatModelName(run.model) }}</el-tag>
                <el-tag v-if="run.specVersionId && getSpecVersionLabel(run.specVersionId)" size="small" type="warning" effect="plain">
                  {{ getSpecVersionLabel(run.specVersionId) }}
                </el-tag>
                <span class="run-time">{{ new Date(run.createdAt).toLocaleString('zh-CN') }}</span>
              </div>
              <div class="run-history-stats">
                {{ run.result?.events?.length ?? 0 }} 事件
              </div>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </template>

    <DelperImportDialog
      :visible="showDelperImport"
      :events="result?.events ?? []"
      :prd-filename="activePrd?.filename"
      :func-version="result?.conventions?.feature_id"
      @close="showDelperImport = false"
      @imported="showDelperImport = false"
    />
  </div>
</template>

<style scoped>
.panel { flex: 1; min-height: 0; overflow: auto; padding: 20px; }

.generate-placeholder {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  height: 100%; gap: 12px; color: var(--text-tertiary); text-align: center;
}
.generate-placeholder h3 { margin: 8px 0 0; font-size: 15px; color: var(--text-primary); font-weight: 600; }
.generate-placeholder p { margin: 0; font-size: 13px; color: var(--text-tertiary); }

/* ── 生成等待 ── */
.gen-stage { display: flex; flex-direction: column; align-items: center; gap: 24px; padding: 32px 0; }

.gen-steps { display: flex; align-items: center; }
.gen-step { display: flex; flex-direction: column; align-items: center; gap: 6px; width: 56px; }
.gen-step span { font-size: 11px; color: var(--text-tertiary); transition: color 0.3s; }
.gen-step.active span { color: var(--accent); font-weight: 600; }
.gen-step.done span { color: var(--success); }

.gen-step-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--border-light); transition: all 0.3s; }
.gen-step.active .gen-step-dot { background: var(--accent); box-shadow: 0 0 0 4px rgba(79,110,247,0.12); }
.gen-step.done .gen-step-dot { background: var(--success); box-shadow: none; }

@keyframes stepPulse {
  0%, 100% { box-shadow: 0 0 0 4px rgba(79,110,247,0.12); }
  50% { box-shadow: 0 0 0 8px rgba(79,110,247,0.06); }
}
.gen-step.active:not(.done) .gen-step-dot { animation: stepPulse 2s ease-in-out infinite; }

.gen-step-line { width: 48px; height: 2px; background: var(--border-light); margin-bottom: 20px; transition: background 0.3s; }
.gen-step-line.filled { background: var(--success); }

.gen-visual { margin: 4px 0; }
.gen-ring { position: relative; width: 80px; height: 80px; }
.gen-ring svg { width: 100%; height: 100%; transform: rotate(-90deg); }
.gen-ring-progress { transition: stroke-dashoffset 0.6s ease; }
.gen-ring circle:first-child { stroke: var(--border-light); }
.gen-ring circle:last-child { stroke: var(--accent); }
.gen-ring-time {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  font-size: 15px; font-weight: 700; color: var(--text-primary); font-variant-numeric: tabular-nums;
}

.gen-stage-title { margin: 0; font-size: 15px; font-weight: 600; color: var(--text-primary); }
.gen-stage-detail { margin: 0; font-size: 13px; color: var(--text-tertiary); text-align: center; line-height: 1.6; }
.gen-stage-metric {
  display: inline-block; padding: 1px 8px; background: var(--accent-light); border-radius: 4px;
  color: var(--accent); font-weight: 500; font-size: 12px; margin-left: 4px; font-variant-numeric: tabular-nums;
}

.result-toolbar { margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid var(--border-subtle); }
.toolbar-actions { display: flex; justify-content: flex-end; gap: 8px; }

.review-card { margin-bottom: 16px; }
.review-header { display: flex; align-items: center; justify-content: space-between; }
.review-title { font-weight: 600; font-size: 14px; }
.review-summary { color: var(--text-secondary); margin: 0 0 12px; line-height: 1.6; }
.review-section { margin-bottom: 12px; }
.review-section h5 { margin: 0 0 8px; color: var(--text-primary); }

.section { margin-bottom: 16px; }
.section h4 { margin: 0 0 8px; }

.raw {
  margin: 0; white-space: pre-wrap; word-break: break-word;
  font-size: 12px; line-height: 1.6; background: var(--bg-hover);
  padding: 16px; border-radius: var(--radius-sm); max-height: 60vh; overflow: auto;
}

.history-filter {
  display: flex; align-items: center; gap: 8px; margin-bottom: 12px;
  padding: 8px 12px; background: var(--bg-hover); border-radius: var(--radius-sm);
}
.filter-label { font-size: 13px; color: var(--text-secondary); white-space: nowrap; }

.run-history-list { display: flex; flex-direction: column; gap: 2px; }
.run-history-item {
  padding: 10px 12px; border-radius: var(--radius-sm); cursor: pointer;
  display: flex; align-items: center; justify-content: space-between;
  transition: all 0.12s;
}
.run-history-item:hover { background: var(--bg-hover); }
.run-history-item.active { background: var(--accent-light); }
.run-history-main { display: flex; align-items: center; gap: 8px; }
.run-time { font-size: 12px; color: var(--text-tertiary); }
.run-history-stats { font-size: 12px; color: var(--text-secondary); font-weight: 600; }
</style>
