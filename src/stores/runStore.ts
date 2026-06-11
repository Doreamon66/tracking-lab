import { defineStore } from 'pinia'
import { ref } from 'vue'
import { v4 as uuid } from 'uuid'
import type { RunRecord } from '../types'
import { loadJson, saveJson } from '../utils/storage'

export const useRunStore = defineStore('run', () => {
  const records = ref<RunRecord[]>(loadJson('run-records', []))
  const activeRunId = ref<string | null>(loadJson('run-active-id', null))
  const generating = ref(false)
  const error = ref<string | null>(null)
  const feedback = ref('')

  function persist() {
    saveJson('run-records', records.value)
    saveJson('run-active-id', activeRunId.value)
  }

  function addRecord(input: Omit<RunRecord, 'id' | 'createdAt'>) {
    const record: RunRecord = {
      ...input,
      id: uuid(),
      createdAt: Date.now(),
    }
    records.value.unshift(record)
    activeRunId.value = record.id
    persist()
    fetch('/api/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    }).catch(() => {})
    return record
  }

  function selectRun(id: string) {
    activeRunId.value = id
    persist()
  }

  function activeRun() {
    return records.value.find((r) => r.id === activeRunId.value) ?? records.value[0] ?? null
  }

  function runsForPrd(prdId: string) {
    return records.value.filter((r) => r.prdId === prdId)
  }

  function setGenerating(v: boolean) {
    generating.value = v
  }

  function setError(msg: string | null) {
    error.value = msg
  }

  return {
    records,
    activeRunId,
    generating,
    error,
    feedback,
    addRecord,
    selectRun,
    activeRun,
    runsForPrd,
    setGenerating,
    setError,
  }
})
