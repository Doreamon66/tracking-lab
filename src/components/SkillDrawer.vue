<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete } from '@element-plus/icons-vue'
import { useSkillStore } from '../stores/skillStore'

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{ close: [] }>()

const skillStore = useSkillStore()
const versionNote = ref('')
const saving = ref(false)

onMounted(() => {
  if (!skillStore.versions.length) {
    skillStore.loadFromServer()
  }
})

watch(() => props.visible, (v) => {
  if (v && !skillStore.draftRaw) {
    skillStore.loadFromServer()
  }
})

async function saveVersion() {
  const note = versionNote.value.trim() || undefined
  skillStore.saveAsNewVersion(note)
  versionNote.value = ''
  ElMessage.success('已保存为新版本')
}

async function saveToFile() {
  saving.value = true
  try {
    const ok = await skillStore.saveToFile()
    if (ok) {
      skillStore.saveAsNewVersion('保存到文件')
      ElMessage.success('已保存到 SKILL.md 文件')
    } else {
      ElMessage.error('保存失败')
    }
  } finally {
    saving.value = false
  }
}

async function deleteVersion(id: string, label: string) {
  try {
    await ElMessageBox.confirm(`确定删除版本 ${label}？`, '删除确认', { type: 'warning' })
    skillStore.deleteVersion(id)
    ElMessage.success('已删除')
  } catch { /* cancelled */ }
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleString('zh-CN')
}
</script>

<template>
  <el-drawer
    :model-value="visible"
    title="埋点 Skill 编辑器"
    size="70%"
    direction="rtl"
    @close="emit('close')"
  >
    <template #header>
      <div class="drawer-header">
        <div>
          <div class="drawer-title">埋点 Skill 编辑器</div>
          <div class="drawer-subtitle" v-if="skillStore.filePath">
            {{ skillStore.filePath }}
          </div>
        </div>
      </div>
    </template>

    <div class="drawer-body">
      <div class="toolbar">
        <div class="toolbar-left">
          <span class="toolbar-label">版本：</span>
          <el-select
            :model-value="skillStore.activeVersionId"
            style="width: 240px"
            @change="(id: string) => skillStore.selectVersion(id)"
          >
            <el-option
              v-for="v in skillStore.versions"
              :key="v.id"
              :label="`v${v.version} - ${v.note ?? '未命名'}`"
              :value="v.id"
            />
          </el-select>
          <el-button text type="danger" :icon="Delete" v-if="skillStore.versions.length > 1"
            @click="deleteVersion(skillStore.activeVersionId, `v${skillStore.activeSkill?.version}`)">
          </el-button>
        </div>
        <div class="toolbar-right">
          <el-button @click="skillStore.resetDraft">重置</el-button>
          <el-button @click="skillStore.loadFromServer" :loading="skillStore.loading">从文件重新加载</el-button>
        </div>
      </div>

      <el-input
        v-model="skillStore.draftRaw"
        type="textarea"
        class="editor"
        placeholder="编辑 Skill Markdown..."
      />

      <div class="footer">
        <div class="footer-left">
          <el-input v-model="versionNote" placeholder="版本备注（可选）" size="default" style="width: 200px" />
          <el-button type="info" @click="saveVersion">保存为新版本</el-button>
        </div>
        <el-button type="primary" :loading="saving" @click="saveToFile">
          保存到文件
        </el-button>
      </div>

      <!-- 版本历史 -->
      <div class="version-list" v-if="skillStore.versions.length > 1">
        <div class="version-title">版本历史</div>
        <el-timeline>
          <el-timeline-item
            v-for="v in skillStore.versions"
            :key="v.id"
            :timestamp="formatTime(v.createdAt)"
            placement="top"
          >
            <div
              class="version-item"
              :class="{ active: skillStore.activeVersionId === v.id }"
              @click="skillStore.selectVersion(v.id)"
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
  display: flex; align-items: center; justify-content: space-between;
  flex-shrink: 0; padding-top: 8px; border-top: 1px solid var(--border-subtle);
}
.footer-left { display: flex; align-items: center; gap: 8px; }

.version-list { flex-shrink: 0; max-height: 200px; overflow: auto; border-top: 1px solid var(--border-subtle); padding-top: 12px; }
.version-title { font-weight: 600; font-size: 13px; margin-bottom: 8px; }

.version-item { cursor: pointer; padding: 4px 8px; border-radius: var(--radius-sm); display: flex; align-items: center; gap: 8px; transition: all 0.12s; }
.version-item:hover { background: var(--bg-hover); }
.version-item.active { background: var(--accent-light); color: var(--accent); }
.version-label { font-weight: 600; font-size: 13px; min-width: 32px; }
.version-note { font-size: 12px; color: var(--text-tertiary); }
</style>
