<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Ruler, Square, Box, Hash, MousePointer2, ZoomIn, ZoomOut, Layers, Sparkles, Plus, Trash2, Upload, X } from 'lucide-vue-next'
import { useToast } from '@/composables/useToast'
import { useDocumentsStore } from '@/stores/documents'
import { useProjectsStore } from '@/stores/projects'
import { detectMeasurements, measurementsToBoqItems, numericValue } from '@/utils/takeoff'
import FileDropzone from '@/components/FileDropzone.vue'
import DocumentList from '@/components/DocumentList.vue'

const router = useRouter()
const { toast } = useToast()
const documents = useDocumentsStore()
const projects = useProjectsStore()

// Takeoff measures the same project's drawings the BOQ workspace uses.
const PROJECT_ID = 'PRJ-1042'
const dropzone = ref(null)
const selectedDocId = ref('')
const plansOpen = ref(false)

const plans = computed(() => documents.drawingsFor(PROJECT_ID))
const activePlan = computed(
  () => plans.value.find((d) => d.id === selectedDocId.value) || plans.value[0] || null
)

const zoom = ref(100)
const activeTool = ref('area')
const tools = [
  { id: 'select', name: 'Select', icon: MousePointer2 },
  { id: 'linear', name: 'Linear', icon: Ruler },
  { id: 'area', name: 'Area', icon: Square },
  { id: 'volume', name: 'Volume', icon: Box },
  { id: 'count', name: 'Count', icon: Hash },
]

let mId = 5
const measurements = ref([
  { id: 1, name: 'Ground floor slab', type: 'Area', value: '186.4 m²', color: '#1CA5F6', auto: true },
  { id: 2, name: 'External wall run', type: 'Linear', value: '68.2 m', color: '#2DC875', auto: true },
  { id: 3, name: 'Foundation concrete', type: 'Volume', value: '42.1 m³', color: '#FFA726', auto: false },
  { id: 4, name: 'Window openings', type: 'Count', value: '14 no', color: '#E63946', auto: true },
  { id: 5, name: 'Internal partitions', type: 'Linear', value: '94.6 m', color: '#6DCBFB', auto: true },
])

// The active tool decides what a new measurement is, and which unit it carries.
const toolMeta = {
  select: null,
  linear: { type: 'Linear', unit: 'm', color: '#2DC875' },
  area: { type: 'Area', unit: 'm²', color: '#1CA5F6' },
  volume: { type: 'Volume', unit: 'm³', color: '#FFA726' },
  count: { type: 'Count', unit: 'no', color: '#E63946' },
}
const activeMeta = computed(() => toolMeta[activeTool.value])
const typeColor = { Area: 'bg-primary/10 text-primary-dark', Linear: 'bg-success/10 text-success', Volume: 'bg-warning/10 text-warning', Count: 'bg-danger/10 text-danger' }

function zoomIn() { zoom.value = Math.min(400, zoom.value + 25) }
function zoomOut() { zoom.value = Math.max(25, zoom.value - 25) }
function resetZoom() { zoom.value = 100 }

// Zero-value measurements cannot be priced, so show what will actually carry.
const syncable = computed(() => measurements.value.filter((m) => numericValue(m) > 0).length)

function onPlanUploaded(added) {
  selectedDocId.value = added[0].id
  toast(`Measuring ${added[0].name}`)
}
function selectPlan(doc) {
  selectedDocId.value = doc.id
  toast(`Switched to ${doc.name}`, 'info')
}

const detecting = ref(false)

// Detection reads the plan that is actually open. Previously it appended two
// fixed rows and then reported "no new quantities" on every later click.
function autoDetect() {
  if (detecting.value) return
  if (!activePlan.value) {
    toast('Upload a plan first — measurements are detected from it', 'warning')
    plansOpen.value = true
    return
  }

  detecting.value = true
  toast(`Reading ${activePlan.value.name}…`, 'info')

  setTimeout(() => {
    const found = detectMeasurements(activePlan.value)
    // Replace previous auto-detections for this plan; keep anything measured
    // by hand so a re-run never discards the user's own work.
    const manual = measurements.value.filter((m) => !m.auto || m.source !== activePlan.value.name)
    measurements.value = [
      ...manual,
      ...found.map((f) => ({ ...f, id: ++mId })),
    ]
    detecting.value = false
    toast(`${found.length} quantities detected from ${activePlan.value.name}`)
  }, 1500)
}

