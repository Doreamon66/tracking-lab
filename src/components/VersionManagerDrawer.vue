<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { EditPen, Promotion } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useRunStore } from '../stores/runStore'
import MarkdownView from './MarkdownView.vue'

interface SpecVersion {
  id: string
  version: number
  content: string
  note: string
  created_at: number
  file_path: string
}

const props = defineProps<{
  visible: boolean
  skillName: string
  filePath: string
  specVersions: SpecVersion[]
  selectedVersionId: string
}>()

const emit = defineEmits<{
  'update:visible': [val: boolean]
  'select-version': [id: string]
  'open-editor': []
  'open-skill': []
}>()

const runStore = useRunStore()

const compareMode = ref(false)
const compareA = ref('')
const compareB = ref('')
const compareTab = ref<'content' | 'result'>('content')

watch(() => props.visible, (v) => {
  if (!v) {
    compareMode.value = false
    compareA.value = ''
    compareB.value = ''
  }
})

function selectForCompare(id: string) {
  if (compareA.value === id) { compareA.value = ''; return }
  if (compareB.value === id) { compareB.value = ''; return }
  if (!compareA.value) { compareA.value = id; return }
  if (!compareB.value) { compareB.value = id; return }
  compareA.value = compareB.value
  compareB.value = id
}

function getRunCountForVersion(versionId: string) {
  return runStore.records.filter(r => r.specVersionId === versionId).length
}

function getLatestRunForVersion(versionId: string) {
  const runs = runStore.records.filter(r => r.specVersionId === versionId)
  return runs.length ? runs[0] : null
}

async function publishSpecToFile(sv: SpecVersion) {
  try {
    const resp = await fetch('/api/spec-write', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: sv.file_path, content: sv.content }),
    })
    if (resp.ok) {
      ElMessage.success(`v${sv.version} 已发布到文件`)
    } else {
      ElMessage.error('发布失败')
    }
  } catch {
    ElMessage.error('发布失败')
  }
}

function formatTime(ts: string | number) {
  return new Date(ts).toLocaleString('zh-CN')
}

function handleVersionClick(sv: SpecVersion) {
  if (compareMode.value) {
    selectForCompare(sv.id)
  } else {
    emit('select-version', sv.id)
  }
}

const versionA = computed(() => props.specVersions.find(v => v.id === compareA.value))
const versionB = computed(() => props.specVersions.find(v => v.id === compareB.value))
const selectedVersion = computed(() => props.specVersions.find(v => v.id === props.selectedVersionId))
</script>

