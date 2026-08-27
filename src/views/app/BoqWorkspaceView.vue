<script setup>
import { ref, computed } from 'vue'
import {
  Upload, Sparkles, Download, Search, Plus, FileSpreadsheet, Check,
  Pencil, Trash2, Cpu, Layers, X,
} from 'lucide-vue-next'
import { useProjectsStore } from '@/stores/projects'
import { useDocumentsStore } from '@/stores/documents'
import { generateBoq, reviewBoq } from '@/utils/boqGenerator'
import { useToast } from '@/composables/useToast'
import { downloadMock } from '@/utils/download'
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

// This workspace is scoped to one project, so its drawings live under that id.
const PROJECT_ID = 'PRJ-1042'
const dropzone = ref(null)
const selectedDocId = ref('')

const drawings = computed(() => documents.drawingsFor(PROJECT_ID))
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

// Suggestions are derived from the BOQ that was actually produced, so they
// never reference item codes that no longer exist.
const suggestions = computed(() =>
  store.boqSources.length ? reviewBoq(store.boqItems, drawings.value) : []
)
const suggColor = { warning: 'border-warning/30 bg-warning/5', success: 'border-success/30 bg-success/5', info: 'border-primary/30 bg-primary/5' }
const suggDot = { warning: 'bg-warning', success: 'bg-success', info: 'bg-primary' }

// The BOQ is built from the uploaded drawings — with none uploaded there is
// nothing to derive it from, so say so rather than inventing quantities.
function generate() {
  if (!drawings.value.length) {
    toast('Upload a drawing or plan first — the BOQ is generated from them', 'warning')
    return
  }
  if (generating.value) return

  generating.value = true
  setTimeout(() => {
    const { items, sources } = generateBoq(drawings.value)
    store.replaceBoqItems(items)
    activeSection.value = 'All'
    editingId.value = null
    generating.value = false
    toast(`BOQ generated from ${sources.length} drawing${sources.length > 1 ? 's' : ''} — ${items.length} items`)
  }, 1400)
}
function uploadDrawing() {
  dropzone.value?.browse()
}
function onUploaded(added) {
  // Show the newest upload in the viewer and rebuild the BOQ from it.
  selectedDocId.value = added[0].id
  generate()
}
function selectDrawing(doc) {
  selectedDocId.value = doc.id
}
function exportBoq() {
  const rows = [['Code', 'Description', 'Unit', 'Qty', 'Rate', 'Amount']]
  filtered.value.forEach((i) => rows.push([i.code, i.desc, i.unit, i.qty, i.rate, i.qty * i.rate]))
  const csv = rows.map((r) => r.join(',')).join('\n')
  downloadMock('Lekki-Duplex-BOQ.csv', csv)
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

function addItem() {
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

  const item = store.addBoqItem(draft.value.section)
  store.updateBoqItem(item.id, {
    desc,
    unit: draft.value.unit.trim(),
    qty: Number(draft.value.qty),
    rate: Number(draft.value.rate),
  })
  // Manually entered lines are certain — they did not come from the model.
  store.updateBoqItem(item.id, { confidence: 100 })
  activeSection.value = 'All'
  query.value = ''
  addOpen.value = false
  toast(`${desc} added to ${draft.value.section}`)
}
function editItem(item) {
  editingId.value = editingId.value === item.id ? null : item.id
}
function commitEdit(item, field, value) {
  store.updateBoqItem(item.id, { [field]: value })
}
function finishEdit() {
  if (editingId.value === null) return
  editingId.value = null
  toast('Item updated')
}
function deleteItem(item) {
  store.removeBoqItem(item)
  toast(`Removed ${item.code}`)
}
function confidenceColor(c) {
  if (c >= 95) return 'text-success'
  if (c >= 90) return 'text-primary-dark'
  return 'text-warning'
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h2 class="font-display text-2xl font-bold text-secondary">BOQ Workspace</h2>
        <p class="mt-1 text-brand-muted">Lekki 4-Bedroom Duplex · <span class="font-mono text-sm">PRJ-1042</span></p>
        <p v-if="store.boqSources.length" class="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-brand-light">
          <Cpu class="h-3.5 w-3.5 shrink-0 text-primary" />
          Generated from
          <span v-for="(s, i) in store.boqSources" :key="s" class="font-medium text-brand-muted">
            {{ s }}<span v-if="i < store.boqSources.length - 1">,</span>
          </span>
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
            <span class="badge shrink-0" :class="generating ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'">
              <component :is="generating ? Cpu : Check" class="h-3 w-3" /> {{ generating ? 'Analyzing…' : 'Analyzed' }}
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
              {{ activeDrawing && activeDrawing.elements ? activeDrawing.elements : 14 }} elements detected
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
            :scope="PROJECT_ID"
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
              :scope="PROJECT_ID"
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
            <h3 class="font-display font-bold text-secondary">AI Suggestions</h3>
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
                  <span class="text-xs font-bold" :class="confidenceColor(item.confidence)">{{ item.confidence }}%</span>
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
                <input v-model="draft.unit" class="input" placeholder="m², m³, no, tonne…" />
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
              <button type="button" class="btn-outline btn-md flex-1" @click="addOpen = false">Cancel</button>
              <button type="submit" class="btn-primary btn-md flex-1"><Plus class="h-4 w-4" /> Add item</button>
            </div>
          </form>
        </div>
      </div>
    </transition>
  </div>
</template>
