<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { Calculator, TrendingUp, TrendingDown, Sparkles, RefreshCw, Globe, Package, HardHat, Wrench, Store, Trash2, ArrowRight, FileSpreadsheet, Upload } from 'lucide-vue-next'
import BarChart from '@/components/charts/BarChart.vue'
import DoughnutChart from '@/components/charts/DoughnutChart.vue'
import { useToast } from '@/composables/useToast'
import { useVendorsStore } from '@/stores/vendors'
import { useCostsStore } from '@/stores/costs'
import { useProjectsStore } from '@/stores/projects'
import { useRatesStore } from '@/stores/rates'
import { api } from '@/services/api'
import { formatFull } from '@/utils/format'
import CostUpload from '@/components/CostUpload.vue'
import ProjectSwitcher from '@/components/ProjectSwitcher.vue'

const { toast } = useToast()
const vendors = useVendorsStore()
const costs = useCostsStore()
const projects = useProjectsStore()
const ratesStore = useRatesStore()

const region = ref('Lagos')
const estimating = ref(false)
const projectId = computed(() => projects.currentProjectId)

// ---------------------------------------------------------------------------
// The server's estimate.
// ---------------------------------------------------------------------------
// Every figure on this screen comes from it. Two things it will not do:
//
//   • Substitute a basis. No BOQ means a basis of zero and a note saying so —
//     not the fabricated ₦185.2M this page used to fall back to.
//   • Invent a benchmark. One appears only where an administrator has set a
//     real figure on the region; it is never derived by scaling anything.
// ---------------------------------------------------------------------------
const server = ref(null)
const serverRates = ref([])

async function loadEstimate() {
  if (!projectId.value) return
  try {
    const data = await api.get(`/projects/${projectId.value}/estimate?region=${encodeURIComponent(region.value)}`)
    server.value = data.estimate
    serverRates.value = data.rateAnalysis || []
  } catch (err) {
    toast(err.message || 'Could not load the estimate', 'warning')
  }
}

onMounted(async () => {
  await projects.ensureProject()
  await Promise.all([
    projects.fetchBoq().catch(() => {}),
    costs.fetchForProject(projectId.value).catch(() => {}),
    ratesStore.fetchRegions(),
    vendors.fetchSavedPrices(),
    loadEstimate(),
  ])
})

watch([projectId, region], async () => {
  await Promise.all([costs.fetchForProject(projectId.value).catch(() => {}), loadEstimate()])
})

// Regional factors and benchmarks live in a table an administrator edits, not
// in this file. An unconfigured region simply has no factors and no benchmark.
const regions = computed(() => ratesStore.regions.map((r) => r.name))

const factor = computed(() => {
  const f = server.value?.factors
  return {
    label: server.value?.region ?? region.value,
    material: f?.material ?? 1,
    labour: f?.labour ?? 1,
    equipment: f?.equipment ?? 1,
  }
})

// The category split the server applies. These shares are a convention, not a
// measurement, and the server flags them as such in its own notes.
const SPLIT = [
  { name: 'Materials', key: 'materials', icon: Package, color: 'bg-primary/10 text-primary' },
  { name: 'Labour', key: 'labour', icon: HardHat, color: 'bg-success/10 text-success' },
  { name: 'Equipment', key: 'equipment', icon: Wrench, color: 'bg-warning/10 text-warning' },
  { name: 'Overheads & Profit', key: 'overheads', icon: TrendingUp, color: 'bg-primary-light/20 text-primary-dark' },
]

// The estimate is priced off the current Bill of Quantities, so regenerating
// the BOQ from new drawings flows straight through to the cost here. There is
// no fallback basis: this screen used to substitute a fabricated ₦185,200,000
// when no bill existed, and then scale its "benchmark" by that same figure.
const basis = computed(() => server.value?.basis ?? 0)

// True when there is genuinely nothing to price from.
const noBasis = computed(() => basis.value === 0)
const notes = computed(() => server.value?.notes || [])

const categories = computed(() => {
  const rows = SPLIT.map((c) => ({ ...c, value: server.value?.categories?.[c.key] ?? 0 }))
  const sum = rows.reduce((a, c) => a + c.value, 0)
  return rows.map((c) => ({ ...c, pct: sum ? Math.round((c.value / sum) * 100) : 0 }))
})