// Manual entry asks what you measured; clicking the canvas with a tool still
// drops a labelled entry you can refine in place.
const addOpen = ref(false)
const draft = ref(blankMeasurement())
const draftError = ref('')

function blankMeasurement() {
  const meta = activeMeta.value || toolMeta.area
  return { name: '', type: meta.type, value: null }
}

function openAddMeasurement() {
  draft.value = blankMeasurement()
  draftError.value = ''
  addOpen.value = true
}

const unitForType = { Linear: 'm', Area: 'm²', Volume: 'm³', Count: 'no' }
const colorForType = { Linear: '#2DC875', Area: '#1CA5F6', Volume: '#FFA726', Count: '#E63946' }

function addMeasurement() {
  const name = draft.value.name.trim()
  if (!name) {
    draftError.value = 'Name the measurement.'
    return
  }
  if (draft.value.value === null || draft.value.value === '' || Number(draft.value.value) < 0) {
    draftError.value = 'Enter the measured value.'
    return
  }
  const unit = unitForType[draft.value.type]
  measurements.value.push({
    id: ++mId,
    name,
    type: draft.value.type,
    value: `${Number(draft.value.value)} ${unit}`,
    color: colorForType[draft.value.type],
    auto: false,
  })
  addOpen.value = false
  toast(`${name} added — ${Number(draft.value.value)} ${unit}`)
}

// Canvas clicks still add a quick entry without interrupting the flow.
function quickAddMeasurement() {
  const meta = activeMeta.value || toolMeta.area
  const n = measurements.value.filter((m) => m.type === meta.type).length + 1
  measurements.value.push({
    id: ++mId,
    name: meta.type + ' measurement ' + n,
    type: meta.type,
    value: '0.0 ' + meta.unit,
    color: meta.color,
    auto: false,
  })
  toast(`${meta.type} measurement added — set its value on the right`)
}

// Clicking the canvas with a measurement tool selected drops a new entry.
function onCanvasClick() {
  if (!activeMeta.value) return
  quickAddMeasurement()
}

function removeMeasurement(m) {
  const i = measurements.value.findIndex((x) => x.id === m.id)
  if (i !== -1) measurements.value.splice(i, 1)
  toast('Removed ' + m.name, 'info')
}

