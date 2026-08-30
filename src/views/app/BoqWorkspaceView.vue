<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import {
  Upload, Sparkles, Download, Search, Plus, FileSpreadsheet, Check,
  Pencil, Trash2, Cpu, Layers, X,
} from 'lucide-vue-next'
import { useProjectsStore } from '@/stores/projects'
import { useDocumentsStore } from '@/stores/documents'
import { buildBoq, SOURCE_LABELS } from '@/services/analysis'
import { useToast } from '@/composables/useToast'
import { normalizeUnit, COMMON_UNITS, unitsCompatible, dimensionOf } from '@/utils/units'
import { formatFull } from '@/utils/format'
import FileDropzone from '@/components/FileDropzone.vue'
import DocumentList from '@/components/DocumentList.vue'

const store = useProjectsStore()
const documents = useDocumentsStore()
const { toast } = useToast()
const query = ref('')
const generating = ref(false)
const activeSection = ref('All')
const editingId = ref(null)

// This workspace is scoped to one project. Which one comes from the store —
// with a backend that is whatever the user last opened, not a hard-coded id.
const projectId = computed(() => store.currentProjectId)
const dropzone = ref(null)
const selectedDocId = ref('')

async function loadProject(id) {
  if (!id) return
  await Promise.all([
    store.fetchBoq(id).catch((e) => toast(e.message, 'warning')),
    documents.fetchForScope(id).catch(() => {}),
  ])
}

onMounted(async () => {
  await store.ensureProject()
  await loadProject(projectId.value)
})

// Switching project reloads both halves of the screen.
watch(projectId, (id) => loadProject(id))

const drawings = computed(() => documents.drawingsFor(projectId.value))
const activeDrawing = computed(
  () => drawings.value.find((d) => d.id === selectedDocId.value) || drawings.value[0] || null
)

const sections = computed(() => ['All', ...new Set(store.boqItems.map((i) => i.section))])
const filtered = computed(() =>
  store.boqItems.filter((i) => {
    const s = activeSection.value === 'All' || i.section === activeSection.value
    const q = i.desc.toLowerCase().includes(query.value.toLowerCase()) || i.code.toLowerCase().includes(query.value.toLowerCase())
    return s && q
  })
)
const total = computed(() => filtered.value.reduce((a, i) => a + i.qty * i.rate, 0))

// Notes come back with the BOQ, so they always describe what was produced.
// The stored revision carries its own notes too — a convention warning on a
// line survives a reload, because it is a property of the bill, not the click
// that made it.
const localNotes = ref([])
const suggestions = computed(() => [...store.boqNotes, ...localNotes.value])

// Where the current figures came from. A stored revision states its own
// provenance; with no revision, nothing has been measured and the UI must not
// imply otherwise.
const boqSource = computed(() => (store.boqSource === 'engine' ? 'engine' : 'none'))
const provenance = computed(() => SOURCE_LABELS[boqSource.value])
const suggColor = { warning: 'border-warning/30 bg-warning/5', success: 'border-success/30 bg-success/5', info: 'border-primary/30 bg-primary/5' }
const suggDot = { warning: 'bg-warning', success: 'bg-success', info: 'bg-primary' }

// The BOQ is built from the uploaded drawings — with none uploaded there is
// nothing to derive it from, so say so rather than inventing quantities.
async function generate() {
  if (!drawings.value.length) {
    toast('Upload a drawing or plan first — the BOQ is generated from them', 'warning')
    return
  }
  if (generating.value) return

  // A drawing still being read has no measurements to bill from yet.
  const pending = drawings.value.filter((d) => d.status === 'Analyzing').length
  if (pending && !drawings.value.some((d) => d.status === 'Ready')) {
    toast(`Still reading ${pending} drawing${pending > 1 ? 's' : ''} — try again in a moment`, 'info')
    return
  }

  generating.value = true
  const result = await buildBoq(drawings.value, { projectId: projectId.value })
  generating.value = false

  store.replaceBoqItems(result.items, {
    source: result.failed ? null : 'engine',
    notes: result.notes,
    revision: result.revision ?? null,
  })
  localNotes.value = []
  activeSection.value = 'All'
  editingId.value = null

  if (result.failed) {
    // A refusal the user can act on — nothing analysed yet, out of AI credits.
    toast(result.failed, 'warning')
    return
  }
  if (!result.items.length) {
    toast('Nothing billable came back from those drawings', 'warning')
    return
  }
  toast(
    `Measured ${result.items.length} items from ` +
      `${result.sources.length} drawing${result.sources.length > 1 ? 's' : ''}`
  )
}
function uploadDrawing() {
  dropzone.value?.browse()
}
function onUploaded(added) {
  selectedDocId.value = added[0].id
  // The engine reads the drawing server-side, so generating now would bill from
  // nothing. Wait for the analysis to land, then offer to build the bill.
  toast('Analyzing — generate the BOQ once the drawing is read', 'info')
}
function selectDrawing(doc) {
  selectedDocId.value = doc.id
}

