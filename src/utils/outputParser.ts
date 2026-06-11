import type { TrackingDesignResult, TrackingEvent, TrackingParam, OpsActivityResult } from '../types'

export function parseTrackingOutput(raw: string): TrackingDesignResult {
  const cleanedRaw = stripThinkingBlocks(raw)
  const jsonStr = extractJsonBlock(cleanedRaw) ?? extractOpsJsonBlock(cleanedRaw)

  if (jsonStr) {
    try {
      const parsed = JSON.parse(jsonStr)
      const markdownPart = extractMarkdownPart(cleanedRaw)

      if (isOpsFormat(parsed)) {
        return {
          events: [],
          opsResult: normalizeOpsResult(parsed),
          rawMarkdown: markdownPart || cleanedRaw,
        }
      }

      const events = (parsed.events ?? []).map(normalizeEvent)
      return {
        summary: parsed.summary,
        conventions: parsed.conventions,
        commonParams: (parsed.commonParams ?? []).map(normalizeParam),
        events,
        funnels: parsed.funnels ?? [],
        gaps: parsed.gaps ?? [],
        rawMarkdown: markdownPart || cleanedRaw,
      }
    } catch (e) {
      return {
        events: [],
        rawMarkdown: cleanedRaw,
        parseError: e instanceof Error ? e.message : 'JSON 解析失败',
      }
    }
  }

  return {
    events: [],
    rawMarkdown: cleanedRaw,
    parseError: '未找到 JSON 代码块，已降级为 Markdown 展示',
  }
}

function isOpsFormat(parsed: any): boolean {
  return parsed && ('component' in parsed || 'changes' in parsed) && !('events' in parsed)
}

function normalizeOpsResult(parsed: any): OpsActivityResult {
  return {
    component: parsed.component ?? '',
    baseline_source: parsed.baseline_source ?? '',
    inherited: Array.isArray(parsed.inherited) ? parsed.inherited : [],
    changes: Array.isArray(parsed.changes) ? parsed.changes.map((c: any) => ({
      type: c.type ?? '新增',
      event: c.event ?? '',
      event_name: c.event_name ?? '',
      title: c.title ?? '',
      position: String(c.position ?? ''),
      component_name: c.component_name ?? c.position_label ?? '',
      data_fields: c.data_fields ?? {},
      trigger: c.trigger ?? '',
      platform: c.platform ?? '全端',
      change_reason: c.change_reason ?? '',
    })) : [],
  }
}

function extractOpsJsonBlock(text: string): string | null {
  const allMatches = [...text.matchAll(/```json\s*\n([\s\S]*?)\n```/g)]
  if (allMatches.length > 0) {
    const opsBlock = allMatches.find(m => m[1].includes('"component"') || m[1].includes('"changes"'))
    if (opsBlock) return opsBlock[1].trim()
  }
  return null
}

function normalizeEvent(raw: Record<string, any>): TrackingEvent {
  return {
    eventId: raw.eventId ?? raw.event_id ?? '',
    eventName: raw.eventName ?? raw.event_name ?? '',
    page: raw.page ?? '',
    pageLabel: raw.pageLabel ?? raw.page_label ?? raw.page ?? '',
    module: raw.module ?? '',
    moduleLabel: raw.moduleLabel ?? raw.module_label ?? raw.module ?? '',
    element: raw.element ?? '',
    elementLabel: raw.elementLabel ?? raw.element_label ?? raw.element ?? '',
    trigger: raw.trigger ?? '',
    timing: raw.timing ?? raw.action ?? 'display',
    priority: raw.priority ?? 'P1',
    params: Array.isArray(raw.params) ? raw.params.map(normalizeParam) : [],
    prdRef: raw.prdRef ?? raw.prd_ref ?? undefined,
  }
}

function normalizeParam(raw: Record<string, any>): TrackingParam {
  return {
    name: raw.name ?? '',
    type: raw.type ?? 'string',
    description: raw.description ?? raw.desc ?? raw.chinese_name ?? '',
    example: raw.example ?? undefined,
    enum: Array.isArray(raw.enum) ? raw.enum.map(String) : undefined,
    required: raw.required ?? undefined,
  }
}

function stripThinkingBlocks(text: string): string {
  return text
    .replace(/<think>[\s\S]*?<\/think>/g, '')
    .replace(/<thinking>[\s\S]*?<\/thinking>/g, '')
    .replace(/<reasoning>[\s\S]*?<\/reasoning>/g, '')
    .trim()
}

function extractJsonBlock(text: string): string | null {
  const allMatches = [...text.matchAll(/```json\s*\n([\s\S]*?)\n```/g)]

  if (allMatches.length > 0) {
    const eventsBlock = allMatches.find((m) => m[1].includes('"events"'))
    const match = eventsBlock ?? allMatches[allMatches.length - 1]
    return match[1].trim()
  }

  const plainFence = text.match(/```\s*\n(\{[\s\S]*?"events"[\s\S]*?\})\n```/)
  if (plainFence) return plainFence[1].trim()

  const braceMatch = text.match(/(\{[\s\S]*"events"\s*:\s*\[[\s\S]*\]\s*[\s\S]*\})\s*$/)
  if (braceMatch) {
    try {
      JSON.parse(braceMatch[1])
      return braceMatch[1].trim()
    } catch {
      // not valid JSON
    }
  }

  return null
}

function extractMarkdownPart(text: string): string {
  const jsonStart = text.search(/```json\s*\n[\s\S]*?"events"/)
  if (jsonStart > 0) {
    return text.slice(0, jsonStart).trim()
  }
  return ''
}
