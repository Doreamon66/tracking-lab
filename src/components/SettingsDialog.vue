<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useSettingsStore } from '../stores/settingsStore'

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{ close: [] }>()

const settingsStore = useSettingsStore()
const model = ref(settingsStore.settings.model)
const token = ref(settingsStore.settings.token)
const specDir = ref('')
const specDirLoading = ref(false)
const delperUid = ref('')
const delperApiKey = ref('')
const delperTesting = ref(false)

const modelGroups = [
  { group: 'OpenAI', options: [
    { label: 'GPT-5.4', value: 'azure/gpt-5.4' },
  ]},
  { group: 'Qwen (阿里)', options: [
    { label: 'Qwen Plus Latest (Qwen3-235B)', value: 'ali/qwen-plus-latest' },
    { label: 'Qwen Max', value: 'ali/qwen-max' },
    { label: 'Qwen Plus', value: 'ali/qwen-plus' },
    { label: 'QwQ Plus (推理，仅流式)', value: 'ali/qwq-plus' },
  ]},
  { group: 'DeepSeek', options: [
    { label: 'DeepSeek V4 Flash', value: 'deepseek/deepseek-v4-flash' },
    { label: 'DeepSeek V3.2', value: 'deepseek/deepseek-v3.2' },
    { label: 'DeepSeek V3.1 (AWS)', value: 'deepseek/deepseek-v3.1-aws' },
  ]},
  { group: '智谱 GLM', options: [
    { label: 'GLM-5.1', value: 'zhipu/glm-5.1' },
    { label: 'GLM-5 Turbo', value: 'zhipu/glm-5-turbo' },
  ]},
  { group: '豆包', options: [
    { label: 'Doubao Seed 2.0 Pro', value: 'doubao/Doubao-Seed-2.0-pro' },
    { label: 'Doubao Seed 2.0 Mini', value: 'doubao/Doubao-Seed-2.0-mini' },
    { label: 'Doubao Seed 1.8', value: 'doubao/Doubao-Seed-1.8' },
  ]},
  { group: 'Kimi', options: [
    { label: 'Kimi K2.5', value: 'moonshot/kimi-k2.5' },
  ]},
]

watch(
  () => props.visible,
  async (v) => {
    if (v) {
      await settingsStore.loadFromServer()
      model.value = settingsStore.settings.model
      token.value = settingsStore.settings.token
      try {
        const resp = await fetch('/api/config')
        const data = await resp.json()
        specDir.value = data.specDir ?? 'tracking-design'
        delperUid.value = data.delperUid ?? ''
        delperApiKey.value = data.delperApiKey ?? ''
      } catch { /* ignore */ }
    }
  },
)

async function testDelper() {
  delperTesting.value = true
  try {
    const resp = await fetch('/api/delper/test')
    const data = await resp.json()
    if (data.ok) ElMessage.success('Delper 连接成功')
    else ElMessage.error(data.error || '连接失败')
  } catch { ElMessage.error('连接失败') }
  finally { delperTesting.value = false }
}

async function save() {
  settingsStore.save({ ...settingsStore.settings, model: model.value, token: token.value })

  specDirLoading.value = true
  try {
    const payload: Record<string, any> = {}
    if (specDir.value.trim()) payload.specDir = specDir.value.trim()
    if (delperUid.value !== undefined) payload.delperUid = delperUid.value.trim()
    if (delperApiKey.value !== undefined) payload.delperApiKey = delperApiKey.value.trim()

    const resp = await fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!resp.ok) {
      const data = await resp.json()
      ElMessage.error(data.error || '保存失败')
      return
    }
  } catch (e) {
    ElMessage.error('保存失败')
    return
  } finally {
    specDirLoading.value = false
  }

  ElMessage.success('设置已保存')
  emit('close')
}
</script>

<template>
  <el-dialog :model-value="visible" title="平台设置" width="480px" @close="emit('close')">
    <el-form label-width="90px">
      <el-form-item label="AI Token">
        <el-input v-model="token" type="password" show-password placeholder="AI Gateway Token" />
      </el-form-item>
      <el-form-item label="AI 模型">
        <el-select v-model="model" style="width: 100%" filterable>
          <el-option-group v-for="g in modelGroups" :key="g.group" :label="g.group">
            <el-option v-for="opt in g.options" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-option-group>
        </el-select>
      </el-form-item>
      <el-form-item label="规范目录">
        <el-input v-model="specDir" placeholder="如 tracking-design" />
        <div class="setting-hint">
          相对于项目根目录。该目录下应包含 SKILL.md（主规范）和 references/ 子目录
        </div>
      </el-form-item>

      <el-divider content-position="left">Delper 埋点平台</el-divider>

      <el-form-item label="UID">
        <el-input v-model="delperUid" placeholder="Delper 用户 ID" />
      </el-form-item>
      <el-form-item label="API Key">
        <el-input v-model="delperApiKey" type="password" show-password placeholder="Delper API Key" />
        <div class="setting-hint">
          在 Delper 平台个人设置中获取，用于一键导入埋点方案
        </div>
      </el-form-item>
      <el-form-item>
        <el-button :loading="delperTesting" @click="testDelper" size="small">
          测试连接
        </el-button>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="emit('close')">取消</el-button>
      <el-button type="primary" :loading="specDirLoading" @click="save">保存</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.setting-hint { font-size: 12px; color: var(--text-tertiary); margin-top: 4px; line-height: 1.5; }
</style>
