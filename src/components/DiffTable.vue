<script setup lang="ts">
import { computed } from 'vue'
import type { SkillJsonData, SkillDiffResult, EventDiffEntry, TrackingParam } from '../types'

const props = defineProps<{
  baseData: SkillJsonData | null
  newData: SkillJsonData | null
  diffResult: SkillDiffResult | null
}>()

const hasDiff = computed(() => !!props.diffResult)

const displayEvents = computed<EventDiffEntry[]>(() => {
  if (props.diffResult) return props.diffResult.events

  const events = props.baseData?.events ?? []
  return events.map(ev => ({
    kind: 'unchanged' as const,
    eventId: ev.eventId,
    oldEvent: ev,
    newEvent: ev,
  }))
})

function rowClass(entry: EventDiffEntry): string {
  if (entry.kind === 'added') return 'diff-added'
  if (entry.kind === 'removed') return 'diff-removed'
  if (entry.kind === 'modified') return 'diff-modified'
  return ''
}

function kindLabel(kind: string): string {
  if (kind === 'added') return '新增'
  if (kind === 'removed') return '删除'
  if (kind === 'modified') return '修改'
  return ''
}

function kindType(kind: string) {
  if (kind === 'added') return 'success'
  if (kind === 'removed') return 'danger'
  if (kind === 'modified') return 'warning'
  return 'info'
}

function isFieldChanged(entry: EventDiffEntry, field: string): boolean {
  return entry.kind === 'modified' && (entry.changedFields?.includes(field) ?? false)
}

function formatParams(params: TrackingParam[]): string {
  if (!params?.length) return '—'
  return params.map(p => {
    let s = `${p.name}(${p.description || p.type})`
    if (p.enum?.length) s += `: ${p.enum.join('/')}`
    return s
  }).join('\n')
}

function timingLabel(t: string): string {
  const map: Record<string, string> = {
    display: '曝光', click: '点击', hover: '悬浮',
    load: '加载', scroll: '滚动', stay: '停留',
  }
  return map[t] ?? t
}
</script>

<template>
  <div class="diff-table-wrap">
    <!-- 双栏对比模式 -->
    <template v-if="hasDiff">
      <div class="dual-pane">
        <!-- 左栏：基线 -->
        <div class="pane">
          <div class="pane-header baseline">基线版本</div>
          <table class="dt">
            <thead>
              <tr>
                <th class="col-status" v-if="hasDiff">状态</th>
                <th class="col-id">事件 ID</th>
                <th class="col-name">事件名</th>
                <th class="col-pos">页面 / 模块 / 元素</th>
                <th class="col-timing">动作</th>
                <th class="col-trigger">触发时机</th>
                <th class="col-params">参数</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="entry in displayEvents"
                :key="entry.eventId + '-old'"
                :class="rowClass(entry)"
              >
                <td v-if="hasDiff">
                  <el-tag v-if="entry.kind !== 'unchanged'" :type="kindType(entry.kind)" size="small">
                    {{ kindLabel(entry.kind) }}
                  </el-tag>
                </td>
                <template v-if="entry.kind === 'added'">
                  <td colspan="6" class="empty-cell">—</td>
                </template>
                <template v-else>
                  <td><code>{{ entry.oldEvent?.eventId }}</code></td>
                  <td>{{ entry.oldEvent?.eventName }}</td>
                  <td class="pos-cell">
                    <span>{{ entry.oldEvent?.pageLabel || entry.oldEvent?.page }}</span>
                    <span v-if="entry.oldEvent?.module"> / {{ entry.oldEvent?.moduleLabel || entry.oldEvent?.module }}</span>
                    <span v-if="entry.oldEvent?.element"> / {{ entry.oldEvent?.elementLabel || entry.oldEvent?.element }}</span>
                  </td>
                  <td>
                    <span class="timing-tag" :class="entry.oldEvent?.timing">
                      {{ timingLabel(entry.oldEvent?.timing ?? '') }}
                    </span>
                  </td>
                  <td>{{ entry.oldEvent?.trigger }}</td>
                  <td class="params-cell"><pre>{{ formatParams(entry.oldEvent?.params ?? []) }}</pre></td>
                </template>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 右栏：新版 -->
        <div class="pane">
          <div class="pane-header newver">新版本（AI 生成）</div>
          <table class="dt">
            <thead>
              <tr>
                <th class="col-status" v-if="hasDiff">状态</th>
                <th class="col-id">事件 ID</th>
                <th class="col-name">事件名</th>
                <th class="col-pos">页面 / 模块 / 元素</th>
                <th class="col-timing">动作</th>
                <th class="col-trigger">触发时机</th>
                <th class="col-params">参数</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="entry in displayEvents"
                :key="entry.eventId + '-new'"
                :class="rowClass(entry)"
              >
                <td v-if="hasDiff">
                  <el-tag v-if="entry.kind !== 'unchanged'" :type="kindType(entry.kind)" size="small">
                    {{ kindLabel(entry.kind) }}
                  </el-tag>
                </td>
                <template v-if="entry.kind === 'removed'">
                  <td colspan="6" class="empty-cell deleted-text">已删除</td>
                </template>
                <template v-else>
                  <td>
                    <code :class="{ highlight: isFieldChanged(entry, 'eventId') }">
                      {{ entry.newEvent?.eventId }}
                    </code>
                  </td>
                  <td :class="{ highlight: isFieldChanged(entry, 'eventName') }">
                    {{ entry.newEvent?.eventName }}
                  </td>
                  <td class="pos-cell" :class="{ highlight: isFieldChanged(entry, 'page') || isFieldChanged(entry, 'module') || isFieldChanged(entry, 'element') }">
                    <span>{{ entry.newEvent?.pageLabel || entry.newEvent?.page }}</span>
                    <span v-if="entry.newEvent?.module"> / {{ entry.newEvent?.moduleLabel || entry.newEvent?.module }}</span>
                    <span v-if="entry.newEvent?.element"> / {{ entry.newEvent?.elementLabel || entry.newEvent?.element }}</span>
                  </td>
                  <td :class="{ highlight: isFieldChanged(entry, 'timing') }">
                    <span class="timing-tag" :class="entry.newEvent?.timing">
                      {{ timingLabel(entry.newEvent?.timing ?? '') }}
                    </span>
                  </td>
                  <td :class="{ highlight: isFieldChanged(entry, 'trigger') }">
                    {{ entry.newEvent?.trigger }}
                  </td>
                  <td class="params-cell" :class="{ highlight: isFieldChanged(entry, 'params') }">
                    <pre>{{ formatParams(entry.newEvent?.params ?? []) }}</pre>
                  </td>
                </template>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- 单栏模式（无 Diff） -->
    <template v-else>
      <table class="dt single">
        <thead>
          <tr>
            <th class="col-id">事件 ID</th>
            <th class="col-name">事件名</th>
            <th class="col-pos">页面 / 模块 / 元素</th>
            <th class="col-timing">动作</th>
            <th class="col-trigger">触发时机</th>
            <th class="col-priority">优先级</th>
            <th class="col-params">参数</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="entry in displayEvents" :key="entry.eventId">
            <td><code>{{ entry.oldEvent?.eventId }}</code></td>
            <td>{{ entry.oldEvent?.eventName }}</td>
            <td class="pos-cell">
              <span>{{ entry.oldEvent?.pageLabel || entry.oldEvent?.page }}</span>
              <span v-if="entry.oldEvent?.module"> / {{ entry.oldEvent?.moduleLabel || entry.oldEvent?.module }}</span>
              <span v-if="entry.oldEvent?.element"> / {{ entry.oldEvent?.elementLabel || entry.oldEvent?.element }}</span>
            </td>
            <td>
              <span class="timing-tag" :class="entry.oldEvent?.timing">
                {{ timingLabel(entry.oldEvent?.timing ?? '') }}
              </span>
            </td>
            <td>{{ entry.oldEvent?.trigger }}</td>
            <td>
              <el-tag v-if="entry.oldEvent?.priority" size="small">{{ entry.oldEvent.priority }}</el-tag>
            </td>
            <td class="params-cell"><pre>{{ formatParams(entry.oldEvent?.params ?? []) }}</pre></td>
          </tr>
        </tbody>
      </table>
    </template>
  </div>
