import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useRunStore } from '../stores/runStore'
import { useSettingsStore } from '../stores/settingsStore'
import { usePrdStore } from '../stores/prdStore'
import { chatCompletion } from '../api/aiClient'
import type { ChatMessage, ReviewResult } from '../types'

const REVIEW_SYSTEM_PROMPT = `你是一位资深的数据埋点方案评审专家。你需要审查给定的埋点方案，从以下维度进行评估：

## 审查维度

1. **完整性**：是否覆盖了 PRD 中所有关键交互（页面展示、核心点击、转化路径、异常路径）
2. **命名规范**：事件 ID、参数名是否符合 snake_case、语义清晰、前后一致
3. **参数合理性**：参数类型是否正确、是否缺少关键参数、枚举值是否完整
4. **优先级分配**：P0/P1/P2 划分是否合理
5. **漏斗设计**：核心转化漏斗是否覆盖、步骤是否完整
6. **可验收性**：每个埋点是否有明确的触发时机和验收标准

## 输出格式（严格遵守）

先输出简要 Markdown 评审意见，然后**必须**附带如下 JSON 代码块：

\`\`\`json
{
  "score": 85,
  "summary": "方案整体质量评估一句话",
  "issues": [
    {
      "severity": "error",
      "category": "完整性",
      "description": "问题描述",
      "suggestion": "修改建议"
    }
  ],
  "strengths": ["方案的优点1", "方案的优点2"]
}
\`\`\`

- score: 0-100 分，80分以上为合格
- severity: error(必须修复) / warning(建议修复) / info(建议优化)
- category: 完整性 / 命名规范 / 参数合理性 / 优先级分配 / 漏斗设计 / 可验收性`

export function useAiReview() {
  const runStore = useRunStore()
  const settingsStore = useSettingsStore()
  const prdStore = usePrdStore()

  const reviewing = ref(false)
  const reviewResult = ref<ReviewResult | null>(null)

  function parseReviewOutput(raw: string): ReviewResult {
    const jsonMatch = raw.match(/```json\s*\n([\s\S]*?)\n```/)
    const jsonStr = jsonMatch?.[1]?.trim()

    if (jsonStr) {
      try {
        const parsed = JSON.parse(jsonStr) as Partial<ReviewResult>
        return {
          score: parsed.score ?? 0,
          summary: parsed.summary ?? '',
          issues: parsed.issues ?? [],
          strengths: parsed.strengths ?? [],
          rawMarkdown: raw,
        }
      } catch {
        return { score: 0, summary: '解析失败', issues: [], strengths: [], rawMarkdown: raw }
      }
    }

    return { score: 0, summary: '未找到结构化审查结果', issues: [], strengths: [], rawMarkdown: raw }
  }

  async function reviewCurrentRun() {
    const activeRun = runStore.activeRun()
    if (!activeRun) {
      ElMessage.warning('没有可审查的埋点方案')
      return false
    }

    const settings = settingsStore.settings
    if (!settings.token) {
      ElMessage.error('请先配置 AI Gateway Token')
      return false
    }

    const prd = prdStore.activeDoc()
    const prdText = prd?.rawText ?? ''

    reviewing.value = true
    reviewResult.value = null

    try {
      const trackingPlan = activeRun.rawResponse
      const messages: ChatMessage[] = [
        { role: 'system', content: REVIEW_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `## PRD 原文（供参照）\n\n${prdText}\n\n---\n\n## 待审查的埋点方案\n\n${trackingPlan}\n\n---\n\n请对以上埋点方案进行全面审查。`,
        },
      ]

      const rawResponse = await chatCompletion(settings, messages)
      reviewResult.value = parseReviewOutput(rawResponse)
      ElMessage.success('审查完成')
      return true
    } catch (e) {
      const msg = e instanceof Error ? e.message : '审查失败'
      ElMessage.error(msg)
      return false
    } finally {
      reviewing.value = false
    }
  }

  function clearReview() {
    reviewResult.value = null
  }

  return { reviewing, reviewResult, reviewCurrentRun, clearReview }
}
