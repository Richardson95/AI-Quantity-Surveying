<script setup>
import { computed } from 'vue'
import { Download, Trash2, Loader2, CheckCircle2, Eye } from 'lucide-vue-next'
import { useDocumentsStore } from '@/stores/documents'
import { useToast } from '@/composables/useToast'
import { downloadMock } from '@/utils/download'

const props = defineProps({
  scope: { type: String, required: true },
  // Restrict to drawing-like files (used by the BOQ / takeoff screens).
  drawingsOnly: { type: Boolean, default: false },
  selectable: { type: Boolean, default: false },
  selectedId: { type: String, default: '' },
  emptyText: { type: String, default: 'Nothing uploaded yet.' },
})

const emit = defineEmits(['select'])

const store = useDocumentsStore()
const { toast } = useToast()

const items = computed(() =>
  props.drawingsOnly ? store.drawingsFor(props.scope) : store.forScope(props.scope)
)

const kindColor = {
  Drawing: 'bg-danger/10 text-danger',
  CAD: 'bg-primary/10 text-primary-dark',
  BIM: 'bg-secondary/10 text-secondary-variant',
  Image: 'bg-warning/10 text-warning',
  Spreadsheet: 'bg-success/10 text-success',
  Document: 'bg-primary-light/20 text-primary-dark',
  File: 'bg-brand-border text-brand-muted',
}

// Re-download the exact bytes when we still hold them; otherwise hand back a
// readable placeholder rather than a broken link.
function download(doc) {
  if (doc.dataUrl) {
    const a = document.createElement('a')
    a.href = doc.dataUrl
    a.download = doc.name
    document.body.appendChild(a)
    a.click()
    a.remove()
    toast(`Downloading ${doc.name}`)
    return
  }
  downloadMock(
    `${doc.name}.txt`,
    `${doc.name}\n\nThis file was uploaded in a previous session and was too large to keep in browser storage.\nRe-upload it to download the original.\n`
  )
  toast(`${doc.name} is no longer cached — re-upload to get the original`, 'warning')
}

function preview(doc) {
  if (!doc.dataUrl) {
    toast('No cached copy to preview — re-upload the file', 'warning')
    return
  }
  window.open(doc.dataUrl, '_blank', 'noopener')
}

function remove(doc) {
  store.remove(doc.id)
  toast(`${doc.name} removed`, 'info')
}

function when(iso) {
  const d = new Date(iso)
  const mins = Math.round((Date.now() - d.getTime()) / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins} min ago`
  if (mins < 1440) return `${Math.round(mins / 60)} hr ago`
  return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })
}
</script>

<template>
  <div>
    <p v-if="!items.length" class="rounded-xl border border-dashed border-brand-border-light px-4 py-8 text-center text-sm text-brand-muted">
      {{ emptyText }}
    </p>

    <div v-else class="space-y-2">
      <div
        v-for="d in items"
        :key="d.id"
        class="group flex items-center gap-3 rounded-xl border p-3 transition-colors"
        :class="[
          selectable && selectedId === d.id
            ? 'border-primary bg-primary/5'
            : 'border-brand-border-light hover:border-primary/30 hover:bg-brand-bg',
          selectable ? 'cursor-pointer' : '',
        ]"
        @click="selectable && emit('select', d)"
      >
        <div class="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-[10px] font-bold uppercase" :class="kindColor[d.kind]">
          {{ d.ext }}
        </div>

        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-semibold text-secondary">{{ d.name }}</p>
          <p class="truncate text-xs text-brand-light">
            {{ d.sizeLabel }} · {{ when(d.uploadedAt) }}
            <span v-if="d.status === 'Ready' && d.elements"> · {{ d.elements }} elements detected</span>
          </p>
        </div>

        <span
          class="badge shrink-0"
          :class="d.status === 'Ready' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'"
        >
          <component :is="d.status === 'Ready' ? CheckCircle2 : Loader2" class="h-3 w-3" :class="d.status !== 'Ready' && 'animate-spin'" />
          {{ d.status === 'Ready' ? 'Analyzed' : 'Analyzing' }}
        </span>

        <div class="flex shrink-0 items-center gap-1" @click.stop>
          <button class="grid h-8 w-8 place-items-center rounded-lg text-brand-light hover:bg-brand-border-light hover:text-primary" title="Preview" @click="preview(d)">
            <Eye class="h-4 w-4" />
          </button>
          <button class="grid h-8 w-8 place-items-center rounded-lg text-brand-light hover:bg-brand-border-light hover:text-primary" title="Download" @click="download(d)">
            <Download class="h-4 w-4" />
          </button>
          <button class="grid h-8 w-8 place-items-center rounded-lg text-brand-light hover:bg-danger/10 hover:text-danger" title="Remove" @click="remove(d)">
            <Trash2 class="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
