<script setup lang="ts">
import MarkdownIt from 'markdown-it'
import { computed } from 'vue'

const props = defineProps<{
  content: string
}>()

const md = new MarkdownIt({ html: true, linkify: true, breaks: true, typographer: true })

const html = computed(() => md.render(props.content || ''))
</script>

<template>
  <div class="markdown-body" v-html="html" />
</template>

<style scoped>
.markdown-body { font-size: 14px; line-height: 1.7; color: var(--text-primary); word-break: break-word; }

.markdown-body :deep(h1) { font-size: 22px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 8px; margin: 20px 0 12px; font-weight: 700; }
.markdown-body :deep(h2) { font-size: 18px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 6px; margin: 18px 0 10px; font-weight: 700; }
.markdown-body :deep(h3) { font-size: 15px; margin: 16px 0 8px; font-weight: 600; }
.markdown-body :deep(h4) { font-size: 14px; margin: 14px 0 6px; font-weight: 600; }
.markdown-body :deep(p) { margin: 8px 0; }
.markdown-body :deep(ul), .markdown-body :deep(ol) { margin: 8px 0; padding-left: 24px; }
.markdown-body :deep(li) { margin: 4px 0; }

.markdown-body :deep(blockquote) {
  margin: 8px 0; padding: 8px 16px;
  border-left: 3px solid var(--accent); background: var(--accent-light); color: var(--text-secondary);
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
}

.markdown-body :deep(table) { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 13px; }
.markdown-body :deep(thead) { background: var(--bg-hover); }
.markdown-body :deep(th), .markdown-body :deep(td) { border: 1px solid var(--border-light); padding: 8px 12px; text-align: left; }
.markdown-body :deep(th) { font-weight: 600; color: var(--text-primary); }
.markdown-body :deep(tr:nth-child(even)) { background: var(--bg-primary); }

.markdown-body :deep(code) {
  background: var(--bg-hover); padding: 2px 6px; border-radius: 4px;
  font-size: 12px; font-family: Consolas, 'JetBrains Mono', monospace;
}

.markdown-body :deep(pre) {
  background: #1a1a2e; color: #e0e0e0; padding: 16px;
  border-radius: var(--radius-sm); overflow: auto; margin: 12px 0;
}

.markdown-body :deep(pre code) { background: none; padding: 0; border-radius: 0; color: inherit; font-size: 13px; line-height: 1.6; }
.markdown-body :deep(hr) { border: none; border-top: 1px solid var(--border-subtle); margin: 16px 0; }
.markdown-body :deep(img) { max-width: 100%; border-radius: var(--radius-sm); display: block; margin: 4px 0; }
.markdown-body :deep(td img) { max-width: 280px; max-height: 200px; object-fit: contain; display: inline-block; margin: 2px; cursor: pointer; }
.markdown-body :deep(a) { color: var(--accent); text-decoration: none; }
.markdown-body :deep(a:hover) { text-decoration: underline; }
.markdown-body :deep(strong) { font-weight: 600; }
</style>