<template>
  <el-drawer
    :model-value="visible"
    title="规范版本管理"
    size="85%"
    @update:model-value="emit('update:visible', $event)"
  >
    <template #header>
      <div class="drawer-header">
        <div class="drawer-header-info">
          <h3>{{ skillName }}</h3>
          <span class="drawer-path">{{ filePath }}</span>
        </div>
        <div class="drawer-header-actions">
          <el-button :icon="EditPen" type="primary" size="small" @click="emit('open-editor')">编辑规范</el-button>
          <el-button :icon="EditPen" size="small" @click="emit('open-skill')">通用规范</el-button>
        </div>
      </div>
    </template>

    <div class="ver-mgr-body">
      <div class="ver-mgr-list">
        <div class="ver-mgr-list-hd">
          <h4>版本历史</h4>
          <el-switch v-model="compareMode" active-text="对比" inactive-text="" size="small" style="margin-left: auto" />
        </div>
        <div v-if="compareMode" class="compare-hint">选择两个版本进行对比</div>
        <el-empty v-if="!specVersions.length" description="暂无版本，点击「编辑规范」创建第一个版本" :image-size="60" />
        <div v-else class="ver-list">
          <div
            v-for="sv in specVersions"
            :key="sv.id"
            class="ver-item"
            :class="{
              active: !compareMode && selectedVersionId === sv.id,
              'compare-a': compareMode && compareA === sv.id,
              'compare-b': compareMode && compareB === sv.id,
            }"
            @click="handleVersionClick(sv)"
          >
            <div class="ver-item-top">
              <el-tag v-if="compareMode && compareA === sv.id" size="small" type="danger" effect="dark">A</el-tag>
              <el-tag v-else-if="compareMode && compareB === sv.id" size="small" type="success" effect="dark">B</el-tag>
              <span class="ver-label">v{{ sv.version }}</span>
              <span class="ver-note">{{ sv.note || '未命名' }}</span>
              <el-tag v-if="!compareMode && selectedVersionId === sv.id" size="small" type="success" effect="plain">当前使用</el-tag>
              <span v-if="getRunCountForVersion(sv.id) > 0" class="ver-runs">{{ getRunCountForVersion(sv.id) }} 次生成</span>
            </div>
            <div class="ver-item-bottom">
              <span class="ver-time">{{ formatTime(sv.created_at) }}</span>
              <el-button
                v-if="!compareMode"
                type="primary"
                size="small"
                :icon="Promotion"
                plain
                @click.stop="publishSpecToFile(sv)"
              >
                发布到文件
              </el-button>
            </div>
          </div>
        </div>
      </div>

      <!-- 普通预览模式 -->
      <div v-if="!compareMode" class="ver-mgr-preview">
        <div class="ver-mgr-preview-hd">
          <h4>版本内容预览</h4>
          <el-tag v-if="selectedVersion" size="small" effect="plain">v{{ selectedVersion.version }}</el-tag>
        </div>
        <div v-if="selectedVersion" class="ver-mgr-preview-body">
          <MarkdownView :content="selectedVersion.content" />
        </div>
        <el-empty v-else description="选择左侧版本查看内容" :image-size="60" />
      </div>

      <!-- 对比模式 -->
      <div v-else class="ver-mgr-compare">
        <template v-if="compareA && compareB">
          <el-tabs v-model="compareTab">
            <el-tab-pane label="规范内容对比" name="content" />
            <el-tab-pane label="生成结果对比" name="result" />
          </el-tabs>

          <div v-if="compareTab === 'content'" class="compare-panels">
            <div class="compare-panel">
              <div class="compare-panel-hd compare-panel-hd-a">
                <el-tag type="danger" size="small" effect="dark">A</el-tag>
                v{{ versionA?.version }} - {{ versionA?.note || '未命名' }}
              </div>
              <div class="compare-panel-body">
                <MarkdownView :content="versionA?.content || ''" />
              </div>
            </div>
            <div class="compare-panel">
              <div class="compare-panel-hd compare-panel-hd-b">
                <el-tag type="success" size="small" effect="dark">B</el-tag>
                v{{ versionB?.version }} - {{ versionB?.note || '未命名' }}
              </div>
              <div class="compare-panel-body">
                <MarkdownView :content="versionB?.content || ''" />
              </div>
            </div>
          </div>

          <div v-if="compareTab === 'result'" class="compare-panels">
            <div class="compare-panel">
              <div class="compare-panel-hd compare-panel-hd-a">
                <el-tag type="danger" size="small" effect="dark">A</el-tag>
                v{{ versionA?.version }} 的生成结果
              </div>
              <div class="compare-panel-body">
                <template v-if="getLatestRunForVersion(compareA)">
                  <div class="compare-run-meta">
                    <el-tag size="small" effect="plain">{{ getLatestRunForVersion(compareA)!.model }}</el-tag>
                    <span>{{ formatTime(getLatestRunForVersion(compareA)!.createdAt) }}</span>
                    <span>{{ getLatestRunForVersion(compareA)!.result?.events?.length ?? 0 }} 个事件</span>
                  </div>
                  <MarkdownView :content="getLatestRunForVersion(compareA)!.rawResponse" />
                </template>
                <el-empty v-else description="该版本暂无生成记录" :image-size="40" />
              </div>
            </div>
            <div class="compare-panel">
              <div class="compare-panel-hd compare-panel-hd-b">
                <el-tag type="success" size="small" effect="dark">B</el-tag>
                v{{ versionB?.version }} 的生成结果
              </div>
              <div class="compare-panel-body">
                <template v-if="getLatestRunForVersion(compareB)">
                  <div class="compare-run-meta">
                    <el-tag size="small" effect="plain">{{ getLatestRunForVersion(compareB)!.model }}</el-tag>
                    <span>{{ formatTime(getLatestRunForVersion(compareB)!.createdAt) }}</span>
                    <span>{{ getLatestRunForVersion(compareB)!.result?.events?.length ?? 0 }} 个事件</span>
                  </div>
                  <MarkdownView :content="getLatestRunForVersion(compareB)!.rawResponse" />
                </template>
                <el-empty v-else description="该版本暂无生成记录" :image-size="40" />
              </div>
            </div>
          </div>
        </template>
        <el-empty v-else description="请在左侧选择两个版本进行对比" :image-size="80" />
      </div>
    </div>
  </el-drawer>