</template>

<style scoped>
.diff-table-wrap { width: 100%; }
.dual-pane { display: flex; gap: 2px; overflow: auto; }
.pane { flex: 1; min-width: 0; overflow: auto; }

.pane-header {
  padding: 8px 14px; font-weight: 600; font-size: 13px; text-align: center;
  border-radius: var(--radius-sm) var(--radius-sm) 0 0;
}
.pane-header.baseline { background: var(--bg-hover); color: var(--text-secondary); border: 1px solid var(--border-light); border-bottom: none; }
.pane-header.newver { background: var(--accent-light); color: var(--accent); border: 1px solid var(--accent); border-bottom: none; }

.dt { width: 100%; border-collapse: collapse; font-size: 12px; table-layout: auto; border: 1px solid var(--border-light); }
.dt.single { border-radius: var(--radius-sm); overflow: hidden; }
.dt th {
  padding: 8px 10px; text-align: left; font-weight: 600; font-size: 11px;
  color: var(--text-tertiary); background: var(--bg-hover); border-bottom: 1px solid var(--border-subtle); white-space: nowrap;
}
.dt td { padding: 7px 10px; vertical-align: top; color: var(--text-primary); border-bottom: 1px solid var(--border-subtle); line-height: 1.5; }
.dt code { font-size: 11px; background: var(--bg-hover); padding: 1px 4px; border-radius: 3px; }

.col-status { width: 50px; }
.col-id { min-width: 140px; }
.col-name { min-width: 100px; }
.col-pos { min-width: 160px; }
.col-timing { width: 56px; }
.col-trigger { min-width: 100px; }
.col-priority { width: 56px; }
.col-params { min-width: 180px; }

.pos-cell { font-size: 11px; color: var(--text-secondary); }
.params-cell pre { margin: 0; font-size: 11px; font-family: 'SFMono-Regular', Consolas, monospace; white-space: pre-wrap; word-break: break-word; line-height: 1.5; }

.timing-tag { display: inline-block; font-size: 11px; font-weight: 600; padding: 1px 6px; border-radius: 3px; }
.timing-tag.display { background: #e6f5ea; color: #1e7e34; }
.timing-tag.click   { background: var(--accent-light); color: var(--accent); }
.timing-tag.hover   { background: #fef7e0; color: #b06000; }
.timing-tag.load    { background: #f1f3f4; color: var(--text-tertiary); }
.timing-tag.scroll  { background: #f1f3f4; color: var(--text-tertiary); }
.timing-tag.stay    { background: #fce8e6; color: #c5221f; }

tr.diff-added { background: #e6f5ea !important; }
tr.diff-added td { border-left: 3px solid var(--success); }
tr.diff-removed { background: #fce8e6 !important; }
tr.diff-removed td { border-left: 3px solid var(--danger); text-decoration: line-through; color: var(--text-tertiary); }
tr.diff-modified { background: #fef7e0 !important; }
tr.diff-modified td { border-left: 3px solid var(--warning); }

.highlight { background: #fef7e0 !important; font-weight: 600; }
.empty-cell { text-align: center; color: var(--text-tertiary); font-style: italic; }
.deleted-text { color: var(--danger); text-decoration: line-through; }
</style>
