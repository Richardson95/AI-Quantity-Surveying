<script setup>
import { ref, computed, onMounted, watch , onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { Ruler, Square, Box, Hash, MousePointer2, ZoomIn, ZoomOut, Layers, Sparkles, Plus, Trash2, Upload, X, AlertTriangle, FileQuestion } from 'lucide-vue-next'
import { useToast } from '@/composables/useToast'
import { useDocumentsStore } from '@/stores/documents'
import { useProjectsStore } from '@/stores/projects'
import { useTakeoffStore } from '@/stores/takeoff'
import { useBillingStore } from '@/stores/billing'
import { numericValue } from '@/utils/takeoff'
import { SOURCE_LABELS } from '@/services/analysis'
import FileDropzone from '@/components/FileDropzone.vue'
import DocumentList from '@/components/DocumentList.vue'
import ProjectSwitcher from '@/components/ProjectSwitcher.vue'

const router = useRouter()
const { toast } = useToast()
const documents = useDocumentsStore()
const projects = useProjectsStore()
const takeoff = useTakeoffStore()
const billing = useBillingStore()

// Takeoff measures the same project's drawings the BOQ workspace uses.
const projectId = computed(() => projects.currentProjectId)
const dropzone = ref(null)
const selectedDocId = ref('')
const plansOpen = ref(false)

async function loadProject(id) {
  if (!id) return
  await Promise.all([
    documents.fetchForScope(id).catch(() => {}),
    takeoff.fetchForProject(id).catch((e) => toast(e.message, 'warning')),
  ])
}

onMounted(async () => {
  await projects.ensureProject()
  await Promise.all([loadProject(projectId.value), billing.fetchUsage()])
})

// Auto-detect reads the sheet through the model; that costs a credit.
const outOfCredits = computed(() => billing.creditsExhausted)
const creditsLeft = computed(() => billing.creditsLeft)
watch(projectId, (id) => loadProject(id))

const plans = computed(() => documents.drawingsFor(projectId.value))
const activePlan = computed(
  () => plans.value.find((d) => d.id === selectedDocId.value) || plans.value[0] || null
)

// The viewer used to draw an invented floor plan — a blue rectangle labelled
// "186.4 m²", a green "Wet area" box and four red dots — over a grid, and the
// real drawing never appeared because `dataUrl` only ever existed on the demo
// fixtures. It now asks the server for a short-lived signed preview of the
// selected file and shows that, or says plainly why it cannot.
const planPreview = ref({ url: null, notice: '', loading: false })

async function loadPreview(doc) {
  if (!doc) {
    planPreview.value = { url: null, notice: '', loading: false }
    return
  }
  planPreview.value = { url: null, notice: '', loading: true }
  const res = await documents.previewUrl(doc)
  // A slower request for a drawing the user has since switched away from must
  // not paint over the current one.
  if (activePlan.value?.id !== doc.id) return
  planPreview.value = {
    url: res.url || null,
    notice: res.url ? '' : res.notice || 'No preview is available for this file.',
    loading: false,
  }
}

watch(activePlan, (doc) => { loadPreview(doc) }, { immediate: true })

/** Images render inline; PDFs need a frame; CAD and BIM have no renderer. */
const previewKind = computed(() => {
  if (!planPreview.value.url) return 'none'
  return activePlan.value?.kind === 'Image' ? 'image' : 'frame'
})

const zoom = ref(100)
const activeTool = ref('area')
const tools = [
  { id: 'select', name: 'Select', icon: MousePointer2 },
  { id: 'linear', name: 'Linear', icon: Ruler },
  { id: 'area', name: 'Area', icon: Square },
  { id: 'volume', name: 'Volume', icon: Box },
  { id: 'count', name: 'Count', icon: Hash },
]

// Measurements belong to the project, not this screen — the BOQ import reads
// the same rows, so they cannot be a local copy that drifts.
const measurements = computed(() => takeoff.measurements)

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

const detecting = computed(() => takeoff.detecting)
// 'engine' once the engine has actually read this project's drawings.
const detectSource = computed(() => takeoff.source || 'none')
const detectProvenance = computed(() => SOURCE_LABELS[detectSource.value])

// Detection reads the plan that is actually open. The store replaces the
// figures previously detected from that same plan and keeps anything measured
// by hand, so a re-run never discards the user's own work.
async function autoDetect() {
  if (takeoff.detecting) return
  if (outOfCredits.value) {
    toast("Your plan's AI credits are used up for this period — upgrade to keep reading drawings", 'warning')
    return
  }
  if (!activePlan.value) {
    toast('Upload a plan first — measurements are detected from it', 'warning')
    plansOpen.value = true
    return
  }
  if (activePlan.value.status === 'Analyzing') {
    toast(`${activePlan.value.name} is still being read — try again in a moment`, 'info')
    return
  }

  toast(`Reading ${activePlan.value.name}…`, 'info')
  const result = await takeoff.detect(activePlan.value, projectId.value)
  billing.fetchUsage()
  if (!result) return

  ;(result.warnings || []).forEach((w) => toast(w, 'warning'))
  if (result.failed) {
    toast(result.failed, 'warning')
    return
  }
  const n = (result.measurements || []).length
  toast(
    n
      ? `${n} quantities measured from ${activePlan.value.name}`
      : `Nothing measurable was found on ${activePlan.value.name}`,
    n ? 'success' : 'warning'
  )
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

const saving = ref(false)

async function addMeasurement() {
  if (saving.value) return
  const name = draft.value.name.trim()
  if (!name) {
    draftError.value = 'Name the measurement.'
    return
  }
  if (draft.value.value === null || draft.value.value === '' || Number(draft.value.value) < 0) {
    draftError.value = 'Enter the measured value.'
    return
  }
  // A measurement is recorded against a drawing, so one has to be open.
  if (!activePlan.value) {
    draftError.value = 'Open a plan first — a measurement is recorded against one.'
    return
  }

  saving.value = true
  try {
    const unit = unitForType[draft.value.type]
    await takeoff.add(
      { name, type: draft.value.type, value: draft.value.value },
      { documentId: activePlan.value?.id, projectId: projectId.value }
    )
    addOpen.value = false
    toast(`${name} added — ${Number(draft.value.value)} ${unit}`)
  } catch (err) {
    draftError.value = err.message || 'That measurement could not be saved.'
  } finally {
    saving.value = false
  }
}

// Canvas clicks still add a quick entry without interrupting the flow.
async function quickAddMeasurement() {
  const meta = activeMeta.value || toolMeta.area
  if (!activePlan.value) {
    toast('Open a plan first — a measurement is recorded against one', 'warning')
    plansOpen.value = true
    return
  }
  const n = measurements.value.filter((m) => m.type === meta.type).length + 1
  try {
    await takeoff.add(
      { name: meta.type + ' measurement ' + n, type: meta.type, value: 0 },
      { documentId: activePlan.value?.id, projectId: projectId.value }
    )
    toast(`${meta.type} measurement added — set its value on the right`)
  } catch (err) {
    toast(err.message || 'That measurement could not be saved', 'warning')
  }
}

// Clicking the canvas with a measurement tool selected drops a new entry.
function onCanvasClick() {
  if (!activeMeta.value) return
  quickAddMeasurement()
}

async function removeMeasurement(m) {
  await takeoff.remove(m)
  toast('Removed ' + m.name, 'info')
}

/**
 * Correcting a detected figure makes it yours: the store and the server both
 * drop its confidence and its "AI" badge, because it is no longer the number
 * the engine measured.
 */
async function editMeasurement(m, field, value) {
  try {
    await takeoff.update(m.id, { [field]: value })
  } catch (err) {
    toast(err.message || 'That change could not be saved', 'warning')
    await takeoff.fetchForProject(projectId.value, { force: true }).catch(() => {})
  }
}

// This used to navigate and claim success without touching the BOQ at all.
const syncing = ref(false)

async function syncToBoq() {
  if (syncing.value) return
  if (!measurements.value.length) {
    toast('Nothing to sync — detect or add a measurement first', 'warning')
    return
  }

  syncing.value = true
  try {
    // The server prices each measurement against the rate library and refuses
    // to bill a length at an area rate, reporting what it skipped and why.
    const res = await projects.importMeasurements([], projectId.value)
    for (const sk of res.skipped || []) {
      toast(`Skipped "${sk.name}" — ${sk.reason}`, 'warning')
    }
    if (!res.imported) {
      toast('None of those measurements could be priced', 'warning')
      return
    }
    toast(`${res.imported} measurement${res.imported > 1 ? 's' : ''} added to the BOQ`)
    router.push('/app/boq')
  } catch (err) {
    toast(err.message || 'Those measurements could not be added to the BOQ', 'warning')
  } finally {
    syncing.value = false
  }
}

// Analysis polling runs on a timer in the documents store; stop it when the
// screen goes away, or navigating between projects leaves pollers behind.
onBeforeUnmount(() => documents.stopWatching())
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="font-display text-2xl font-bold text-secondary">Quantity Takeoff</h2>
        <p class="mt-1 text-brand-muted">
          <template v-if="activePlan">
            Digital measurement from
            <span class="font-medium text-secondary">{{ activePlan.name }}</span>
          </template>
          <template v-else>Select an uploaded drawing to measure from.</template>
        </p>
        <p v-if="detectSource !== 'engine'" class="mt-1 max-w-xl text-xs text-warning">
          {{ detectProvenance.detail }}
        </p>
        <ProjectSwitcher class="mt-3" />
      </div>
      <div class="flex flex-wrap gap-2 self-start">
        <button class="btn-outline btn-md" @click="plansOpen = !plansOpen">
          <Upload class="h-4 w-4" /> Plans
          <span v-if="plans.length" class="badge bg-primary/10 text-primary-dark">{{ plans.length }}</span>
        </button>
        <button class="btn-primary btn-md" :disabled="detecting || outOfCredits" :title="outOfCredits ? 'No AI credits left this period' : 'Read this plan and record what it measures'" @click="autoDetect">
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
      <FileDropzone ref="dropzone" :scope="projectId" compact label="Drop a plan to measure" @uploaded="onPlanUploaded" />
      <p class="text-xs font-semibold uppercase tracking-wider text-brand-light">
        Uploaded plans
        <span v-if="plans.length" class="text-brand-muted">· {{ plans.length }}</span>
      </p>
      <DocumentList
        :scope="projectId"
        drawings-only
        selectable
        :selected-id="activePlan ? activePlan.id : ''"
        empty-text="No plans uploaded yet — drop one above to start measuring."
        @select="selectPlan"
      />
    </div>

    <p v-if="outOfCredits" class="flex items-center gap-2 rounded-xl border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-brand-muted">
      <AlertTriangle class="h-4 w-4 shrink-0 text-warning" />
      Your plan's AI credits are used up for this period, so drawings cannot be read. Measurements can still be added by hand.
    </p>
    <p v-else-if="creditsLeft !== null && creditsLeft <= 10" class="rounded-xl border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-brand-muted">
      {{ creditsLeft }} AI credit{{ creditsLeft === 1 ? '' : 's' }} left this period.
    </p>

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
          <!-- The drawing itself, from a signed URL the server issues per view. -->
          <img
            v-if="previewKind === 'image'"
            :src="planPreview.url"
            :alt="activePlan.name"
            class="absolute inset-0 h-full w-full object-contain transition-transform duration-200"
            :style="{ transform: 'scale(' + zoom / 100 + ')' }"
          />
          <iframe
            v-else-if="previewKind === 'frame'"
            :src="planPreview.url"
            :title="activePlan.name"
            class="absolute inset-0 h-full w-full border-0 bg-white transition-transform duration-200"
            :style="{ transform: 'scale(' + zoom / 100 + ')' }"
          ></iframe>

          <!-- Nothing to show: say which of the three reasons applies. -->
          <div v-else class="absolute inset-0 grid place-items-center px-6 text-center">
            <div>
              <FileQuestion class="mx-auto h-10 w-10 text-white/30" />
              <p class="mt-3 text-sm font-medium text-white/70">
                <template v-if="planPreview.loading">Opening the drawing…</template>
                <template v-else-if="!activePlan">Upload a drawing, then select it to measure from.</template>
                <template v-else>{{ planPreview.notice }}</template>
              </p>
            </div>
          </div>

          <div class="absolute bottom-3 left-3 flex items-center gap-2 rounded-lg bg-black/40 px-2.5 py-1.5 text-xs text-white backdrop-blur">
            <Ruler class="h-3.5 w-3.5 text-primary-light" />
            <span v-if="activeMeta && activePlan">{{ activeMeta.type }} tool — click to add a {{ activeMeta.type }} entry, then type its value</span>
            <span v-else-if="measurements.length">{{ measurements.length }} measurement{{ measurements.length === 1 ? '' : 's' }} on this project</span>
            <span v-else>No quantities measured yet</span>
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
          <p v-if="takeoff.loading && !measurements.length" class="py-10 text-center text-sm text-brand-muted">
            Loading measurements…
          </p>
          <p v-else-if="!measurements.length" class="rounded-xl border border-dashed border-brand-border-light px-3 py-10 text-center text-sm text-brand-muted">
            Nothing measured yet. Auto-detect from an open plan, or add a measurement by hand.
          </p>

          <div v-for="m in measurements" :key="m.id" class="group rounded-xl border border-brand-border-light p-3 transition-colors hover:border-primary/30">
            <div class="flex items-center gap-2">
              <span class="h-3 w-3 shrink-0 rounded-full" :style="{ background: m.color }"></span>
              <!-- Edits are committed on change, not on every keystroke — each
                   one is a round trip to the server. -->
              <input :value="m.name" class="min-w-0 flex-1 truncate rounded-md bg-transparent text-sm font-semibold text-secondary hover:bg-brand-bg focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                @change="editMeasurement(m, 'name', $event.target.value)" />
              <span v-if="m.auto" class="badge shrink-0 bg-primary/10 text-[10px] text-primary-dark" title="Detected by the analysis engine">AI</span>
              <button class="grid h-6 w-6 shrink-0 place-items-center rounded-md text-brand-light opacity-0 transition-opacity hover:bg-danger/10 hover:text-danger group-hover:opacity-100"
                title="Remove measurement" @click="removeMeasurement(m)"><Trash2 class="h-3.5 w-3.5" /></button>
            </div>
            <div class="mt-2 flex items-center justify-between gap-2">
              <span class="chip" :class="typeColor[m.type]">{{ m.type }}</span>
              <div class="flex items-center gap-1.5">
                <input :value="m.numeric" type="number" min="0" step="any"
                  class="w-20 rounded-md bg-transparent text-right font-bold text-secondary hover:bg-brand-bg focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                  @change="editMeasurement(m, 'value', $event.target.value)" />
                <span class="w-8 text-xs text-brand-muted">{{ m.unit }}</span>
              </div>
            </div>
            <p v-if="m.source" class="mt-1.5 truncate text-[11px] text-brand-light" :title="m.source">from {{ m.source }}</p>
          </div>
        </div>
        <div class="border-t border-brand-border-light p-4">
          <p class="mb-2 text-center text-xs text-brand-muted">
            {{ syncable }} of {{ measurements.length }} measurement{{ measurements.length === 1 ? '' : 's' }} ready to price
          </p>
          <button class="btn-primary btn-md w-full" :disabled="!syncable || syncing" @click="syncToBoq">{{ syncing ? 'Syncing…' : 'Sync to BOQ' }}</button>
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
