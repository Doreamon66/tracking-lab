import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { v4 as uuid } from 'uuid'
import type { SkillVersion } from '../types'

export const useSkillStore = defineStore('skill', () => {
  const versions = ref<SkillVersion[]>([])
  const activeVersionId = ref<string>('')
  const loading = ref(false)
  const filePath = ref('')

  const activeSkill = computed(
    () => versions.value.find((v) => v.id === activeVersionId.value) ?? versions.value[0] ?? null,
  )

  const draftRaw = ref('')

  async function persistVersion(ver: SkillVersion) {
    await fetch('/api/spec-versions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: ver.id,
        version: ver.version,
        content: ver.raw,
        note: ver.note ?? '',
        file_path: '__general__',
      }),
    }).catch(() => {})
  }

  async function loadVersionsFromDb() {
    try {
      const resp = await fetch('/api/spec-versions?file=__general__')
      const rows: { id: string; version: number; content: string; note: string; created_at: number }[] = await resp.json()
      versions.value = rows.map(r => ({
        id: r.id,
        version: r.version,
        raw: r.content,
        note: r.note,
        createdAt: r.created_at,
      }))
      if (versions.value.length && !activeVersionId.value) {
        activeVersionId.value = versions.value[0].id
        draftRaw.value = versions.value[0].raw
      }
    } catch { /* ignore */ }
  }

  async function loadFromServer() {
    loading.value = true
    try {
      const resp = await fetch('/api/skill')
      const data = await resp.json()
      filePath.value = data.path ?? ''
      const content = data.content ?? ''

      await loadVersionsFromDb()

      if (!versions.value.length || versions.value[0].raw !== content) {
        const ver: SkillVersion = {
          id: uuid(),
          version: (versions.value[0]?.version ?? 0) + 1,
          raw: content,
          note: '从文件加载',
          createdAt: Date.now(),
        }
        versions.value.unshift(ver)
        activeVersionId.value = ver.id
        await persistVersion(ver)
      }

      draftRaw.value = content
    } finally {
      loading.value = false
    }
  }

  function selectVersion(id: string) {
    activeVersionId.value = id
    draftRaw.value = versions.value.find((v) => v.id === id)?.raw ?? draftRaw.value
  }

  async function saveAsNewVersion(note?: string): Promise<SkillVersion> {
    const nextVersion = (versions.value[0]?.version ?? 0) + 1
    const ver: SkillVersion = {
      id: uuid(),
      version: nextVersion,
      raw: draftRaw.value,
      note: note ?? `v${nextVersion}`,
      createdAt: Date.now(),
    }
    versions.value.unshift(ver)
    activeVersionId.value = ver.id
    await persistVersion(ver)
    return ver
  }

  async function saveToFile(): Promise<boolean> {
    try {
      const resp = await fetch('/api/skill', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: draftRaw.value }),
      })
      return resp.ok
    } catch {
      return false
    }
  }

  function resetDraft() {
    draftRaw.value = activeSkill.value?.raw ?? ''
  }

  async function deleteVersion(id: string) {
    versions.value = versions.value.filter((v) => v.id !== id)
    if (activeVersionId.value === id) {
      activeVersionId.value = versions.value[0]?.id ?? ''
      draftRaw.value = versions.value[0]?.raw ?? ''
    }
    await fetch(`/api/spec-versions?id=${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => {})
  }

  return {
    versions,
    activeVersionId,
    activeSkill,
    draftRaw,
    loading,
    filePath,
    loadFromServer,
    selectVersion,
    saveAsNewVersion,
    saveToFile,
    resetDraft,
    deleteVersion,
  }
})