const total = computed(() => server.value?.total ?? 0)

// Only a benchmark an administrator actually set is compared against. Null
// means no benchmark exists — which is not the same as being on budget.
const benchmark = computed(() => server.value?.benchmark ?? null)
const benchmarkDelta = computed(() => {
  const b = benchmark.value
  if (!b) return null
  return ((b - total.value) / b) * 100
})

// Real section totals from the bill, in millions.
const elements = computed(() => {
  const sections = server.value?.sections || []
  return {
    labels: sections.map((x) => x.section),
    data: sections.map((x) => Math.round((x.total / 1_000_000) * 10) / 10),
  }
})
const hasElements = computed(() => elements.value.labels.length > 0)

/**
 * The mean confidence across the bill lines that were actually MEASURED.
 * Null when none were — a confidence score on quantities nobody measured is
 * the exact lie this app exists not to tell, and the fixed "93.4%" that used
 * to sit here was one.
 */
const measuredConfidence = computed(() => {
  const scored = projects.boqItems.filter((i) => i.confidence != null)
  if (!scored.length) return null
  const mean = scored.reduce((a, i) => a + i.confidence, 0) / scored.length
  return Math.round(mean * 10) / 10
})

const split = computed(() => ({
  labels: categories.value.map((c) => c.name),
  data: categories.value.map((c) => c.pct),
}))

// Every BOQ line priced against the rate library, showing where the firm's own
// cost data disagrees. The four modelled "base rates" that used to sit here
// were invented figures scaled by an invented regional factor.
const rateAnalysis = computed(() =>
  serverRates.value.map((r) => ({
    id: r.id,
    item: `${r.desc} (per ${r.unit})`,
    // The server reports the applied rate, the library rate and the firm's own
    // — not a modelled material/labour/equipment split it cannot know.
    material: r.rate,
    labour: r.libraryRate ?? 0,
    equipment: r.ownRate ?? 0,
    total: r.amount,
    variance: r.variance,
  }))
)

// Vendor-confirmed rates are added to the rate analysis as their own line, so a
// price you actually phoned in is visible next to the modelled rates.
const appliedRates = ref([])

function applyPrice(p) {
  if (appliedRates.value.some((r) => r.id === p.id)) {
    toast('That rate is already applied', 'info')
    return
  }
  appliedRates.value.unshift({ id: p.id, item: `${p.item} (per ${p.unit})`, material: p.rate, labour: 0, equipment: 0, total: p.rate, vendor: p.vendor })
  toast(`${p.item} applied at ${formatFull(p.rate)}`)
}

function unapplyRate(r) {
  appliedRates.value = appliedRates.value.filter((x) => x.id !== r.id)
  toast('Rate removed from the estimate', 'info')
}

// How the user's own priced schedule compares with the AI estimate.
const costVariance = computed(() => {
  if (!costs.pricedTotal) return null
  const diff = costs.pricedTotal - total.value
  return { diff, pct: (diff / total.value) * 100 }
})

function applyCostLine(line) {
  if (appliedRates.value.some((r) => r.id === line.id)) {
    toast('That rate is already applied', 'info')
    return
  }
  appliedRates.value.unshift({
    id: line.id,
    item: `${line.item} (per ${line.unit})`,
    material: line.rate,
    labour: 0,
    equipment: 0,
    total: line.rate,
    vendor: line.source,
  })
  toast(`${line.item} applied at ${formatFull(line.rate)}`)
}

async function removeCostLine(line) {
  await costs.remove(line.id)
  appliedRates.value = appliedRates.value.filter((r) => r.id !== line.id)
  toast('Cost line removed', 'info')
}

async function clearAllCosts() {
  await costs.clear(projectId.value)
  appliedRates.value = []
  toast('All uploaded costs cleared', 'info')
}

async function clearCostSource(source) {
  const ids = costs.lines.filter((l) => l.source === source).map((l) => l.id)
  await costs.removeSource(source, projectId.value)
  appliedRates.value = appliedRates.value.filter((r) => !ids.includes(r.id))
  toast(`Removed all lines from ${source}`, 'info')
}

const lastEstimated = ref(null)

