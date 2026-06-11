<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { v4 as uuid } from 'uuid'
import { ElMessage } from 'element-plus'

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
  filePath: string
  title: string
}>()

const emit = defineEmits<{
  close: []
  saved: [version: SpecVersion]
}>()

const versions = ref<SpecVersion[]>([])
const activeVersionId = ref<string>('')
const draftContent = ref('')
const loading = ref(false)
const versionNote = ref('')

const activeVersion = computed(() =>
  versions.value.find(v => v.id === activeVersionId.value) ?? versions.value[0] ?? null
)

watch(() => props.visible, async (v) => {
  if (v && props.filePath) {
    await loadVersions()
    await loadFileContent()
  }
})

async function loadVersions() {
  loading.value = true
  try {
    const resp = await fetch(`/api/spec-versions?file=${encodeURIComponent(props.filePath)}`)
    versions.value = await resp.json()
    if (versions.value.length && !activeVersionId.value) {
      activeVersionId.value = versions.value[0].id
      draftContent.value = versions.value[0].content
    }
  } catch { /* ignore */ } finally {
    loading.value = false
  }
}

async function loadFileContent() {
  try {
    const resp = await fetch(`/api/spec-content?path=${encodeURIComponent(props.filePath)}`)
    const data = await resp.json()
    const fileContent = data.content ?? ''
    if (!versions.value.length || versions.value[0].content !== fileContent) {
      const ver: SpecVersion = {
        id: uuid(),
        version: (versions.value[0]?.version ?? 0) + 1,
        content: fileContent,
        note: '从文件加载',
        created_at: Date.now(),
        file_path: props.filePath,
      }
      versions.value.unshift(ver)
      activeVersionId.value = ver.id
      draftContent.value = fileContent
      await persistVersion(ver)
    } else if (!draftContent.value) {
      draftContent.value = fileContent
    }
  } catch { /* ignore */ }
}

async function persistVersion(ver: SpecVersion) {
  await fetch('/api/spec-versions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: ver.id,
      version: ver.version,
      content: ver.content,
      note: ver.note,
      file_path: ver.file_path,
    }),
  }).catch(() => {})
}

function selectVersion(id: string) {
  activeVersionId.value = id
  const ver = versions.value.find(v => v.id === id)
  if (ver) draftContent.value = ver.content
}

async function saveAsNewVersion() {
  const note = versionNote.value.trim() || undefined
  const nextVersion = (versions.value[0]?.version ?? 0) + 1
  const ver: SpecVersion = {
    id: uuid(),
    version: nextVersion,
    content: draftContent.value,
    note: note ?? `v${nextVersion}`,
    created_at: Date.now(),
    file_path: props.filePath,
  }
  versions.value.unshift(ver)
  activeVersionId.value = ver.id
  await persistVersion(ver)
  versionNote.value = ''
  ElMessage.success(`已保存为 v${nextVersion}`)
  emit('saved', ver)
}

function resetDraft() {
  draftContent.value = activeVersion.value?.content ?? ''
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleString('zh-CN')
}
</script>

<template>
  <el-drawer
    :model-value="visible"
    :title="title || '规范编辑器'"
    size="70%"
    direction="rtl"
    @close="emit('close')"
  >
    <template #header>
      <div class="drawer-header">
        <div>
          <div class="drawer-title">{{ title || '规范编辑器' }}</div>
          <div class="drawer-subtitle">{{ filePath }}</div>
        </div>
      </div>
    </template>

    <div class="drawer-body">
      <div class="toolbar">
        <div class="toolbar-left">
          <span class="toolbar-label">版本：</span>
          <el-select
            :model-value="activeVersionId"
            style="width: 260px"
            @change="(id: string) => selectVersion(id)"
          >
            <el-option
              v-for="v in versions"
              :key="v.id"
              :label="`v${v.version} - ${v.note ?? '未命名'}`"
              :value="v.id"
            />
          </el-select>
        </div>
        <div class="toolbar-right">
          <el-button @click="resetDraft">重置</el-button>
          <el-button @click="loadFileContent" :loading="loading">从文件重新加载</el-button>
        </div>
      </div>

      <el-input
        v-model="draftContent"
        type="textarea"
        class="editor"
        placeholder="编辑规范内容..."
      />

      <div class="footer">
        <el-input v-model="versionNote" placeholder="版本备注（可选）" size="default" style="width: 200px" />
        <el-button type="success" @click="saveAsNewVersion">保存为新版本</el-button>
        <span class="footer-hint">仅存入数据库，发布到文件请到「Skill 版本管理」</span>
      </div>

      <div class="version-list" v-if="versions.length > 1">
        <div class="version-title">版本历史</div>
        <el-timeline>
          <el-timeline-item
            v-for="v in versions"
            :key="v.id"
            :timestamp="formatTime(v.created_at)"
            placement="top"
          >
            <div
              class="version-item"
              :class="{ active: activeVersionId === v.id }"
              @click="selectVersion(v.id)"
            >
              <span class="version-label">v{{ v.version }}</span>
              <span class="version-note">{{ v.note ?? '未命名' }}</span>
            </div>
          </el-timeline-item>
        </el-timeline>
      </div>
    </div>
  </el-drawer>
</template>

<style scoped>
.drawer-header { display: flex; align-items: center; justify-content: space-between; }
.drawer-title { font-size: 15px; font-weight: 700; }
.drawer-subtitle { font-size: 11px; color: var(--text-tertiary); margin-top: 2px; font-family: Consolas, monospace; }

.drawer-body { display: flex; flex-direction: column; height: 100%; gap: 12px; padding: 16px; }

.toolbar { display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
.toolbar-left, .toolbar-right { display: flex; align-items: center; gap: 8px; }
.toolbar-label { font-size: 13px; color: var(--text-secondary); white-space: nowrap; }

.editor { flex: 1; min-height: 0; }
.editor :deep(textarea) {
  height: 100% !important; font-family: Consolas, 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 13px; line-height: 1.6; resize: none;
}
.editor :deep(.el-textarea__inner) { height: 100%; border-radius: var(--radius-sm); }

.footer {
  display: flex; align-items: center; gap: 8px;
  flex-shrink: 0; padding-top: 8px; border-top: 1px solid var(--border-subtle);
}
.footer-hint { font-size: 11px; color: var(--text-tertiary); margin-left: 4px; }

.version-list { flex-shrink: 0; max-height: 200px; overflow: auto; border-top: 1px solid var(--border-subtle); padding-top: 12px; }
.version-title { font-weight: 600; font-size: 13px; margin-bottom: 8px; }

.version-item { cursor: pointer; padding: 4px 8px; border-radius: var(--radius-sm); display: flex; align-items: center; gap: 8px; transition: all 0.12s; }
.version-item:hover { background: var(--bg-hover); }
.version-item.active { background: var(--accent-light); color: var(--accent); }
.version-label { font-weight: 600; font-size: 13px; min-width: 32px; }
.version-note { font-size: 12px; color: var(--text-tertiary); }
</style>
