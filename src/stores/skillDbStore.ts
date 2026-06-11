import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { DbSkill, DbSkillSnapshot, SkillJsonData } from '../types'

export interface SpecOption {
  key: string
  label: string
  description: string
  available: boolean
}

export const useSkillDbStore = defineStore('skillDb', () => {
  const skills = ref<DbSkill[]>([])
  const currentSkillId = ref<string | null>(null)
  const snapshots = ref<DbSkillSnapshot[]>([])
  const selectedBaseVersion = ref<string | null>(null)
  const selectedSpecType = ref<string>('general')
  const specOptions = ref<SpecOption[]>([])
  const loading = ref(false)
  const generating = ref(false)
  const error = ref<string | null>(null)

  const generatedSkillJson = ref<SkillJsonData | null>(null)
  const generatedChangelog = ref<string>('')
  const generatedRaw = ref<string>('')

  const currentSkill = computed(() =>
    skills.value.find(s => s.skill_id === currentSkillId.value) ?? null
  )

  const baseSnapshot = computed(() => {
    if (!selectedBaseVersion.value) return null
    return snapshots.value.find(s => s.version === selectedBaseVersion.value) ?? null
  })

  const baseSkillJson = computed<SkillJsonData | null>(() => {
    const snap = baseSnapshot.value
    if (!snap) return null
    try { return JSON.parse(snap.skill_json) } catch { return null }
  })

  async function fetchSpecs() {
    try {
      const resp = await fetch('/api/specs')
      specOptions.value = await resp.json()
    } catch {
      specOptions.value = [{ key: 'general', label: '通用规范', description: '', available: true }]
    }
  }

  async function fetchSkills() {
    loading.value = true
    try {
      const resp = await fetch('/api/skills')
      skills.value = await resp.json()
    } catch (e) {
      error.value = e instanceof Error ? e.message : '获取 Skill 列表失败'
    } finally {
      loading.value = false
    }
  }

  const specFiles = ref<{ filename: string; path: string; size: number }[]>([])

  async function fetchSpecFiles() {
    try {
      const resp = await fetch('/api/spec-files')
      specFiles.value = await resp.json()
    } catch {
      specFiles.value = []
    }
  }

  async function createSkill(skillId: string, name: string, filePath?: string) {
    const resp = await fetch('/api/skills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skill_id: skillId, name, file_path: filePath || '' }),
    })
    if (!resp.ok) throw new Error('创建 Skill 失败')
    currentSkillId.value = skillId
    await fetchSkills()
    await fetchHistory(skillId)
  }

  async function publishToFile(skillId: string, version: string) {
    const resp = await fetch('/api/skills/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skill_id: skillId, version }),
    })
    const data = await resp.json()
    if (!resp.ok) throw new Error(data.error ?? '发布失败')
    await fetchHistory(skillId)
    return data.message
  }

  async function fetchHistory(skillId: string) {
    loading.value = true
    currentSkillId.value = skillId
    try {
      const resp = await fetch(`/api/skills/${encodeURIComponent(skillId)}/history`)
      const data = await resp.json()
      snapshots.value = data.snapshots ?? []
      if (snapshots.value.length > 0 && !selectedBaseVersion.value) {
        selectedBaseVersion.value = snapshots.value[0].version
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : '获取版本历史失败'
    } finally {
      loading.value = false
    }
  }

  async function generateNewVersion(prdText: string) {
    if (!currentSkillId.value) { error.value = '请先选择或创建 Skill'; return false }

    generating.value = true
    error.value = null
    generatedSkillJson.value = null
    generatedChangelog.value = ''

    try {
      const resp = await fetch('/api/skills/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skill_id: currentSkillId.value,
          base_version: selectedBaseVersion.value,
          new_prd_text: prdText,
          spec_type: selectedSpecType.value,
        }),
      })

      const data = await resp.json()

      if (data.error && !data.skill_json) {
        error.value = data.error
        generatedRaw.value = data.raw ?? ''
        return false
      }

      generatedSkillJson.value = data.skill_json
      generatedChangelog.value = data.changelog ?? ''
      generatedRaw.value = data.raw ?? ''
      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : '生成失败'
      return false
    } finally {
      generating.value = false
    }
  }

  async function saveSnapshot(version: string, prdText: string, status: 'draft' | 'released' = 'draft') {
    if (!currentSkillId.value || !generatedSkillJson.value) {
      error.value = '无可保存的数据'
      return false
    }

    try {
      const resp = await fetch('/api/skills/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skill_id: currentSkillId.value,
          version,
          base_version: selectedBaseVersion.value,
          prd_text: prdText,
          changelog: generatedChangelog.value,
          skill_json: generatedSkillJson.value,
          status,
        }),
      })

      if (!resp.ok) {
        const data = await resp.json()
        error.value = data.error ?? '保存失败'
        return false
      }

      await fetchHistory(currentSkillId.value)
      selectedBaseVersion.value = version
      generatedSkillJson.value = null
      generatedChangelog.value = ''
      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : '保存失败'
      return false
    }
  }

  function clearGenerated() {
    generatedSkillJson.value = null
    generatedChangelog.value = ''
    generatedRaw.value = ''
    error.value = null
  }

  return {
    skills, currentSkillId, snapshots, selectedBaseVersion,
    selectedSpecType, specOptions, specFiles,
    loading, generating, error,
    generatedSkillJson, generatedChangelog, generatedRaw,
    currentSkill, baseSnapshot, baseSkillJson,
    fetchSpecs, fetchSpecFiles, fetchSkills, createSkill, fetchHistory,
    generateNewVersion, saveSnapshot, clearGenerated, publishToFile,
  }
})