async function reEstimate() {
  if (estimating.value) return
  estimating.value = true
  const before = total.value

  try {
    // The estimate is derived on read, so this recomputes from the current bill
    // rather than storing a snapshot that could drift from it.
    await projects.fetchBoq().catch(() => {})
    await loadEstimate()
    lastEstimated.value = new Date()

    const delta = total.value - before
    if (noBasis.value) {
      toast('No bill of quantities yet — there is nothing to estimate from', 'warning')
      return
    }
    toast(`Repriced ${projects.boqItems.length} BOQ items at ${region.value} rates — ${formatFull(total.value)}`)
    if (delta) toast(`${delta > 0 ? 'Up' : 'Down'} ${formatFull(Math.abs(delta))} on the previous run`, 'info')
  } finally {
    estimating.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="font-display text-2xl font-bold text-secondary">Cost Estimation</h2>
        <p class="mt-1 text-brand-muted">AI-priced estimate<template v-if="projects.current"> · {{ projects.current.name }}</template></p>
        <p class="mt-1 text-xs text-brand-light">
          <template v-if="projects.boqItems.length">
            Priced from {{ projects.boqItems.length }} BOQ items<template v-if="projects.boqSources.length"> derived from {{ projects.boqSources.length }} drawing{{ projects.boqSources.length > 1 ? 's' : '' }}</template>
            <template v-if="lastEstimated"> · last run {{ lastEstimated.toLocaleTimeString('en-NG') }}</template>
          </template>
          <template v-else-if="noBasis">No bill of quantities yet — there is nothing to price this job from.</template>
          <template v-else>Indicative figure — generate a BOQ to price this job from your drawings.</template>
        </p>
        <ProjectSwitcher class="mt-3" />
      </div>
      <div class="flex items-center gap-2">
        <div class="flex items-center gap-2 rounded-xl border border-brand-border bg-white px-3 py-2">
          <Globe class="h-4 w-4 text-brand-light" />
          <select v-model="region" class="bg-transparent text-sm font-medium text-secondary focus:outline-none">
            <option v-for="r in regions" :key="r">{{ r }}</option>
          </select>
        </div>
        <button class="btn-primary btn-md" @click="reEstimate" :disabled="estimating">
          <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': estimating }" /> {{ estimating ? 'Estimating…' : 'Re-estimate' }}
        </button>
      </div>
    </div>

    <!-- Total banner -->
    <div class="relative overflow-hidden rounded-2xl bg-navy-gradient p-6 sm:p-8">
      <div class="absolute inset-0 bg-hero-glow"></div>
      <div class="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p class="text-sm text-white/60">Total Estimated Cost ({{ region }} rates)</p>
          <p class="mt-1 font-display text-4xl font-extrabold text-white">{{ formatFull(total) }}</p>
          <!-- Only a benchmark an administrator actually set is compared
               against. No benchmark is not the same as being on budget. -->
          <p v-if="benchmarkDelta !== null" class="mt-2 flex items-center gap-1.5 text-sm" :class="benchmarkDelta >= 0 ? 'text-success' : 'text-warning'">
            <component :is="benchmarkDelta >= 0 ? TrendingUp : TrendingDown" class="h-4 w-4" />
            {{ Math.abs(benchmarkDelta).toFixed(1) }}% {{ benchmarkDelta >= 0 ? 'below' : 'above' }} the {{ region }} benchmark
          </p>
          <p v-else class="mt-2 text-sm text-white/50">No benchmark is set for {{ region }}, so no comparison is shown.</p>
        </div>
        <!-- An "AI confidence" on a figure derived from a fixed percentage
             split is meaningless, so it is shown only for a bill the engine
             actually measured, and reads from those items. -->
        <div v-if="measuredConfidence !== null" class="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-3 text-white">
          <Sparkles class="h-5 w-5 text-primary-light" />
          <div>
            <p class="text-xs text-white/60">Measured confidence</p>
            <p class="font-bold">{{ measuredConfidence }}%</p>
          </div>
        </div>
      </div>
    </div>

    <!-- What the server wants the reader to know about this estimate: an
         uncalibrated regional factor, a missing benchmark, no bill to price
         from. -->
    <div v-if="notes.length" class="space-y-2">
      <p v-for="n in notes" :key="n.text" class="rounded-xl border px-4 py-3 text-sm"
        :class="n.type === 'warning' ? 'border-warning/30 bg-warning/5 text-brand-muted' : 'border-primary/30 bg-primary/5 text-brand-muted'">
        {{ n.text }}
      </p>
    </div>

    <!-- Category cards -->
    <div class="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      <div v-for="c in categories" :key="c.name" class="card p-5">
        <div class="flex items-center justify-between">
          <div :class="c.color" class="grid h-10 w-10 place-items-center rounded-xl"><component :is="c.icon" class="h-5 w-5" /></div>
          <span class="text-sm font-semibold text-brand-muted">{{ c.pct }}%</span>
        </div>
        <p class="mt-3 text-sm text-brand-muted">{{ c.name }}</p>
        <p class="font-display text-lg font-bold text-secondary">{{ formatFull(c.value) }}</p>
      </div>
    </div>

    <!-- Charts -->
    <div class="grid gap-6 lg:grid-cols-3">
      <div class="card p-6 lg:col-span-2">
        <h3 class="mb-1 font-display text-lg font-bold text-secondary">Cost by Element</h3>
        <p class="mb-4 text-sm text-brand-muted">Estimated cost per construction element (₦M)</p>
        <BarChart v-if="hasElements" :key="region" :labels="elements.labels" :data="elements.data" :height="280" />
        <p v-else class="grid h-[280px] place-content-center rounded-xl border border-dashed border-brand-border-light px-6 text-center text-sm text-brand-muted">
          Nothing to break down yet — generate a bill of quantities first.
        </p>
      </div>
      <div class="card p-6">
        <h3 class="mb-1 font-display text-lg font-bold text-secondary">Cost Split</h3>
        <p class="mb-4 text-sm text-brand-muted">By category</p>
        <DoughnutChart :key="region" :labels="split.labels" :data="split.data" :height="240" />
      </div>
    </div>

    <!-- Rate analysis -->
    <div class="card overflow-hidden">
      <div class="flex items-center gap-2 border-b border-brand-border-light p-5">
        <Calculator class="h-5 w-5 text-primary" />
        <h3 class="font-display font-bold text-secondary">Rate Analysis</h3>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-brand-border-light text-left text-xs font-semibold uppercase tracking-wide text-brand-light">
              <th class="px-5 py-3">Work Item</th>
              <th class="px-3 py-3 text-right">Material</th>
              <th class="px-3 py-3 text-right">Labour</th>
              <th class="px-3 py-3 text-right">Equipment</th>
              <th class="px-5 py-3 text-right">Unit Rate</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in appliedRates" :key="r.id" class="border-b border-brand-border-light bg-primary/5">
              <td class="px-5 py-3 font-medium text-secondary">
                {{ r.item }}
                <span class="badge ml-1.5 bg-primary/10 text-primary-dark">{{ r.vendor }}</span>
              </td>
              <td class="px-3 py-3 text-right text-brand-muted">₦{{ r.material.toLocaleString() }}</td>
              <td class="px-3 py-3 text-right text-brand-light">—</td>
              <td class="px-3 py-3 text-right text-brand-light">—</td>
              <td class="px-5 py-3 text-right">
                <div class="flex items-center justify-end gap-2">
                  <span class="font-bold text-secondary">₦{{ r.total.toLocaleString() }}</span>
                  <button class="grid h-7 w-7 place-items-center rounded-lg text-brand-light hover:bg-danger/10 hover:text-danger" title="Remove from estimate" @click="unapplyRate(r)">
                    <Trash2 class="h-3.5 w-3.5" />
                  </button>
                </div>
              </td>
            </tr>
            <tr v-for="r in rateAnalysis" :key="r.item" class="border-b border-brand-border-light last:border-0 hover:bg-brand-bg">
              <td class="px-5 py-3 font-medium text-secondary">{{ r.item }}</td>
              <td class="px-3 py-3 text-right text-brand-muted">₦{{ r.material.toLocaleString() }}</td>
              <td class="px-3 py-3 text-right text-brand-muted">₦{{ r.labour.toLocaleString() }}</td>
              <td class="px-3 py-3 text-right text-brand-muted">₦{{ r.equipment.toLocaleString() }}</td>
              <td class="px-5 py-3 text-right font-bold text-secondary">₦{{ r.total.toLocaleString() }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Your own cost data -->
    <div class="card overflow-hidden">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-brand-border-light p-5">
        <div class="flex items-center gap-2">
          <FileSpreadsheet class="h-5 w-5 text-primary" />
          <div>
            <h3 class="font-display font-bold text-secondary">Your Cost Data</h3>
            <p class="text-sm text-brand-muted">Price this job from your own schedule instead of the AI estimate</p>
          </div>
          <span v-if="costs.count" class="badge bg-primary/10 text-primary-dark">{{ costs.count }}</span>
        </div>
        <button v-if="costs.count" class="btn-outline btn-sm" @click="clearAllCosts">
          <Trash2 class="h-4 w-4" /> Clear all
        </button>
      </div>

      <div class="p-5">
        <CostUpload />

        <!-- Uploaded cost lines sit directly beneath the upload area. -->
        <div v-if="costs.count" class="mt-5">
          <!-- AI vs your costs -->
          <div class="mb-4 grid gap-3 sm:grid-cols-3">
            <div class="rounded-xl border border-brand-border-light p-4">
              <p class="text-xs text-brand-light">AI estimate ({{ region }})</p>
              <p class="mt-1 font-display text-lg font-bold text-secondary">{{ formatFull(total) }}</p>
            </div>
            <div class="rounded-xl border border-primary/30 bg-primary/5 p-4">
              <p class="text-xs text-brand-light">Your uploaded costs</p>
              <p class="mt-1 font-display text-lg font-bold text-secondary">{{ formatFull(costs.pricedTotal) }}</p>
              <p class="text-[11px] text-brand-light">{{ costs.pricedCount }} of {{ costs.count }} lines carry a quantity</p>
            </div>
            <div class="rounded-xl border border-brand-border-light p-4">
              <p class="text-xs text-brand-light">Variance</p>
              <p v-if="costVariance" class="mt-1 flex items-center gap-1 font-display text-lg font-bold"
                :class="costVariance.diff > 0 ? 'text-danger' : 'text-success'">
                <component :is="costVariance.diff > 0 ? TrendingUp : TrendingDown" class="h-4 w-4" />
                {{ costVariance.diff > 0 ? '+' : '−' }}{{ formatFull(Math.abs(costVariance.diff)) }}
              </p>
              <p v-else class="mt-1 text-sm text-brand-muted">Add quantities to compare</p>
              <p v-if="costVariance" class="text-[11px] text-brand-light">
                {{ Math.abs(costVariance.pct).toFixed(1) }}% {{ costVariance.diff > 0 ? 'above' : 'below' }} the AI estimate
              </p>
            </div>
          </div>

          <!-- Source files -->
          <div class="mb-3 flex flex-wrap gap-2">
            <span v-for="src in costs.sources" :key="src"
              class="inline-flex items-center gap-1.5 rounded-lg border border-brand-border-light bg-brand-bg px-2.5 py-1 text-xs text-brand-muted">
              <Upload class="h-3 w-3" /> {{ src }}
              <button class="text-brand-light hover:text-danger" title="Remove this file's lines" @click="clearCostSource(src)">✕</button>
            </span>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-brand-border-light text-left text-xs font-semibold uppercase tracking-wide text-brand-light">
                  <th class="py-3 pr-3">Item</th>
                  <th class="px-3 py-3">Section</th>
                  <th class="px-3 py-3">Unit</th>
                  <th class="px-3 py-3 text-right">Qty</th>
                  <th class="px-3 py-3 text-right">Rate</th>
                  <th class="px-3 py-3 text-right">Amount</th>
                  <th class="py-3 pl-3"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="l in costs.lines" :key="l.id" class="group border-b border-brand-border-light last:border-0 hover:bg-brand-bg">
                  <td class="py-3 pr-3 font-medium text-secondary">{{ l.item }}</td>
                  <td class="px-3 py-3 text-brand-muted">{{ l.section || '—' }}</td>
                  <td class="px-3 py-3 text-brand-muted">{{ l.unit }}</td>
                  <td class="px-3 py-3 text-right">
                    <input :value="l.qty" type="number" min="0" step="any"
                      class="w-20 rounded-md bg-transparent text-right hover:bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                      @input="costs.update(l.id, { qty: $event.target.value })" />
                  </td>
                  <td class="px-3 py-3 text-right">
                    <input :value="l.rate" type="number" min="0" step="any"
                      class="w-28 rounded-md bg-transparent text-right font-semibold hover:bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                      @input="costs.update(l.id, { rate: $event.target.value })" />
                  </td>
                  <td class="px-3 py-3 text-right font-bold text-secondary">
                    {{ l.qty > 0 ? formatFull(l.qty * l.rate) : '—' }}
                  </td>
                  <td class="py-3 pl-3">
                    <div class="flex items-center justify-end gap-1">
                      <button class="btn-outline btn-sm" title="Use this rate in the rate analysis" @click="applyCostLine(l)">Apply</button>
                      <button class="grid h-8 w-8 place-items-center rounded-lg text-brand-light hover:bg-danger/10 hover:text-danger"
                        title="Remove line" @click="removeCostLine(l)"><Trash2 class="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Vendor-confirmed prices -->
    <div class="card overflow-hidden">
      <div class="flex items-center justify-between gap-3 border-b border-brand-border-light p-5">
        <div class="flex items-center gap-2">
          <Store class="h-5 w-5 text-primary" />
          <h3 class="font-display font-bold text-secondary">Vendor-Confirmed Prices</h3>
          <span v-if="vendors.savedCount" class="badge bg-primary/10 text-primary-dark">{{ vendors.savedCount }}</span>
        </div>
        <RouterLink to="/app/vendors" class="inline-flex items-center gap-1 text-sm font-semibold text-primary-dark hover:underline">
          Marketplace <ArrowRight class="h-3.5 w-3.5" />
        </RouterLink>
      </div>

      <div v-if="vendors.savedCount" class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-brand-border-light text-left text-xs font-semibold uppercase tracking-wide text-brand-light">
              <th class="px-5 py-3">Item</th>
              <th class="px-3 py-3">Vendor</th>
              <th class="px-3 py-3">Unit</th>
              <th class="px-3 py-3 text-right">Rate</th>
              <th class="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in vendors.savedPrices" :key="p.id" class="border-b border-brand-border-light last:border-0 hover:bg-brand-bg">
              <td class="px-5 py-3 font-medium text-secondary">{{ p.item }}</td>
              <td class="px-3 py-3 text-brand-muted">{{ p.vendor }}</td>
              <td class="px-3 py-3 text-brand-muted">{{ p.unit }}</td>
              <td class="px-3 py-3 text-right font-bold text-secondary">{{ formatFull(p.rate) }}</td>
              <td class="px-5 py-3">
                <div class="flex items-center justify-end gap-1">
                  <button class="btn-outline btn-sm" title="Use this rate in the estimate" @click="applyPrice(p)">Apply</button>
                  <button class="grid h-8 w-8 place-items-center rounded-lg text-brand-light transition-colors hover:bg-danger/10 hover:text-danger" title="Remove price"
                    @click="vendors.removeSavedPrice(p.id); toast('Price removed', 'info')">
                    <Trash2 class="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <p class="flex items-start gap-1.5 px-5 py-3 text-xs text-brand-light">
          <Sparkles class="mt-0.5 h-3.5 w-3.5 shrink-0" /> Live rates you confirmed with vendors. Apply one to overwrite the matching material rate above.
        </p>
      </div>

      <div v-else class="flex flex-col items-center justify-center gap-3 py-12 text-center">
        <div class="grid h-14 w-14 place-items-center rounded-2xl bg-brand-bg text-brand-light"><Store class="h-6 w-6" /></div>
        <p class="font-semibold text-secondary">No vendor prices yet</p>
        <p class="mx-auto max-w-sm text-sm text-brand-muted">Unlock a vendor in the marketplace, confirm a price by phone, then save it — it'll show up here for your estimate.</p>
        <RouterLink to="/app/vendors" class="btn-primary btn-md"><Store class="h-4 w-4" /> Browse vendors</RouterLink>
      </div>
    </div>
  </div>
</template>
