import type { AiSettings, ChatMessage } from '../types'

export interface StreamProgress {
  phase: 'connecting' | 'reasoning' | 'generating' | 'done'
  contentLength: number
  reasoningLength: number
}

export async function chatCompletion(
  settings: AiSettings,
  messages: ChatMessage[],
  options?: {
    model?: string
    signal?: AbortSignal
    onProgress?: (progress: StreamProgress) => void
  },
): Promise<string> {
  const actualModel = options?.model ?? settings.model
  const extraParams = getModelExtraParams(actualModel)
  const body = JSON.stringify({
    model: actualModel,
    messages,
    stream: true,
    ...extraParams,
  })

  console.log('[aiClient] 请求体大小:', (body.length / 1024).toFixed(1), 'KB')

  options?.onProgress?.({ phase: 'connecting', contentLength: 0, reasoningLength: 0 })

  const resp = await fetch(`${settings.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.token}`,
      'AI-Gateway-Uid': settings.uid,
      'AI-Gateway-Product-Name': settings.productName,
      'AI-Gateway-Company-Id': settings.companyId ?? '',
      'AI-Gateway-Intention-Code': settings.intentionCode ?? '',
    },
    body,
    signal: options?.signal,
  })

  console.log('[aiClient] 响应状态:', resp.status)

  if (!resp.ok) {
    const errText = await resp.text()
    throw new Error(`AI 请求失败 (${resp.status}): ${errText.slice(0, 300)}`)
  }

  const contentType = resp.headers.get('content-type') ?? ''

  if (contentType.includes('text/event-stream')) {
    return readSSEStream(resp, options?.signal, options?.onProgress)
  }

  const text = await resp.text()
  const data = parseJsonSafe(text)
  if (data?.error) {
    const errMsg = data.error.message ?? JSON.stringify(data.error)
    console.error('[aiClient] 网关错误详情:', JSON.stringify(data.error))
    if (/审核|content_filter|moderation|sensitive/i.test(errMsg)) {
      throw new Error(`内容审核拦截：输入内容命中安全规则。建议切换到 DeepSeek 或 GLM 模型重试`)
    }
    throw new Error(`AI 网关错误: ${errMsg}`)
  }
  options?.onProgress?.({ phase: 'done', contentLength: text.length, reasoningLength: 0 })
  return extractContent(data) || text
}

async function readSSEStream(
  resp: Response,
  signal?: AbortSignal,
  onProgress?: (progress: StreamProgress) => void,
): Promise<string> {
  const reader = resp.body?.getReader()
  if (!reader) throw new Error('无法读取流式响应')

  const decoder = new TextDecoder()
  let content = ''
  let reasoning = ''
  let buffer = ''

  const cleanup = () => { reader.cancel().catch(() => {}) }
  signal?.addEventListener('abort', cleanup, { once: true })

  try {
    while (true) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')

      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || trimmed === 'data: [DONE]') continue
        if (!trimmed.startsWith('data: ')) continue

        const jsonStr = trimmed.slice(6)
        try {
          const chunk = JSON.parse(jsonStr)
          const delta = chunk.choices?.[0]?.delta
          if (!delta) continue
          if (delta.content) content += delta.content
          if (delta.reasoning_content) reasoning += delta.reasoning_content
        } catch {
          // skip malformed chunks
        }
      }

      const phase = content ? 'generating' : reasoning ? 'reasoning' : 'connecting'
      onProgress?.({ phase, contentLength: content.length, reasoningLength: reasoning.length })
    }
  } finally {
    signal?.removeEventListener('abort', cleanup)
  }

  onProgress?.({ phase: 'done', contentLength: content.length, reasoningLength: reasoning.length })

  if (!content && !reasoning) throw new Error('AI 流式响应未返回任何内容')

  if (!content && reasoning) {
    console.warn('[aiClient] 模型只返回了 reasoning_content，无正式 content')
    content = reasoning
  }

  if (reasoning) {
    console.log('[aiClient] 思考链长度:', reasoning.length, '(已忽略)')
  }
  console.log('[aiClient] 流式响应完成，正文长度:', content.length)
  return content
}

function parseJsonSafe(text: string): any {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function extractContent(data: any): string {
  if (!data) return ''
  return (
    data?.choices?.[0]?.message?.content ??
    data?.result?.content ??
    data?.output?.text ??
    data?.response ??
    ''
  )
}

function getModelExtraParams(model: string): Record<string, unknown> {
  const m = model.toLowerCase()
  if (m.includes('/o3') || m.includes('/o1')) {
    return { temperature: 1 }
  }
  return {}
}