async function exportBoq() {
  // Prefer the server's own CSV: it is rendered from the stored revision, so
  // the export and the bill cannot disagree. It also carries the confidence
  // and source columns the on-screen table does not show.
  const blob = await store.exportBoq(projectId.value)
  if (!blob) {
    toast('There is nothing to export yet', 'warning')
    return
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${store.current?.name || 'project'} — BOQ.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
  toast('BOQ exported')
}
// Adding a line used to append a blank "New item — edit description" row.
// Collect the actual measured item instead.
const addOpen = ref(false)
const draft = ref(blankItem())
const draftError = ref('')

const ALL_SECTIONS = [
  'Substructure', 'Superstructure', 'Roofing',
  'Finishes', 'Doors & Windows', 'Services', 'External Works',
]

function blankItem() {
  return {
    desc: '',
    section: activeSection.value === 'All' ? 'Substructure' : activeSection.value,
    unit: '',
    qty: null,
    rate: null,
  }
}

function openAddItem() {
  draft.value = blankItem()
  draftError.value = ''
  addOpen.value = true
}

const saving = ref(false)

async function addItem() {
  if (saving.value) return
  const desc = draft.value.desc.trim()
  if (!desc) {
    draftError.value = 'Describe the work item.'
    return
  }
  if (!draft.value.unit.trim()) {
    draftError.value = 'Set a unit — m², m³, no, tonne and so on.'
    return
  }
  if (!(Number(draft.value.qty) > 0)) {
    draftError.value = 'Enter a quantity greater than zero.'
    return
  }
  if (!(Number(draft.value.rate) >= 0)) {
    draftError.value = 'Enter a rate.'
    return
  }

  saving.value = true
  try {
    // One call with the whole line. A hand-entered item carries no confidence —
    // there is nothing a machine was confident about — and the store and server
    // both leave it null rather than stamping it 100%.
    await store.addBoqItem({
      desc,
      section: draft.value.section,
      unit: normalizeUnit(draft.value.unit),
      qty: Number(draft.value.qty),
      rate: Number(draft.value.rate),
    })
    activeSection.value = 'All'
    query.value = ''
    addOpen.value = false
    toast(`${desc} added to ${draft.value.section}`)
  } catch (err) {
    draftError.value = err.message || 'That item could not be added.'
  } finally {
    saving.value = false
  }
}
function editItem(item) {
  editingId.value = editingId.value === item.id ? null : item.id
}
async function commitEdit(item, field, value) {
  // The rate is quoted per the item's current unit. Switching m² to m without
  // changing the rate silently mis-prices the line, so say so.
  if (field === 'unit') {
    const next = normalizeUnit(value)
    if (next && item.rate > 0 && !unitsCompatible(item.unit, next)) {
      toast(
        `${item.code}: rate is per ${item.unit} (${dimensionOf(item.unit)}) — check it still applies per ${next}`,
        'warning'
      )
    }
  }
  try {
    await store.updateBoqItem(item.id, { [field]: value })
  } catch (err) {
    toast(err.message || 'That change could not be saved', 'warning')
    // The optimistic edit no longer matches the server, so re-read the bill.
    await store.fetchBoq().catch(() => {})
  }
}
function finishEdit() {
  if (editingId.value === null) return
  editingId.value = null
  toast('Item updated')
}
async function deleteItem(item) {
  try {
    await store.removeBoqItem(item)
    toast(`Removed ${item.code}`)
  } catch (err) {
    toast(err.message || 'That item could not be removed', 'warning')
  }
}
function confidenceColor(c) {
  if (c >= 95) return 'text-success'
  if (c >= 90) return 'text-primary-dark'
  return 'text-warning'
}
</script>

<template>
  <div class="space-y-6">
    <datalist id="unit-options">
      <option v-for="u in COMMON_UNITS" :key="u" :value="u" />
    </datalist>
    <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h2 class="font-display text-2xl font-bold text-secondary">BOQ Workspace</h2>
        <p class="mt-1 text-brand-muted">Lekki 4-Bedroom Duplex · <span class="font-mono text-sm">PRJ-1042</span></p>
        <p v-if="store.boqSources.length" class="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-brand-light">
          <span class="badge" :class="boqSource === 'engine' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'">
            <Cpu class="h-3 w-3" /> {{ provenance.label }}
          </span>
          <span>from</span>
          <span v-for="(s, i) in store.boqSources" :key="s" class="font-medium text-brand-muted">
            {{ s }}<span v-if="i < store.boqSources.length - 1">,</span>
          </span>
        </p>
        <p v-if="store.boqSources.length && boqSource !== 'engine'" class="mt-1 max-w-2xl text-xs text-warning">
          {{ provenance.detail }}
        </p>
        <p v-else class="mt-1 flex items-center gap-1.5 text-xs text-warning">
          <Cpu class="h-3.5 w-3.5 shrink-0" /> Sample BOQ — upload a drawing and regenerate to build it from your own plans.
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <button class="btn-outline btn-md" @click="uploadDrawing"><Upload class="h-4 w-4" /> Upload drawing</button>
        <button class="btn-outline btn-md" @click="exportBoq"><Download class="h-4 w-4" /> Export</button>
        <button
          class="btn-primary btn-md"
          :disabled="generating || !drawings.length"
          :title="drawings.length ? 'Rebuild the BOQ from the uploaded drawings' : 'Upload a drawing first'"
          @click="generate"
        >
          <Sparkles class="h-4 w-4" :class="{ 'animate-spin': generating }" />
          {{ generating ? 'Reading drawings…' : 'Regenerate BOQ' }}
        </button>
      </div>
    </div>

    <div class="grid gap-6 xl:grid-cols-3">
      <!-- Left: drawing viewer + AI -->
      <div class="space-y-6">
        <!-- Drawing viewer -->
        <div class="card overflow-hidden">
          <div class="flex items-center justify-between border-b border-brand-border-light px-4 py-3">
            <span class="flex min-w-0 items-center gap-2 text-sm font-semibold text-secondary">
              <Layers class="h-4 w-4 shrink-0 text-primary" />
              <span class="truncate">{{ activeDrawing ? activeDrawing.name : 'Ground Floor Plan.pdf' }}</span>
            </span>
            <span class="badge shrink-0"
              :class="generating ? 'bg-warning/10 text-warning' : boqSource === 'engine' ? 'bg-success/10 text-success' : 'bg-brand-border text-brand-muted'">
              <component :is="generating ? Cpu : Check" class="h-3 w-3" />
              {{ generating ? 'Reading…' : boqSource === 'engine' ? 'Analyzed' : 'Not analyzed' }}
            </span>
          </div>
          <div class="relative aspect-[4/3] bg-secondary">
            <!-- Faux blueprint -->
            <svg viewBox="0 0 400 300" class="h-full w-full">
              <defs>
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#2D3D63" stroke-width="0.5" />
                </pattern>
              </defs>
              <rect width="400" height="300" fill="#1B2540" />
              <rect width="400" height="300" fill="url(#grid)" />
              <rect x="60" y="50" width="280" height="200" fill="none" stroke="#6DCBFB" stroke-width="1.5" />
              <line x1="60" y1="130" x2="200" y2="130" stroke="#6DCBFB" stroke-width="1" />
              <line x1="200" y1="50" x2="200" y2="250" stroke="#6DCBFB" stroke-width="1" />
              <rect x="80" y="70" width="100" height="40" fill="none" stroke="#1CA5F6" stroke-width="1" />
              <rect x="220" y="70" width="100" height="40" fill="none" stroke="#1CA5F6" stroke-width="1" />
              <rect x="220" y="150" width="100" height="80" fill="none" stroke="#1CA5F6" stroke-width="1" />
              <circle cx="130" cy="90" r="3" fill="#2DC875" />
              <circle cx="270" cy="90" r="3" fill="#2DC875" />
              <text x="100" y="95" fill="#9AA3BB" font-size="8">Bedroom 1</text>
              <text x="240" y="95" fill="#9AA3BB" font-size="8">Living</text>
              <text x="240" y="195" fill="#9AA3BB" font-size="8">Kitchen</text>
            </svg>
            <img
              v-if="activeDrawing && activeDrawing.kind === 'Image' && activeDrawing.dataUrl"
              :src="activeDrawing.dataUrl"
              :alt="activeDrawing.name"
              class="absolute inset-0 h-full w-full object-contain"
            />
            <div class="absolute bottom-3 left-3 flex items-center gap-2 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs text-white backdrop-blur">
              <Cpu class="h-3.5 w-3.5 text-primary-light" />
              <template v-if="boqSource === 'engine'">
                {{ activeDrawing && activeDrawing.elements ? activeDrawing.elements : 0 }} elements detected
              </template>
              <template v-else>Preview only — drawing not read</template>
            </div>
          </div>
        </div>

        <!-- Drawings & plans -->
        <div class="card p-5">
          <div class="mb-4 flex items-center justify-between gap-2">
            <h3 class="font-display font-bold text-secondary">Drawings &amp; Plans</h3>
            <span v-if="drawings.length" class="badge bg-primary/10 text-primary-dark">{{ drawings.length }}</span>
          </div>

          <FileDropzone
            ref="dropzone"
            :scope="projectId"
            compact
            label="Drop drawings or plans here"
            @uploaded="onUploaded"
          />

          <div class="mt-4">
            <p class="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-light">
              Uploaded drawings
              <span v-if="drawings.length" class="text-brand-muted">· {{ drawings.length }}</span>
            </p>
            <DocumentList
              :scope="projectId"
              drawings-only
              selectable
              :selected-id="activeDrawing ? activeDrawing.id : ''"
              empty-text="No drawings yet — drop a plan above and it will appear here."
              @select="selectDrawing"
            />
          </div>
        </div>

        <!-- AI suggestions -->
        <div class="card p-5">
          <div class="mb-4 flex items-center gap-2">
            <div class="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary"><Sparkles class="h-4 w-4" /></div>
            <h3 class="font-display font-bold text-secondary">
              {{ boqSource === 'engine' ? 'AI Suggestions' : 'Bill Review' }}
            </h3>
          </div>
          <div v-if="suggestions.length" class="space-y-2.5">
            <div v-for="(s, i) in suggestions" :key="i" class="flex gap-3 rounded-xl border p-3" :class="suggColor[s.type]">
              <span class="mt-1.5 h-2 w-2 shrink-0 rounded-full" :class="suggDot[s.type]"></span>
              <p class="text-sm text-secondary">{{ s.text }}</p>
            </div>
          </div>
          <p v-else class="rounded-xl border border-dashed border-brand-border-light px-4 py-6 text-center text-sm text-brand-muted">
            Generate a BOQ from your drawings and the AI review will appear here.
          </p>
        </div>
      </div>

      <!-- Right: BOQ table -->
      <div class="card flex flex-col xl:col-span-2">
        <div class="flex flex-col gap-3 border-b border-brand-border-light p-5 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex items-center gap-2">
            <FileSpreadsheet class="h-5 w-5 text-primary" />
            <h3 class="font-display font-bold text-secondary">Bill of Quantities</h3>
            <span class="badge bg-primary/10 text-primary-dark">{{ filtered.length }} items</span>
          </div>
          <div class="relative">
            <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-light" />
            <input v-model="query" class="input w-full pl-9 sm:w-56" placeholder="Search items…" />
          </div>
        </div>

        <!-- Section tabs -->
        <div class="flex gap-2 overflow-x-auto border-b border-brand-border-light px-5 py-3 no-scrollbar">
          <button v-for="s in sections" :key="s" @click="activeSection = s"
            class="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
            :class="activeSection === s ? 'bg-secondary text-white' : 'text-brand-muted hover:bg-brand-border-light'">
            {{ s }}
          </button>
        </div>

        <!-- Table -->
        <div class="flex-1 overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-brand-border-light text-left text-xs font-semibold uppercase tracking-wide text-brand-light">
                <th class="px-5 py-3">Code</th>
                <th class="px-2 py-3">Description</th>
                <th class="px-2 py-3 text-right">Qty</th>
                <th class="px-2 py-3">Unit</th>
                <th class="px-2 py-3 text-right">Rate</th>
                <th class="px-2 py-3 text-right">Amount</th>
                <th class="px-2 py-3 text-center">AI</th>
                <th class="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in filtered" :key="item.id" class="group border-b border-brand-border-light transition-colors hover:bg-brand-bg">
                <!-- Codes are derived from the item's section and position in
                     the bill and renumber themselves on every add or delete, so
                     they are not editable once the server owns them. -->
                <td class="px-5 py-3 font-mono text-xs text-brand-muted">
                  <input v-if="editingId === item.id" :value="item.code" class="w-16 rounded-md border border-brand-border px-1.5 py-1 font-mono text-xs focus:border-primary focus:outline-none"
                    @input="commitEdit(item, 'code', $event.target.value)" @keydown.enter="finishEdit" />
                  <span v-else>{{ item.code }}</span>
                </td>
                <td class="px-2 py-3 text-secondary">
                  <input v-if="editingId === item.id" :value="item.desc" class="w-full rounded-md border border-brand-border px-2 py-1 text-sm focus:border-primary focus:outline-none"
                    @input="commitEdit(item, 'desc', $event.target.value)" @keydown.enter="finishEdit" />
                  <template v-else>
                    <span>{{ item.desc }}</span>
                    <span v-if="item.sources && item.sources.length" class="block truncate text-[11px] text-brand-light" :title="item.sources.join(', ')">
                      from {{ item.sources.join(', ') }}
                    </span>
                  </template>
                </td>
                <td class="px-2 py-3 text-right font-medium text-secondary">
                  <input v-if="editingId === item.id" :value="item.qty" type="number" min="0" step="any" class="w-20 rounded-md border border-brand-border px-2 py-1 text-right text-sm focus:border-primary focus:outline-none"
                    @input="commitEdit(item, 'qty', $event.target.value)" @keydown.enter="finishEdit" />
                  <span v-else>{{ item.qty.toLocaleString() }}</span>
                </td>
                <td class="px-2 py-3 text-brand-muted">
                  <input v-if="editingId === item.id" :value="item.unit" class="w-14 rounded-md border border-brand-border px-1.5 py-1 text-sm focus:border-primary focus:outline-none"
                    @input="commitEdit(item, 'unit', $event.target.value)" @keydown.enter="finishEdit" />
                  <span v-else>{{ item.unit }}</span>
                </td>
                <td class="px-2 py-3 text-right text-brand-muted">
                  <input v-if="editingId === item.id" :value="item.rate" type="number" min="0" step="any" class="w-28 rounded-md border border-brand-border px-2 py-1 text-right text-sm focus:border-primary focus:outline-none"
                    @input="commitEdit(item, 'rate', $event.target.value)" @keydown.enter="finishEdit" />
                  <span v-else>{{ item.rate.toLocaleString() }}</span>
                </td>
                <td class="px-2 py-3 text-right font-semibold text-secondary">{{ (item.qty * item.rate).toLocaleString() }}</td>
                <td class="px-2 py-3 text-center">
                  <span v-if="boqSource === 'engine' && item.confidence != null"
                    class="text-xs font-bold" :class="confidenceColor(item.confidence)">{{ item.confidence }}%</span>
                  <span v-else class="text-xs text-brand-light" title="Confidence is only reported for measured quantities">—</span>
                </td>
                <td class="px-5 py-3">
                  <div class="flex justify-end gap-1 transition-opacity group-hover:opacity-100" :class="editingId === item.id ? 'opacity-100' : 'opacity-0'">
                    <button class="grid h-7 w-7 place-items-center rounded-lg hover:bg-brand-border-light"
                      :class="editingId === item.id ? 'bg-primary/10 text-primary' : 'text-brand-light hover:text-primary'"
                      :title="editingId === item.id ? 'Done editing' : 'Edit item'"
                      @click="editingId === item.id ? finishEdit() : editItem(item)">
                      <component :is="editingId === item.id ? Check : Pencil" class="h-3.5 w-3.5" />
                    </button>
                    <button class="grid h-7 w-7 place-items-center rounded-lg text-brand-light hover:bg-danger/10 hover:text-danger" @click="deleteItem(item)"><Trash2 class="h-3.5 w-3.5" /></button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <p v-if="store.boqLoading && !filtered.length" class="px-5 py-14 text-center text-sm text-brand-muted">
            Loading the bill…
          </p>
          <p v-else-if="!filtered.length" class="px-5 py-14 text-center text-sm text-brand-muted">
            <template v-if="store.boqItems.length">No items match that search.</template>
            <template v-else-if="drawings.length">
              No bill yet — generate one from the {{ drawings.length }} uploaded drawing{{ drawings.length > 1 ? 's' : '' }}, or add a line by hand.
            </template>
            <template v-else>
              Upload a drawing to generate a bill, or add lines by hand.
            </template>
          </p>
        </div>

        <!-- Footer total -->
        <div class="flex items-center justify-between border-t border-brand-border-light bg-brand-bg px-5 py-4">
          <button class="flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline" @click="openAddItem"><Plus class="h-4 w-4" /> Add item</button>
          <div class="text-right">
            <p class="text-xs text-brand-muted">{{ activeSection === 'All' ? 'Grand total' : activeSection + ' total' }}</p>
            <p class="font-display text-xl font-bold text-secondary">{{ formatFull(total) }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Add BOQ item -->
    <transition name="page">
      <div v-if="addOpen" class="fixed inset-0 z-[60] flex items-end justify-center bg-secondary/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" @click.self="addOpen = false">
        <div class="w-full max-w-lg overflow-hidden rounded-t-2xl bg-white shadow-card-hover sm:rounded-2xl">
          <div class="flex items-center justify-between border-b border-brand-border-light px-6 py-4">
            <h3 class="font-display text-lg font-bold text-secondary">Add a BOQ item</h3>
            <button class="btn btn-ghost btn-sm" @click="addOpen = false"><X class="h-5 w-5" /></button>
          </div>
          <form class="space-y-4 p-6" @submit.prevent="addItem">
            <div>
              <label class="label">Description</label>
              <input v-model="draft.desc" class="input" placeholder="225mm sandcrete block wall in cement mortar" autofocus />
            </div>
            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label class="label">Section</label>
                <select v-model="draft.section" class="input">
                  <option v-for="sec in ALL_SECTIONS" :key="sec" :value="sec">{{ sec }}</option>
                </select>
              </div>
              <div>
                <label class="label">Unit</label>
                <input v-model="draft.unit" list="unit-options" class="input" placeholder="m², m³, no, tonne…"
                  @change="draft.unit = normalizeUnit(draft.unit)" />
              </div>
              <div>
                <label class="label">Quantity</label>
                <input v-model.number="draft.qty" type="number" min="0" step="any" class="input" placeholder="1860" />
              </div>
              <div>
                <label class="label">Rate (₦)</label>
                <input v-model.number="draft.rate" type="number" min="0" step="any" class="input" placeholder="6800" />
              </div>
            </div>
            <p v-if="draft.qty > 0 && draft.rate > 0" class="rounded-xl bg-brand-bg px-4 py-3 text-sm text-brand-muted">
              Amount: <span class="font-bold text-secondary">{{ formatFull(draft.qty * draft.rate) }}</span>
            </p>
            <p v-if="draftError" class="text-sm font-medium text-danger">{{ draftError }}</p>
            <div class="flex gap-2 pt-2">
              <button type="button" class="btn-outline btn-md flex-1" :disabled="saving" @click="addOpen = false">Cancel</button>
              <button type="submit" class="btn-primary btn-md flex-1" :disabled="saving">
                <Plus class="h-4 w-4" /> {{ saving ? 'Adding…' : 'Add item' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </transition>
  </div>
</template>
