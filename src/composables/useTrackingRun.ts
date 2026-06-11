import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { usePrdStore } from '../stores/prdStore'
import { useRunStore } from '../stores/runStore'
import { useSkillStore } from '../stores/skillStore'
import { useSettingsStore } from '../stores/settingsStore'
import { parseTrackingOutput } from '../utils/outputParser'
import { buildCursorPrompt, buildTrackingMessages } from '../utils/skillParser'
import { chatCompletion, type StreamProgress } from '../api/aiClient'

export function useTrackingRun() {
  const prdStore = usePrdStore()
  const skillStore = useSkillStore()
  const runStore = useRunStore()
  const settingsStore = useSettingsStore()

  let businessSpecRaw = ''
  let currentSpecVersionId = ''
  let currentSpecMode: 'overlay' | 'standalone' = 'overlay'
  let abortController: AbortController | null = null

  const streamProgress = ref<StreamProgress>({ phase: 'connecting', contentLength: 0, reasoningLength: 0 })
  const elapsedSeconds = ref(0)
  let elapsedTimer: ReturnType<typeof setInterval> | null = null

  function setBusinessSpec(raw: string) {
    businessSpecRaw = raw
  }

  function setSpecVersionId(id: string) {
    currentSpecVersionId = id
  }

  function setSpecMode(mode: 'overlay' | 'standalone') {
    currentSpecMode = mode
  }

  function getSkillRaw(useDraftSkill: boolean) {
    return useDraftSkill ? skillStore.draftRaw : skillStore.activeSkill?.raw
  }

  function validateInputs(useDraftSkill: boolean) {
    const prd = prdStore.activeDoc()
    if (!prd) {
      ElMessage.warning('请先上传或选择 PRD 文档')
      return null
    }
    const skillRaw = getSkillRaw(useDraftSkill)
    if (!skillRaw) {
      ElMessage.warning('Skill 内容为空')
      return null
    }
    return { prd, skillRaw }
  }

  function buildPrompt(useDraftSkill = true): string | null {
    const input = validateInputs(useDraftSkill)
    if (!input) return null
    return buildCursorPrompt(input.skillRaw, input.prd.rawText, runStore.feedback)
  }

  async function copyPromptForCursor(useDraftSkill = true) {
    const prompt = buildPrompt(useDraftSkill)
    if (!prompt) return

    try {
      await navigator.clipboard.writeText(prompt)
      ElMessage.success('Prompt 已复制，请粘贴到 Cursor 对话中发送')
    } catch {
      ElMessage.error('复制失败，请检查浏览器剪贴板权限')
    }
  }

  function importCursorResponse(rawResponse: string, useDraftSkill = true) {
    const input = validateInputs(useDraftSkill)
    if (!input) return false

    const trimmed = rawResponse.trim()
    if (!trimmed) {
      ElMessage.warning('请粘贴 Cursor 的回复内容')
      return false
    }

    runStore.setError(null)
    const result = parseTrackingOutput(trimmed)

    runStore.addRecord({
      prdId: input.prd.id,
      skillVersionId: skillStore.activeVersionId,
      model: 'cursor',
      result,
      rawResponse: trimmed,
      specVersionId: currentSpecVersionId || undefined,
      specMode: currentSpecMode,
    })

    ElMessage.success('已导入 Cursor 回复并解析展示')
    return true
  }

  function startTimer() {
    elapsedSeconds.value = 0
    elapsedTimer = setInterval(() => { elapsedSeconds.value++ }, 1000)
  }

  function stopTimer() {
    if (elapsedTimer) { clearInterval(elapsedTimer); elapsedTimer = null }
  }

  function abort() {
    if (abortController) {
      abortController.abort()
      abortController = null
      stopTimer()
      runStore.setGenerating(false)
      ElMessage.info('已终止生成')
    }
  }

  async function generateWithAI(useDraftSkill = true) {
    const input = validateInputs(useDraftSkill)
    if (!input) return false

    const settings = settingsStore.settings
    if (!settings.token) {
      ElMessage.error('请先配置 AI Gateway Token（在设置中配置）')
      return false
    }

    abortController = new AbortController()
    streamProgress.value = { phase: 'connecting', contentLength: 0, reasoningLength: 0 }
    runStore.setGenerating(true)
    runStore.setError(null)
    startTimer()

    try {
      const messages = buildTrackingMessages(
        input.skillRaw, input.prd.rawText, runStore.feedback,
        businessSpecRaw || undefined, currentSpecMode,
      )
      const rawResponse = await chatCompletion(settings, messages, {
        signal: abortController.signal,
        onProgress: (p) => { streamProgress.value = p },
      })

      const result = parseTrackingOutput(rawResponse)

      runStore.addRecord({
        prdId: input.prd.id,
        skillVersionId: skillStore.activeVersionId,
        model: settings.model,
        result,
        rawResponse,
        specVersionId: currentSpecVersionId || undefined,
        specMode: currentSpecMode,
      })

      ElMessage.success('埋点方案已生成')
      return true
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return false
      const msg = e instanceof Error ? e.message : '生成失败'
      runStore.setError(msg)
      ElMessage.error(msg)
      return false
    } finally {
      abortController = null
      stopTimer()
      runStore.setGenerating(false)
    }
  }

  return {
    buildPrompt, copyPromptForCursor, importCursorResponse, generateWithAI,
    setBusinessSpec, setSpecVersionId, setSpecMode,
    abort, streamProgress, elapsedSeconds,
  }
}
