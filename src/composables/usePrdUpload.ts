import { ref } from 'vue'
import { ElMessage } from 'element-plus'

export function usePrdUpload() {
  const wpsUrl = ref('')
  const wpsLoading = ref(false)

  async function importFromWps() {
    const url = wpsUrl.value.trim()
    if (!url) {
      ElMessage.warning('请输入金山文档链接')
      return
    }
    if (!/kdocs\.cn/i.test(url)) {
      ElMessage.warning('请输入包含 kdocs.cn 的金山文档链接')
      return
    }

    wpsLoading.value = true
    try {
      const resp = await fetch('/api/wps-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })

      const data = await resp.json()

      if (!resp.ok || data.error) {
        throw new Error(data.error || `请求失败 (${resp.status})`)
      }

      wpsUrl.value = ''
      ElMessage.success(`已导入：${data.filename}`)
    } catch (e) {
      const msg = e instanceof Error ? e.message : '导入失败'
      ElMessage.error(msg)
    } finally {
      wpsLoading.value = false
    }
  }

  return { wpsUrl, wpsLoading, importFromWps }
}
