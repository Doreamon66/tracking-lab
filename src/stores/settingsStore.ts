import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { AiSettings } from '../types'

const DEFAULT_SETTINGS: AiSettings = {
  baseUrl: import.meta.env.VITE_AI_BASE_URL ?? '/api/v3',
  token: import.meta.env.VITE_AI_TOKEN ?? '',
  uid: import.meta.env.VITE_AI_UID ?? '1712864357',
  model: import.meta.env.VITE_AI_MODEL ?? 'ali/qwen-plus',
  productName: 'wps-public-pc',
  companyId: '41000207',
  intentionCode: '',
}

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<AiSettings>({ ...DEFAULT_SETTINGS })
  const loaded = ref(false)

  async function loadFromServer() {
    try {
      const resp = await fetch('/api/config')
      const data = await resp.json()
      if (data.aiSettings) {
        const ai = data.aiSettings
        settings.value = {
          ...DEFAULT_SETTINGS,
          token: ai.token || DEFAULT_SETTINGS.token,
          uid: ai.uid || DEFAULT_SETTINGS.uid,
          model: ai.model || DEFAULT_SETTINGS.model,
          baseUrl: ai.baseUrl || DEFAULT_SETTINGS.baseUrl,
          productName: ai.productName || DEFAULT_SETTINGS.productName,
          companyId: ai.companyId || DEFAULT_SETTINGS.companyId,
        }
      }
    } catch { /* use defaults */ }
    loaded.value = true
  }

  async function save(next: AiSettings) {
    settings.value = next
    try {
      await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aiSettings: {
            token: next.token,
            uid: next.uid,
            model: next.model,
            baseUrl: next.baseUrl,
            productName: next.productName,
            companyId: next.companyId,
          },
        }),
      })
    } catch { /* ignore */ }
  }

  loadFromServer()

  return { settings, loaded, save, loadFromServer }
})