</template>

<style scoped>
.drawer-header { display: flex; align-items: center; justify-content: space-between; width: 100%; }
.drawer-header-info h3 { margin: 0 0 2px; font-size: 15px; font-weight: 700; }
.drawer-path { font-size: 12px; color: var(--text-tertiary); font-family: Consolas, monospace; }
.drawer-header-actions { display: flex; gap: 8px; }

.ver-mgr-body { display: flex; height: 100%; overflow: hidden; }

.ver-mgr-list {
  width: 320px; flex-shrink: 0; border-right: 1px solid var(--border-subtle);
  overflow-y: auto; padding: 16px;
}
.ver-mgr-list-hd { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.ver-mgr-list-hd h4 { margin: 0; font-size: 14px; font-weight: 600; }

.compare-hint {
  font-size: 12px; color: var(--text-secondary); margin-bottom: 8px;
  padding: 6px 10px; background: #fef7e0; border-radius: var(--radius-sm);
}

.ver-list { display: flex; flex-direction: column; gap: 6px; }

.ver-item {
  padding: 10px 12px; border-radius: var(--radius-sm);
  border: 1px solid var(--border-light); cursor: pointer; transition: all 0.12s;
}
.ver-item:hover { border-color: var(--accent); background: var(--bg-hover); }
.ver-item.active { border-color: var(--accent); background: var(--accent-light); }
.ver-item.compare-a { background: #fce8e6; border-color: var(--danger); }
.ver-item.compare-b { background: #e6f5ea; border-color: var(--success); }

.ver-item-top { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; flex-wrap: wrap; }
.ver-label { font-weight: 600; font-size: 13px; }
.ver-note { font-size: 12px; color: var(--text-secondary); }
.ver-runs { font-size: 11px; color: var(--text-tertiary); margin-left: auto; }

.ver-item-bottom { display: flex; align-items: center; justify-content: space-between; }
.ver-time { font-size: 11px; color: var(--text-tertiary); }

.ver-mgr-preview { flex: 1; overflow-y: auto; padding: 16px; background: var(--bg-primary); }
.ver-mgr-preview-hd { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.ver-mgr-preview-hd h4 { margin: 0; font-size: 14px; font-weight: 600; }
.ver-mgr-preview-body {
  background: var(--bg-card); border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm); padding: 16px;
}

.ver-mgr-compare { flex: 1; overflow: hidden; display: flex; flex-direction: column; padding: 0 16px 16px; }
.ver-mgr-compare :deep(.el-tabs__header) { margin-bottom: 12px; }

.compare-panels { flex: 1; display: flex; gap: 12px; overflow: hidden; }
.compare-panel {
  flex: 1; display: flex; flex-direction: column; overflow: hidden;
  border: 1px solid var(--border-light); border-radius: var(--radius-sm);
}
.compare-panel-hd {
  padding: 8px 12px; font-size: 13px; font-weight: 600;
  display: flex; align-items: center; gap: 6px; flex-shrink: 0; border-bottom: 1px solid var(--border-subtle);
}
.compare-panel-hd-a { background: #fce8e6; }
.compare-panel-hd-b { background: #e6f5ea; }
.compare-panel-body { flex: 1; overflow: auto; padding: 12px; }

.compare-run-meta { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-size: 12px; color: var(--text-tertiary); }
</style>