// This used to navigate and claim success without touching the BOQ at all.
function syncToBoq() {
  if (!measurements.value.length) {
    toast('Nothing to sync — detect or add a measurement first', 'warning')
    return
  }

  const { items, skipped } = measurementsToBoqItems(measurements.value)
  if (!items.length) {
    toast('Every measurement is still zero — set their values first', 'warning')
    return
  }

  // Append to the BOQ rather than replacing it, so a generated BOQ survives.
  for (const item of items) {
    const created = projects.addBoqItem(item.section)
    projects.updateBoqItem(created.id, item)
  }

  if (skipped.length) {
    toast(`${skipped.length} zero-value measurement${skipped.length > 1 ? 's' : ''} skipped`, 'warning')
  }
  toast(`${items.length} measurement${items.length > 1 ? 's' : ''} added to the BOQ`)
  router.push('/app/boq')
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="font-display text-2xl font-bold text-secondary">Quantity Takeoff</h2>
        <p class="mt-1 text-brand-muted">
          Digital measurement from
          <span class="font-medium text-secondary">{{ activePlan ? activePlan.name : 'Ground Floor Plan.pdf' }}</span>
        </p>
      </div>
      <div class="flex flex-wrap gap-2 self-start">
        <button class="btn-outline btn-md" @click="plansOpen = !plansOpen">
          <Upload class="h-4 w-4" /> Plans
          <span v-if="plans.length" class="badge bg-primary/10 text-primary-dark">{{ plans.length }}</span>
        </button>
        <button class="btn-primary btn-md" :disabled="detecting" @click="autoDetect">
          <Sparkles class="h-4 w-4" /> {{ detecting ? 'Detecting…' : 'Auto-detect all' }}
        </button>
      </div>
    </div>

    <!-- Plans panel -->
    <div v-if="plansOpen" class="card space-y-4 p-5">
      <div class="flex items-center justify-between">
        <h3 class="font-display font-bold text-secondary">Plans &amp; Drawings</h3>
        <button class="text-sm font-semibold text-primary hover:underline" @click="plansOpen = false">Hide</button>
      </div>
      <FileDropzone ref="dropzone" :scope="PROJECT_ID" compact label="Drop a plan to measure" @uploaded="onPlanUploaded" />
      <p class="text-xs font-semibold uppercase tracking-wider text-brand-light">
        Uploaded plans
        <span v-if="plans.length" class="text-brand-muted">· {{ plans.length }}</span>
      </p>
      <DocumentList
        :scope="PROJECT_ID"
        drawings-only
        selectable
        :selected-id="activePlan ? activePlan.id : ''"
        empty-text="No plans uploaded yet — drop one above to start measuring."
        @select="selectPlan"
      />
    </div>

    <div class="grid gap-6 lg:grid-cols-3">
      <!-- Canvas -->
      <div class="card overflow-hidden lg:col-span-2">
        <div class="flex items-center justify-between border-b border-brand-border-light px-4 py-3">
          <div class="flex items-center gap-1 rounded-xl bg-brand-bg p-1">
            <button v-for="t in tools" :key="t.id" @click="activeTool = t.id"
              class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
              :class="activeTool === t.id ? 'bg-white text-primary shadow-sm' : 'text-brand-muted hover:text-secondary'">
              <component :is="t.icon" class="h-4 w-4" /> <span class="hidden sm:inline">{{ t.name }}</span>
            </button>
          </div>
          <div class="flex items-center gap-1">
            <button class="grid h-8 w-8 place-items-center rounded-lg text-brand-muted hover:bg-brand-border-light" title="Zoom out" @click="zoomOut"><ZoomOut class="h-4 w-4" /></button>
            <button class="w-12 rounded-lg py-1 text-center text-xs font-medium text-brand-muted hover:bg-brand-border-light" title="Reset zoom" @click="resetZoom">{{ zoom }}%</button>
            <button class="grid h-8 w-8 place-items-center rounded-lg text-brand-muted hover:bg-brand-border-light" @click="zoomIn"><ZoomIn class="h-4 w-4" /></button>
          </div>
        </div>
        <div class="relative aspect-[4/3] overflow-hidden bg-secondary"
          :class="activeMeta ? 'cursor-crosshair' : 'cursor-default'"
          @click="onCanvasClick">
          <img
            v-if="activePlan && activePlan.kind === 'Image' && activePlan.dataUrl"
            :src="activePlan.dataUrl"
            :alt="activePlan.name"
            class="absolute inset-0 h-full w-full object-contain opacity-70 transition-transform duration-200"
            :style="{ transform: 'scale(' + zoom / 100 + ')' }"
          />
          <svg viewBox="0 0 400 300" class="relative h-full w-full origin-center transition-transform duration-200"
            :style="{ transform: 'scale(' + zoom / 100 + ')' }">
            <defs>
              <pattern id="grid2" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#2D3D63" stroke-width="0.5" />
              </pattern>
            </defs>
            <rect width="400" height="300" fill="#1B2540" />
            <rect width="400" height="300" fill="url(#grid2)" />
            <!-- measured area -->
            <rect x="60" y="50" width="280" height="200" fill="#1CA5F6" fill-opacity="0.12" stroke="#1CA5F6" stroke-width="1.5" />
            <rect x="80" y="70" width="100" height="60" fill="#2DC875" fill-opacity="0.12" stroke="#2DC875" stroke-width="1.5" stroke-dasharray="4 2" />
            <circle v-for="(p, i) in [[230,80],[290,80],[230,160],[290,160]]" :key="i" :cx="p[0]" :cy="p[1]" r="4" fill="#E63946" />
            <text x="180" y="155" fill="#6DCBFB" font-size="9" text-anchor="middle">186.4 m²</text>
            <text x="100" y="105" fill="#2DC875" font-size="8">Wet area</text>
          </svg>
          <div class="absolute bottom-3 left-3 flex items-center gap-2 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs text-white backdrop-blur">
            <Ruler class="h-3.5 w-3.5 text-primary-light" />
            <span v-if="activeMeta">{{ activeMeta.type }} tool — click the drawing to measure</span>
            <span v-else>Scale 1:100 · auto-detected</span>
          </div>
        </div>
      </div>

      <!-- Measurements list -->
      <div class="card flex flex-col">
        <div class="flex items-center justify-between border-b border-brand-border-light p-5">
          <h3 class="flex items-center gap-2 font-display font-bold text-secondary"><Layers class="h-4 w-4 text-primary" /> Measurements</h3>
          <button class="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary hover:bg-primary/20" title="Add a measurement" @click="openAddMeasurement"><Plus class="h-4 w-4" /></button>
        </div>
        <div class="flex-1 space-y-2 p-4">
          <div v-for="m in measurements" :key="m.id" class="group rounded-xl border border-brand-border-light p-3 transition-colors hover:border-primary/30">
            <div class="flex items-center gap-2">
              <span class="h-3 w-3 shrink-0 rounded-full" :style="{ background: m.color }"></span>
              <input v-model="m.name" class="min-w-0 flex-1 truncate rounded-md bg-transparent text-sm font-semibold text-secondary hover:bg-brand-bg focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary" />
              <span v-if="m.auto" class="badge shrink-0 bg-primary/10 text-[10px] text-primary-dark">AI</span>
              <button class="grid h-6 w-6 shrink-0 place-items-center rounded-md text-brand-light opacity-0 transition-opacity hover:bg-danger/10 hover:text-danger group-hover:opacity-100"
                title="Remove measurement" @click="removeMeasurement(m)"><Trash2 class="h-3.5 w-3.5" /></button>
            </div>
            <div class="mt-2 flex items-center justify-between">
              <span class="chip" :class="typeColor[m.type]">{{ m.type }}</span>
              <input v-model="m.value" class="w-24 rounded-md bg-transparent text-right font-bold text-secondary hover:bg-brand-bg focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
          </div>
        </div>
        <div class="border-t border-brand-border-light p-4">
          <p class="mb-2 text-center text-xs text-brand-muted">
            {{ syncable }} of {{ measurements.length }} measurement{{ measurements.length === 1 ? '' : 's' }} ready to price
          </p>
          <button class="btn-primary btn-md w-full" :disabled="!syncable" @click="syncToBoq">Sync to BOQ</button>
        </div>
      </div>
    </div>

    <!-- Add measurement -->
    <transition name="page">
      <div v-if="addOpen" class="fixed inset-0 z-[60] flex items-end justify-center bg-secondary/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" @click.self="addOpen = false">
        <div class="w-full max-w-md overflow-hidden rounded-t-2xl bg-white shadow-card-hover sm:rounded-2xl">
          <div class="flex items-center justify-between border-b border-brand-border-light px-6 py-4">
            <h3 class="font-display text-lg font-bold text-secondary">Add a measurement</h3>
            <button class="btn btn-ghost btn-sm" @click="addOpen = false"><X class="h-5 w-5" /></button>
          </div>
          <form class="space-y-4 p-6" @submit.prevent="addMeasurement">
            <div>
              <label class="label">What did you measure?</label>
              <input v-model="draft.name" class="input" placeholder="Ground floor slab" autofocus />
            </div>
            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label class="label">Type</label>
                <select v-model="draft.type" class="input">
                  <option v-for="t in ['Linear', 'Area', 'Volume', 'Count']" :key="t" :value="t">{{ t }}</option>
                </select>
              </div>
              <div>
                <label class="label">Value ({{ unitForType[draft.type] }})</label>
                <input v-model.number="draft.value" type="number" min="0" step="any" class="input" placeholder="186.4" />
              </div>
            </div>
            <p v-if="draftError" class="text-sm font-medium text-danger">{{ draftError }}</p>
            <div class="flex gap-2 pt-2">
              <button type="button" class="btn-outline btn-md flex-1" @click="addOpen = false">Cancel</button>
              <button type="submit" class="btn-primary btn-md flex-1"><Plus class="h-4 w-4" /> Add</button>
            </div>
          </form>
        </div>
      </div>
    </transition>
  </div>
</template>
