<script setup>
import { computed, ref } from 'vue'
import { Download, Trash2, Loader2, CheckCircle2, Eye, Pencil, Check, X, AlertTriangle, Clock, FileText } from 'lucide-vue-next'
import { useDocumentsStore } from '@/stores/documents'
import { useToast } from '@/composables/useToast'

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

// Ready      the engine read it and recorded what it found
// Analyzing  a worker has it now
// Pending    stored, but the engine is not configured so nothing will pick it up
// Failed     the engine tried and could not read it
const statusStyle = {
  Ready: { label: 'Analyzed', cls: 'bg-success/10 text-success', icon: CheckCircle2 },
  Analyzing: { label: 'Analyzing', cls: 'bg-warning/10 text-warning', icon: Loader2 },
  Pending: { label: 'Not analyzed', cls: 'bg-brand-border text-brand-muted', icon: Clock },
  Failed: { label: 'Could not read', cls: 'bg-danger/10 text-danger', icon: AlertTriangle },
}

const kindColor = {
  Drawing: 'bg-danger/10 text-danger',
  CAD: 'bg-primary/10 text-primary-dark',
  BIM: 'bg-secondary/10 text-secondary-variant',
  Image: 'bg-warning/10 text-warning',
  Spreadsheet: 'bg-success/10 text-success',
  Document: 'bg-primary-light/20 text-primary-dark',
  File: 'bg-brand-border text-brand-muted',
}

// The bytes come from a short-lived signed URL the store asks the server for.
// This only follows the link it is given — it never assumes one exists.
async function download(doc) {
  const url = await store.downloadUrl(doc)
  if (!url) {
    toast(`${doc.name} could not be fetched — try again`, 'warning')
    return
  }

  const a = document.createElement('a')
  a.href = url
  a.download = doc.name
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  toast(`Downloading ${doc.name}`)
}

async function preview(doc) {
  const { url, notice } = await store.previewUrl(doc)
  if (!url) {
    // There is no server-side renderer for CAD and BIM, and saying so beats
    // opening a tab that cannot display anything.
    toast(notice || 'No preview is available for this file', 'warning')
    return
  }
  window.open(url, '_blank', 'noopener')
}

// Renaming was reachable through the API and the store but had no control.
const renamingId = ref('')
const draftName = ref('')

function startRename(doc) {
  renamingId.value = doc.id
  draftName.value = doc.name
}

async function commitRename(doc) {
  const next = draftName.value.trim()
  renamingId.value = ''
  if (!next || next === doc.name) return
  try {
    await store.rename(doc.id, next)
    toast('Renamed')
  } catch (err) {
    toast(err.message || 'That file could not be renamed', 'warning')
  }
}

async function remove(doc) {
  await store.remove(doc.id)
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

        <div class="min-w-0 flex-1" @click.stop>
          <input v-if="renamingId === d.id" v-model="draftName"
            class="w-full rounded-md border border-brand-border px-2 py-1 text-sm font-semibold text-secondary focus:border-primary focus:outline-none"
            @keydown.enter="commitRename(d)" @keydown.esc="renamingId = ''" @blur="commitRename(d)" />
          <p v-else class="truncate text-sm font-semibold text-secondary">{{ d.name }}</p>
          <p class="truncate text-xs text-brand-light">
            {{ d.sizeLabel }} · {{ when(d.uploadedAt) }}
            <span v-if="d.status === 'Ready' && d.elements"> · {{ d.elements }} elements detected</span>
          </p>
          <!-- A failed read says why. "Could not read" on its own leaves the
               user re-uploading the same file and getting the same silence. -->
          <p v-if="d.status === 'Failed' && d.analysisError" class="mt-0.5 truncate text-xs text-danger"
            :title="d.analysisError">
            {{ d.analysisError }}
          </p>
        </div>

        <!-- Four real states. This used to collapse everything that was not
             "Ready" into a spinning "Analyzing", so a failed read — and a
             document queued behind an engine that is switched off — both span
             forever, implying work that was never going to happen. -->
        <span class="badge shrink-0" :class="statusStyle[d.status]?.cls || 'bg-brand-border text-brand-muted'">
          <component :is="statusStyle[d.status]?.icon || FileText" class="h-3 w-3"
            :class="d.status === 'Analyzing' && 'animate-spin'" />
          {{ statusStyle[d.status]?.label || d.status }}
        </span>

        <div class="flex shrink-0 items-center gap-1" @click.stop>
          <button class="grid h-8 w-8 place-items-center rounded-lg text-brand-light hover:bg-brand-border-light hover:text-primary" title="Rename" @click="startRename(d)">
            <Pencil class="h-4 w-4" />
          </button>
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
