import type { TrackingEvent, SkillJsonData, SkillDiffResult, EventDiffEntry } from '../types'

export function diffSkillJson(
  oldData: SkillJsonData | null,
  newData: SkillJsonData | null,
): SkillDiffResult {
  const oldEvents = oldData?.events ?? []
  const newEvents = newData?.events ?? []

  const oldMap = new Map<string, TrackingEvent>()
  for (const ev of oldEvents) oldMap.set(ev.eventId, ev)

  const newMap = new Map<string, TrackingEvent>()
  for (const ev of newEvents) newMap.set(ev.eventId, ev)

  const entries: EventDiffEntry[] = []
  let addedCount = 0
  let modifiedCount = 0
  let removedCount = 0

  for (const ev of newEvents) {
    const old = oldMap.get(ev.eventId)
    if (!old) {
      entries.push({ kind: 'added', eventId: ev.eventId, newEvent: ev })
      addedCount++
    } else {
      const changed = findChangedFields(old, ev)
      if (changed.length > 0) {
        entries.push({ kind: 'modified', eventId: ev.eventId, oldEvent: old, newEvent: ev, changedFields: changed })
        modifiedCount++
      } else {
        entries.push({ kind: 'unchanged', eventId: ev.eventId, oldEvent: old, newEvent: ev })
      }
    }
  }

  for (const ev of oldEvents) {
    if (!newMap.has(ev.eventId)) {
      entries.push({ kind: 'removed', eventId: ev.eventId, oldEvent: ev })
      removedCount++
    }
  }

  return { events: entries, addedCount, modifiedCount, removedCount }
}

function findChangedFields(oldEv: TrackingEvent, newEv: TrackingEvent): string[] {
  const fields: (keyof TrackingEvent)[] = [
    'eventName', 'page', 'pageLabel', 'module', 'moduleLabel',
    'element', 'elementLabel', 'trigger', 'timing', 'priority',
  ]

  const changed: string[] = []
  for (const f of fields) {
    if (String(oldEv[f] ?? '') !== String(newEv[f] ?? '')) {
      changed.push(f)
    }
  }

  const oldParams = JSON.stringify((oldEv.params ?? []).sort((a, b) => a.name.localeCompare(b.name)))
  const newParams = JSON.stringify((newEv.params ?? []).sort((a, b) => a.name.localeCompare(b.name)))
  if (oldParams !== newParams) changed.push('params')

  return changed
}
