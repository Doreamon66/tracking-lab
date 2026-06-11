<script setup lang="ts">
import { computed } from 'vue'
import type { TrackingEvent, TrackingParam } from '../types'

const props = defineProps<{ events: TrackingEvent[] }>()

const timingLabel: Record<string, string> = {
  display: '曝光', click: '点击', hover: '悬浮',
  load: '加载', scroll: '滚动', stay: '停留',
}
const timingOrder = ['display', 'click', 'hover', 'load', 'scroll', 'stay']

interface ElementBlock { label: string; code: string; events: TrackingEvent[] }
interface ModuleBlock { label: string; code: string; moduleEvents: TrackingEvent[]; elements: ElementBlock[] }
interface PageBlock { page: string; label: string; modules: ModuleBlock[] }

type RowData =
  | { kind: 'elem-header'; label: string; code: string }
  | { kind: 'timing-empty'; timing: string }
  | { kind: 'timing-param'; timing: string; param: TrackingParam }

interface FlatRow {
  data: RowData
  isFirstOfTiming: boolean
  timingSpan: number
  isInnerRow: boolean
}

const pages = computed<PageBlock[]>(() => {
  const map = new Map<string, PageBlock>()
  for (const ev of props.events) {
    let pb = map.get(ev.page)
    if (!pb) {
      pb = { page: ev.page, label: ev.pageLabel ?? ev.page, modules: [] }
      map.set(ev.page, pb)
    }
    const modCode = ev.module ?? '—'
    const modLabel = ev.moduleLabel ?? ev.module ?? '页面级'
    let mod = pb.modules.find(m => m.code === modCode)
    if (!mod) {
      mod = { label: modLabel, code: modCode, moduleEvents: [], elements: [] }
      pb.modules.push(mod)
    }
    if (!ev.element) {
      mod.moduleEvents.push(ev)
    } else {
      let elem = mod.elements.find(e => e.code === ev.element)
      if (!elem) {
        elem = { label: ev.elementLabel ?? ev.element, code: ev.element, events: [] }
        mod.elements.push(elem)
      }
      elem.events.push(ev)
    }
  }
  return Array.from(map.values())
})

function buildModuleRows(mod: ModuleBlock): FlatRow[] {
  const result: FlatRow[] = []

  if (mod.moduleEvents.length) {
    appendTimingRows(mod.moduleEvents, result)
  }

  for (const elem of mod.elements) {
    result.push({
      data: { kind: 'elem-header', label: elem.label, code: elem.code },
      isFirstOfTiming: false,
      timingSpan: 0,
      isInnerRow: false,
    })
    appendTimingRows(elem.events, result)
  }

  return result
}

function appendTimingRows(events: TrackingEvent[], out: FlatRow[]) {
  const tMap = new Map<string, TrackingEvent[]>()
  for (const ev of events) {
    let arr = tMap.get(ev.timing)
    if (!arr) { arr = []; tMap.set(ev.timing, arr) }
    arr.push(ev)
  }

  const sorted = [...tMap.keys()].sort((a, b) => {
    const ia = timingOrder.indexOf(a)
    const ib = timingOrder.indexOf(b)
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
  })

  for (const timing of sorted) {
    const evts = tMap.get(timing)!
    const params = dedup(evts.flatMap(e => e.params))

    if (params.length === 0) {
      out.push({
        data: { kind: 'timing-empty', timing },
        isFirstOfTiming: true,
        timingSpan: 1,
        isInnerRow: false,
      })
    } else {
      params.forEach((p, i) => {
        out.push({
          data: { kind: 'timing-param', timing, param: p },
          isFirstOfTiming: i === 0,
          timingSpan: i === 0 ? params.length : 0,
          isInnerRow: i > 0,
        })
      })
    }
  }
}

function dedup(params: TrackingParam[]): TrackingParam[] {
  const seen = new Set<string>()
  return params.filter(p => {
    if (seen.has(p.name)) return false
    seen.add(p.name)
    return true
  })
}
</script>

