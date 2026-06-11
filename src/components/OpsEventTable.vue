<script setup lang="ts">
import { computed } from 'vue'
import type { OpsActivityResult, OpsChange } from '../types'

const props = defineProps<{ data: OpsActivityResult }>()

const eventLabel: Record<string, string> = {
  show_rubikpage: '页面加载',
  show_rubikwindow: '组件展示',
  click_rubikbtn: '用户点击',
}

const eventType: Record<string, string> = {
  show_rubikpage: 'page',
  show_rubikwindow: 'show',
  click_rubikbtn: 'click',
}

interface PositionGroup {
  position: string
  items: OpsChange[]
}

interface EventGroup {
  event: string
  label: string
  cssType: string
  positionGroups: PositionGroup[]
  totalCount: number
}

const grouped = computed<EventGroup[]>(() => {
  const order = ['show_rubikpage', 'show_rubikwindow', 'click_rubikbtn']
  const evMap = new Map<string, OpsChange[]>()

  for (const ev of order) evMap.set(ev, [])
  for (const c of props.data.changes) {
    if (!evMap.has(c.event)) evMap.set(c.event, [])
    evMap.get(c.event)!.push(c)
  }

  const result: EventGroup[] = []
  for (const [ev, items] of evMap) {
    if (!items.length) continue

    const posMap = new Map<string, OpsChange[]>()
    for (const c of items) {
      const key = c.component_name || c.position || '—'
      if (!posMap.has(key)) posMap.set(key, [])
      posMap.get(key)!.push(c)
    }

    result.push({
      event: ev,
      label: eventLabel[ev] ?? ev,
      cssType: eventType[ev] ?? 'page',
      positionGroups: [...posMap.entries()].map(([position, items]) => ({ position, items })),
      totalCount: items.length,
    })
  }
  return result
})

const dataFieldKeys = computed(() => {
  const keys = new Set<string>()
  for (const c of props.data.changes) {
    for (const k of Object.keys(c.data_fields)) keys.add(k)
  }
  return [...keys].sort((a, b) => {
    const na = parseInt(a.replace(/\D/g, '')) || 99
    const nb = parseInt(b.replace(/\D/g, '')) || 99
    return na - nb
  })
})
</script>

<template>
  <div class="ops-result">
    <!-- 组件信息头 -->
    <div class="ops-header">
      <div class="ops-header-left">
        <span class="ops-comp-name">{{ data.component || '未命名组件' }}</span>
        <span v-if="data.baseline_source" class="ops-baseline">基线：{{ data.baseline_source }}</span>
        <span v-else class="ops-baseline new">全新组件</span>
      </div>
      <div class="ops-header-right">
        <span class="ops-stat"><b>{{ data.changes.length }}</b> 个变更</span>
        <span v-if="data.inherited.length" class="ops-stat"><b>{{ data.inherited.length }}</b> 个继承</span>
      </div>
    </div>

    <!-- 继承事件 -->
    <div v-if="data.inherited.length" class="ops-inherited">
      <div class="ops-inherited-hd">继承（无变更）</div>
      <div class="ops-inherited-list">
        <span v-for="name in data.inherited" :key="name" class="ops-inh-tag">{{ name }}</span>
      </div>
    </div>

    <!-- 按事件类型分组 -->
    <div v-for="group in grouped" :key="group.event" class="ops-group">
      <div class="ops-ghd">
        <span class="ops-ghd-badge" :class="group.cssType">{{ group.label }}</span>
        <span class="ops-ghd-code">{{ group.event }}</span>
        <span class="ops-ghd-count">{{ group.totalCount }} 项</span>
      </div>

      <div class="ops-table-wrap">
        <table class="ops-table">
          <thead>
            <tr>
              <th class="th-comp">组件</th>
              <th class="th-attr">属性值</th>
              <th class="th-dict">属性值字典</th>
              <th class="th-common">公共属性</th>
              <th class="th-note">说明</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="pg in group.positionGroups" :key="pg.position">
              <tr
                v-for="(c, i) in pg.items"
                :key="c.event_name + i"
                :class="['tr-row', `tr-${c.type}`]"
              >
                <td
                  v-if="i === 0"
                  :rowspan="pg.items.length"
                  class="td-comp"
                >
                  {{ pg.position }}
                </td>
                <td class="td-attr">{{ c.event_name }}</td>
                <td class="td-dict">{{ c.title }}</td>
                <td class="td-common">
                  <template v-if="Object.keys(c.data_fields).length">
                    <div class="data-list">
                      <template v-for="dk in dataFieldKeys" :key="dk">
                        <div v-if="c.data_fields[dk]" class="data-item">
                          <span class="data-key">{{ dk }}</span>
                          <span class="data-val">{{ c.data_fields[dk] }}</span>
                        </div>
                      </template>
                    </div>
                  </template>
                  <span v-else class="empty-val">—</span>
                </td>
                <td class="td-note">
                  <span v-if="c.type !== '新增'" class="change-text" :class="c.type">{{ c.type }}</span>
                  <div v-if="c.change_reason" class="note-reason">{{ c.change_reason }}</div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>

    <el-empty v-if="!grouped.length && !data.inherited.length" description="暂无埋点数据" :image-size="50" />
  </div>
