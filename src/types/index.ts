export interface PrdDocument {
  id: string
  filename: string
  rawText: string
  uploadedAt: number
  category: string
}

export interface SkillVersion {
  id: string
  version: number
  raw: string
  note?: string
  createdAt: number
}

export interface TrackingParam {
  name: string
  type: string
  example?: string
  enum?: string[]
  required?: boolean
  description?: string
}

export interface TrackingEvent {
  eventId: string
  eventName: string
  page: string
  pageLabel?: string
  module?: string
  moduleLabel?: string
  element?: string
  elementLabel?: string
  trigger: string
  timing: string
  params: TrackingParam[]
  priority?: 'P0' | 'P1' | 'P2'
  prdRef?: string
}

export interface TrackingFunnel {
  name: string
  steps: string[]
}

export interface OpsChange {
  type: '新增' | '修改' | '废弃'
  event: string
  event_name: string
  title: string
  position: string
  component_name?: string
  data_fields: Record<string, string>
  trigger: string
  platform: string
  change_reason: string
}

export interface OpsActivityResult {
  component: string
  baseline_source: string
  inherited: string[]
  changes: OpsChange[]
}

export interface TrackingDesignResult {
  summary?: string
  conventions?: Record<string, string>
  commonParams?: TrackingParam[]
  events: TrackingEvent[]
  funnels?: TrackingFunnel[]
  gaps?: string[]
  rawMarkdown?: string
  parseError?: string
  opsResult?: OpsActivityResult
}

export interface RunRecord {
  id: string
  prdId: string
  skillVersionId: string
  model: string
  result: TrackingDesignResult
  rawResponse: string
  createdAt: number
  specVersionId?: string
  specMode?: 'overlay' | 'standalone'
}

export interface AiSettings {
  baseUrl: string
  token: string
  uid: string
  model: string
  productName: string
  companyId?: string
  intentionCode?: string
}

export interface ParsedSkill {
  systemPrompt: string
  exampleUser: string
  exampleAssistant: string
  noContextHint: string
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ReviewIssue {
  severity: 'error' | 'warning' | 'info'
  category: string
  description: string
  suggestion?: string
}

export interface ReviewResult {
  score: number
  summary: string
  issues: ReviewIssue[]
  strengths: string[]
  rawMarkdown?: string
}

// ── SQLite Skill 多版本管理 ──

export interface DbSkill {
  skill_id: string
  name: string
  file_path: string
  current_stable_version: string | null
  created_at: string
}

export interface DbSkillSnapshot {
  id: number
  skill_id: string
  version: string
  base_version: string | null
  prd_text: string | null
  changelog: string | null
  skill_json: string
  status: 'draft' | 'released'
  created_at: string
}

export interface SkillJsonData {
  summary?: string
  conventions?: Record<string, string>
  commonParams?: TrackingParam[]
  events: TrackingEvent[]
  funnels?: TrackingFunnel[]
  gaps?: string[]
}

export type DiffKind = 'added' | 'modified' | 'removed' | 'unchanged'

export interface EventDiffEntry {
  kind: DiffKind
  eventId: string
  oldEvent?: TrackingEvent
  newEvent?: TrackingEvent
  changedFields?: string[]
}

export interface SkillDiffResult {
  events: EventDiffEntry[]
  addedCount: number
  modifiedCount: number
  removedCount: number
}
