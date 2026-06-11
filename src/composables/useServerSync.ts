import { ref, onMounted, onUnmounted } from 'vue'
import { usePrdStore } from '../stores/prdStore'
import { useRunStore } from '../stores/runStore'
import { useSkillStore } from '../stores/skillStore'

export function useServerSync() {
  const connected = ref(false)
  let es: EventSource | null = null

  function connect() {
    const prdStore = usePrdStore()
    const runStore = useRunStore()
    const skillStore = useSkillStore()
    skillStore.loadFromServer()

    es = new EventSource('/api/events')

    es.addEventListener('init', (e: MessageEvent) => {
      const data = JSON.parse(e.data)
      if (data.prdDocuments?.length) {
        for (const doc of data.prdDocuments) {
          if (!doc.category) doc.category = '未分类'
        }
        prdStore.documents = data.prdDocuments
        if (data.activePrdId) prdStore.activeId = data.activePrdId
      }
      if (data.runRecords?.length) {
        for (const rec of data.runRecords) {
          if (!runStore.records.find((r) => r.id === rec.id)) {
            runStore.records.unshift(rec)
          }
        }
        if (data.activeRunId) runStore.activeRunId = data.activeRunId
      }
      connected.value = true
    })

    es.addEventListener('prd-added', (e: MessageEvent) => {
      const { doc, activePrdId } = JSON.parse(e.data)
      if (!doc.category) doc.category = '未分类'
      if (!prdStore.documents.find((d) => d.id === doc.id)) {
        prdStore.documents.unshift(doc)
      }
      prdStore.activeId = activePrdId
    })

    es.addEventListener('run-added', (e: MessageEvent) => {
      const { record, activeRunId } = JSON.parse(e.data)
      if (!runStore.records.find((r) => r.id === record.id)) {
        runStore.records.unshift(record)
      }
      runStore.activeRunId = activeRunId
    })

    es.addEventListener('run-updated', (e: MessageEvent) => {
      const { record } = JSON.parse(e.data)
      const idx = runStore.records.findIndex((r) => r.id === record.id)
      if (idx !== -1) runStore.records[idx] = record
    })

    es.addEventListener('run-deleted', (e: MessageEvent) => {
      const { id, activeRunId } = JSON.parse(e.data)
      runStore.records = runStore.records.filter((r) => r.id !== id)
      runStore.activeRunId = activeRunId
    })

    es.onerror = () => {
      connected.value = false
      es?.close()
      setTimeout(connect, 3000)
    }
  }

  onMounted(connect)
  onUnmounted(() => es?.close())

  return { connected }
}