<template>
  <div v-if="!events.length" class="empty">
    <el-empty description="暂无事件数据" :image-size="50" />
  </div>

  <div v-else class="pages">
    <div v-for="pb in pages" :key="pb.page" class="page-block">
      <div class="page-title">{{ pb.label }}<span class="sub">{{ pb.page }}</span></div>

      <div class="mod-list">
        <div v-for="mod in pb.modules" :key="mod.code" class="mod-card">
          <div class="mod-header">
            {{ mod.label }}
            <span v-if="mod.code !== '—'" class="sub">{{ mod.code }}</span>
          </div>

          <table class="ev-table">
            <colgroup>
              <col class="col-timing" />
              <col class="col-attr" />
              <col class="col-desc" />
              <col class="col-val" />
            </colgroup>
            <thead>
              <tr><th>事件</th><th>属性</th><th>说明</th><th>取值</th></tr>
            </thead>
            <tbody>
              <template v-for="(r, i) in buildModuleRows(mod)" :key="i">
                <!-- 元素分隔行 -->
                <tr v-if="r.data.kind === 'elem-header'" class="elem-divider">
                  <td colspan="4">
                    <span class="elem-label">{{ r.data.label }}</span>
                    <span class="elem-code">{{ r.data.code }}</span>
                  </td>
                </tr>

                <!-- 数据行 -->
                <tr
                  v-else
                  :class="{
                    'timing-start': r.isFirstOfTiming,
                    'inner-row': r.isInnerRow,
                  }"
                >
                  <td v-if="r.isFirstOfTiming" :rowspan="r.timingSpan" class="c-timing">
                    <span class="timing-tag" :class="r.data.timing">
                      {{ timingLabel[r.data.timing] ?? r.data.timing }}
                    </span>
                  </td>
                  <td class="c-attr">
                    <code v-if="r.data.kind === 'timing-param'">{{ r.data.param.name }}</code>
                    <span v-else class="muted">—</span>
                  </td>
                  <td class="c-desc">
                    <template v-if="r.data.kind === 'timing-param'">{{ r.data.param.description ?? '' }}</template>
                    <template v-else><span class="muted">—</span></template>
                  </td>
                  <td class="c-val">
                    <template v-if="r.data.kind === 'timing-param'">
                      <template v-if="r.data.param.enum?.length">
                        <span v-for="v in r.data.param.enum" :key="v" class="tag">{{ v }}</span>
                      </template>
                      <span v-else-if="r.data.param.example" class="muted-val">{{ r.data.param.example }}</span>
                      <span v-else class="muted">—</span>
                    </template>
                    <span v-else class="muted">—</span>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pages { display: flex; flex-direction: column; gap: 20px; }

.page-block { border: 1px solid var(--border-light); border-radius: var(--radius-sm); overflow: hidden; }
.page-title {
  padding: 10px 16px; font-size: 13px; font-weight: 600;
  background: var(--accent-light); color: var(--text-primary);
}
.sub { font-size: 12px; color: var(--text-tertiary); font-weight: 400; margin-left: 6px; font-family: 'SFMono-Regular', Consolas, monospace; }

.mod-list { display: flex; flex-direction: column; gap: 10px; padding: 12px; background: var(--bg-primary); }
.mod-card { background: var(--bg-card); border: 1px solid var(--border-light); border-radius: var(--radius-sm); overflow: hidden; }
.mod-header {
  padding: 8px 14px; font-size: 13px; font-weight: 600;
  color: var(--text-primary); background: var(--bg-hover); border-bottom: 1px solid var(--border-subtle);
}

.ev-table { width: 100%; border-collapse: collapse; font-size: 13px; table-layout: fixed; }
.col-timing { width: 64px; }
.col-attr   { width: 160px; }
.col-desc   { width: 120px; }
.col-val    { min-width: 140px; }

.ev-table th {
  padding: 6px 12px; text-align: left; font-weight: 500; font-size: 11px;
  color: var(--text-tertiary); border-bottom: 1px solid var(--border-subtle);
}
.ev-table td { padding: 7px 12px; vertical-align: middle; color: var(--text-primary); line-height: 1.5; }

.elem-divider td {
  padding: 6px 14px; background: var(--bg-hover);
  border-top: 1px solid var(--border-light); border-bottom: 1px solid var(--border-subtle);
}
.elem-label { font-size: 12px; font-weight: 600; color: var(--text-secondary); }
.elem-code { font-size: 11px; color: var(--text-tertiary); margin-left: 6px; font-family: 'SFMono-Regular', Consolas, monospace; }

tr.timing-start:not(:first-child) td { border-top: 1px solid var(--border-light); }
tr.inner-row td { border-top: 1px dashed var(--border-subtle); }

.c-timing { vertical-align: middle; text-align: center; background: var(--bg-hover); border-right: 1px solid var(--border-subtle); }
.timing-tag { display: inline-block; font-size: 12px; font-weight: 600; padding: 2px 8px; border-radius: 4px; }
.timing-tag.display { background: #e6f5ea; color: #1e7e34; }
.timing-tag.click   { background: var(--accent-light); color: var(--accent); }
.timing-tag.hover   { background: #fef7e0; color: #b06000; }
.timing-tag.load    { background: #f1f3f4; color: var(--text-tertiary); }
.timing-tag.scroll  { background: #f1f3f4; color: var(--text-tertiary); }
.timing-tag.stay    { background: #fce8e6; color: #c5221f; }

.c-attr code { font-size: 12px; background: var(--bg-hover); padding: 1px 6px; border-radius: 3px; color: var(--text-primary); }
.c-desc { font-size: 12px; color: var(--text-secondary); }

.c-val { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; }
.tag {
  display: inline-block; font-size: 11px; padding: 1px 6px;
  background: var(--bg-hover); border: 1px solid var(--border-light);
  border-radius: 3px; color: var(--text-secondary); white-space: nowrap;
}
.muted { color: var(--border-light); font-size: 12px; }
.muted-val { color: var(--text-tertiary); font-size: 12px; font-style: italic; }
</style>