</template>

<style scoped>
.ops-result { display: flex; flex-direction: column; gap: 16px; }

/* ── 头部 ── */
.ops-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; background: var(--bg-hover); border-radius: var(--radius-sm);
}
.ops-header-left { display: flex; align-items: center; gap: 10px; }
.ops-comp-name { font-size: 15px; font-weight: 700; color: var(--text-primary); }
.ops-baseline { font-size: 12px; color: var(--text-tertiary); }
.ops-baseline.new { color: var(--accent); }
.ops-header-right { display: flex; gap: 14px; font-size: 13px; color: var(--text-tertiary); }
.ops-header-right b { color: var(--accent); font-size: 16px; margin-right: 2px; }

/* ── 继承 ── */
.ops-inherited { padding: 10px 16px; background: var(--bg-hover); border-radius: var(--radius-sm); }
.ops-inherited-hd { font-size: 11px; font-weight: 600; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
.ops-inherited-list { display: flex; flex-wrap: wrap; gap: 6px; }
.ops-inh-tag {
  font-size: 12px; padding: 2px 8px; background: #e6f5ea; border-radius: 3px;
  color: #1e7e34; font-family: 'SFMono-Regular', Consolas, monospace;
}

/* ── 事件分组 ── */
.ops-group { border: 1px solid var(--border-light); border-radius: var(--radius-sm); overflow: hidden; }

.ops-ghd {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 14px; background: var(--bg-hover); border-bottom: 1px solid var(--border-subtle);
}
.ops-ghd-badge { font-size: 12px; font-weight: 600; padding: 2px 10px; border-radius: 3px; }
.ops-ghd-badge.page { background: #f1f3f4; color: var(--text-tertiary); }
.ops-ghd-badge.show { background: #e6f5ea; color: #1e7e34; }
.ops-ghd-badge.click { background: var(--accent-light); color: var(--accent); }
.ops-ghd-code { font-size: 12px; color: var(--text-tertiary); font-family: 'SFMono-Regular', Consolas, monospace; }
.ops-ghd-count { margin-left: auto; font-size: 12px; color: var(--text-tertiary); }

/* ── 表格 ── */
.ops-table-wrap { overflow-x: auto; }

.ops-table { width: 100%; border-collapse: collapse; font-size: 13px; }

.ops-table th {
  padding: 7px 12px; text-align: left; font-size: 12px; font-weight: 600;
  color: #fff; background: #5a9e6f; white-space: nowrap;
  border-right: 1px solid rgba(255,255,255,0.15);
}
.ops-table th:last-child { border-right: none; }

.th-comp   { width: 120px; }
.th-attr   { width: 160px; }
.th-dict   { min-width: 140px; }
.th-common { min-width: 180px; }
.th-note   { min-width: 120px; }

.ops-table td {
  padding: 8px 12px; vertical-align: top;
  border-bottom: 1px solid var(--border-subtle);
  border-right: 1px solid var(--border-subtle);
  color: var(--text-primary); line-height: 1.5;
}
.ops-table td:last-child { border-right: none; }
.ops-table tr:last-child td { border-bottom: none; }

/* 组件列 */
.td-comp {
  font-size: 13px; font-weight: 600; color: var(--text-primary);
  vertical-align: middle; background: var(--bg-hover);
  border-right: 1px solid var(--border-light);
}

/* 属性值列 */
.td-attr {
  font-family: 'SFMono-Regular', Consolas, monospace; font-size: 12px;
  color: var(--text-primary); word-break: break-all;
}

/* 属性值字典列 */
.td-dict { font-size: 13px; color: var(--text-primary); line-height: 1.4; }

/* 说明列 */
.change-text { font-size: 12px; font-weight: 600; }
.change-text.修改 { color: #b06000; }
.change-text.废弃 { color: #c5221f; text-decoration: line-through; }
.note-reason { font-size: 11px; color: #0d904f; margin-top: 3px; line-height: 1.4; }
.td-note { font-size: 12px; color: var(--text-secondary); }

/* 公共属性列 */
.td-common { font-size: 12px; }
.data-list { display: flex; flex-direction: column; gap: 3px; }
.data-key {
  display: inline-block; font-size: 11px; color: var(--text-tertiary);
  min-width: 40px; margin-right: 6px;
  font-family: 'SFMono-Regular', Consolas, monospace;
}
.data-key::after { content: ':'; }
.data-val { font-size: 12px; color: var(--text-secondary); }
.empty-val { color: var(--border-light); }

/* 行高亮 */
.tr-新增 { background: #f4fbf6; }
.tr-修改 { background: #fffde6; }
.tr-废弃 td { opacity: 0.5; text-decoration: line-through; }
.tr-row:hover td { background: rgba(0,0,0,0.02); }
</style>
