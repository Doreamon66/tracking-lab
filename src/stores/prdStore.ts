import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { v4 as uuid } from 'uuid'
import type { PrdDocument } from '../types'
import { loadJson, saveJson } from '../utils/storage'

export interface CategoryConfig {
  name: string
  skillId: string | null
}

export const usePrdStore = defineStore('prd', () => {
  try { localStorage.removeItem('Tracking Lab.prd-documents') } catch { /* ignore */ }

  const documents = ref<PrdDocument[]>([])
  const activeId = ref<string | null>(loadJson('prd-active-id', null))
  const categories = ref<string[]>(loadJson('prd-categories', ['未分类']))

  // 分类 -> Skill 绑定（从后端加载）
  const categorySkillMap = ref<Record<string, string>>({})

  async function fetchCategoryConfig() {
    try {
      const resp = await fetch('/api/category-config')
      categorySkillMap.value = await resp.json()
    } catch { /* ignore */ }
  }

  async function setCategorySkill(category: string, skillId: string | null) {
    if (skillId) {
      categorySkillMap.value[category] = skillId
    } else {
      delete categorySkillMap.value[category]
    }
    await fetch('/api/category-config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(categorySkillMap.value),
    }).catch(() => {})
  }

  function getSkillForCategory(category: string): string | null {
    return categorySkillMap.value[category] || null
  }

  function getSkillForDoc(docId: string): string | null {
    const doc = documents.value.find(d => d.id === docId)
    if (!doc) return null
    return getSkillForCategory(doc.category || '未分类')
  }

  const groupedDocs = computed(() => {
    const groups: Record<string, PrdDocument[]> = {}
    for (const doc of documents.value) {
      const cat = doc.category || '未分类'
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(doc)
    }
    return groups
  })

  const categoryList = computed(() => {
    const cats = new Set(documents.value.map(d => d.category || '未分类'))
    for (const c of categories.value) cats.add(c)
    return Array.from(cats).sort((a, b) => {
      if (a === '未分类') return 1
      if (b === '未分类') return -1
      return a.localeCompare(b)
    })
  })

  function persistMeta() {
    saveJson('prd-active-id', activeId.value)
    saveJson('prd-categories', categories.value)
  }

  async function fetchCategories() {
    try {
      const resp = await fetch('/api/prd-categories')
      const serverCats: string[] = await resp.json()
      const merged = new Set([...categories.value, ...serverCats])
      categories.value = Array.from(merged)
      persistMeta()
    } catch {
      // ignore
    }
  }

  function addFromText(filename: string, rawText: string, category = '未分类') {
    const doc: PrdDocument = {
      id: uuid(),
      filename,
      rawText,
      uploadedAt: Date.now(),
      category,
    }
    documents.value.unshift(doc)
    activeId.value = doc.id
    persistMeta()
    return doc
  }

  function setActive(id: string) {
    activeId.value = id
    persistMeta()
  }

  function remove(id: string) {
    documents.value = documents.value.filter((d) => d.id !== id)
    if (activeId.value === id) {
      activeId.value = documents.value[0]?.id ?? null
    }
    persistMeta()
  }

  async function rename(id: string, newFilename: string) {
    const idx = documents.value.findIndex(d => d.id === id)
    if (idx !== -1) {
      documents.value[idx] = { ...documents.value[idx], filename: newFilename }
      try {
        await fetch('/api/prd', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, filename: newFilename }),
        })
      } catch (e) {
        console.error('重命名失败:', e)
      }
    }
  }

  async function updateCategory(id: string, category: string) {
    const idx = documents.value.findIndex(d => d.id === id)
    if (idx !== -1) {
      documents.value[idx] = { ...documents.value[idx], category }
      try {
        const resp = await fetch('/api/prd', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, category }),
        })
        if (!resp.ok) {
          const data = await resp.json().catch(() => ({}))
          console.error('更新分类失败:', data.error || resp.statusText)
        }
      } catch (e) {
        console.error('更新分类请求失败:', e)
      }
    }
  }

  function addCategory(name: string) {
    if (!categories.value.includes(name)) {
      categories.value.push(name)
      persistMeta()
    }
  }

  async function removeCategory(name: string) {
    categories.value = categories.value.filter(c => c !== name)
    for (const doc of documents.value) {
      if (doc.category === name) {
        await updateCategory(doc.id, '未分类')
      }
    }
    persistMeta()
  }

  async function renameCategory(oldName: string, newName: string) {
    const idx = categories.value.indexOf(oldName)
    if (idx !== -1) categories.value[idx] = newName
    for (const doc of documents.value) {
      if (doc.category === oldName) {
        await updateCategory(doc.id, newName)
      }
    }
    persistMeta()
  }

  const activeDoc = () => documents.value.find((d) => d.id === activeId.value) ?? null

  return {
    documents, activeId, categories, categorySkillMap, groupedDocs, categoryList,
    addFromText, setActive, remove, rename, activeDoc, updateCategory, fetchCategories, addCategory, removeCategory, renameCategory,
    fetchCategoryConfig, setCategorySkill, getSkillForCategory, getSkillForDoc,
  }
})
