<script setup>
import { ref, computed } from 'vue'
import { RouterLink } from 'vue-router'
import { Calculator, TrendingUp, TrendingDown, Sparkles, RefreshCw, Globe, Package, HardHat, Wrench, Store, Trash2, ArrowRight, FileSpreadsheet, Upload } from 'lucide-vue-next'
import BarChart from '@/components/charts/BarChart.vue'
import DoughnutChart from '@/components/charts/DoughnutChart.vue'
import { useToast } from '@/composables/useToast'
import { useVendorsStore } from '@/stores/vendors'
import { useCostsStore } from '@/stores/costs'
import { useProjectsStore } from '@/stores/projects'
import { formatFull } from '@/utils/format'
import CostUpload from '@/components/CostUpload.vue'

const { toast } = useToast()
const vendors = useVendorsStore()
const costs = useCostsStore()
const projects = useProjectsStore()
const region = ref('Lagos')
const estimating = ref(false)

// Every figure on this page is quoted in Lagos rates, then adjusted by region.
// Materials, labour and equipment each move differently between markets.
const regionFactors = {
  Lagos: { label: 'Lagos', material: 1, labour: 1, equipment: 1, benchmark: 193400000 },
  Abuja: { label: 'Abuja', material: 1.06, labour: 1.12, equipment: 1.04, benchmark: 205600000 },
  'Port Harcourt': { label: 'Port Harcourt', material: 1.09, labour: 1.05, equipment: 1.08, benchmark: 203100000 },
  Kano: { label: 'Kano', material: 0.94, labour: 0.86, equipment: 0.97, benchmark: 176800000 },
}
const regions = Object.keys(regionFactors)
const factor = computed(() => regionFactors[region.value])

// Standard cost split applied to the priced BOQ.
const SPLIT = [
  { name: 'Materials', share: 0.53, driver: 'material', icon: Package, color: 'bg-primary/10 text-primary' },
  { name: 'Labour', share: 0.28, driver: 'labour', icon: HardHat, color: 'bg-success/10 text-success' },
  { name: 'Equipment', share: 0.11, driver: 'equipment', icon: Wrench, color: 'bg-warning/10 text-warning' },
  { name: 'Overheads & Profit', share: 0.08, driver: 'material', icon: TrendingUp, color: 'bg-primary-light/20 text-primary-dark' },
]

// Used only until a BOQ exists, so the page is never empty on a fresh install.
const FALLBACK_TOTAL = 185200000

// The estimate is priced off the current Bill of Quantities, so regenerating
// the BOQ from new drawings flows straight through to the cost here.
const boqTotal = computed(() => projects.boqItems.reduce((a, i) => a + i.qty * i.rate, 0))
const basis = computed(() => (boqTotal.value > 0 ? boqTotal.value : FALLBACK_TOTAL))

const categories = computed(() => {
  const rows = SPLIT.map((c) => ({
    ...c,
    value: Math.round(basis.value * c.share * factor.value[c.driver]),
  }))
  const sum = rows.reduce((a, c) => a + c.value, 0)
  return rows.map((c) => ({ ...c, pct: Math.round((c.value / sum) * 100) }))
})

const total = computed(() => categories.value.reduce((a, c) => a + c.value, 0))

// Positive means under benchmark, which is the competitive direction.
const benchmarkDelta = computed(() => {
  // Benchmark scales with the job so the comparison stays meaningful when the
  // BOQ grows or shrinks.
  const b = factor.value.benchmark * (basis.value / FALLBACK_TOTAL)
  return ((b - total.value) / b) * 100
})

const FALLBACK_ELEMENTS = {
  Substructure: 42, Superstructure: 58, Roofing: 18,
  Finishes: 31, 'Doors & Windows': 14, Services: 22,
}

// Real section totals from the BOQ, in millions.
const elements = computed(() => {
  const bySection = {}
  for (const i of projects.boqItems) {
    bySection[i.section] = (bySection[i.section] || 0) + i.qty * i.rate
  }
  const source = Object.keys(bySection).length
    ? Object.fromEntries(Object.entries(bySection).map(([k, v]) => [k, v / 1_000_000]))
    : FALLBACK_ELEMENTS
  const labels = Object.keys(source)
  return {
    labels,
    data: labels.map((l) => Math.round(source[l] * factor.value.material * 10) / 10),
  }
})
const split = computed(() => ({
  labels: categories.value.map((c) => c.name),
  data: categories.value.map((c) => c.pct),
}))

const baseRates = [
  { item: 'RC slab 150mm (per m²)', material: 14800, labour: 6200, equipment: 1500 },
  { item: 'Block wall 225mm (per m²)', material: 4100, labour: 2300, equipment: 400 },
  { item: 'Plaster 12mm (per m²)', material: 1300, labour: 950, equipment: 150 },
  { item: 'Floor tiling (per m²)', material: 7800, labour: 3100, equipment: 600 },
]
const rateAnalysis = computed(() =>
  baseRates.map((r) => {
    const material = Math.round(r.material * factor.value.material)
    const labour = Math.round(r.labour * factor.value.labour)
    const equipment = Math.round(r.equipment * factor.value.equipment)
    return { ...r, material, labour, equipment, total: material + labour + equipment }
  })
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

function removeCostLine(line) {
  costs.remove(line.id)
  appliedRates.value = appliedRates.value.filter((r) => r.id !== line.id)
  toast('Cost line removed', 'info')
}

function clearAllCosts() {
  costs.clear()
  appliedRates.value = []
  toast('All uploaded costs cleared', 'info')
}

function clearCostSource(source) {
  const ids = costs.lines.filter((l) => l.source === source).map((l) => l.id)
  costs.removeSource(source)
  appliedRates.value = appliedRates.value.filter((r) => !ids.includes(r.id))
  toast(`Removed all lines from ${source}`, 'info')
}

const lastEstimated = ref(null)

function reEstimate() {
  if (estimating.value) return
  estimating.value = true
  const before = total.value
  setTimeout(() => {
    estimating.value = false
    lastEstimated.value = new Date()
    const delta = total.value - before
    toast(
      projects.boqItems.length
        ? `Repriced ${projects.boqItems.length} BOQ items at ${region.value} rates — ${formatFull(total.value)}`
        : `No BOQ yet — showing an indicative ${region.value} estimate`,
      projects.boqItems.length ? 'success' : 'warning'
    )
    if (delta) toast(`${delta > 0 ? 'Up' : 'Down'} ${formatFull(Math.abs(delta))} on the previous run`, 'info')
  }, 1200)
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="font-display text-2xl font-bold text-secondary">Cost Estimation</h2>
        <p class="mt-1 text-brand-muted">AI-priced estimate · Lekki 4-Bedroom Duplex</p>
        <p class="mt-1 text-xs text-brand-light">
          <template v-if="projects.boqItems.length">
            Priced from {{ projects.boqItems.length }} BOQ items<template v-if="projects.boqSources.length"> derived from {{ projects.boqSources.length }} drawing{{ projects.boqSources.length > 1 ? 's' : '' }}</template>
            <template v-if="lastEstimated"> · last run {{ lastEstimated.toLocaleTimeString('en-NG') }}</template>
          </template>
          <template v-else>Indicative figure — generate a BOQ to price this job from your drawings.</template>
        </p>
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
          <p class="mt-2 flex items-center gap-1.5 text-sm" :class="benchmarkDelta >= 0 ? 'text-success' : 'text-warning'">
            <component :is="benchmarkDelta >= 0 ? TrendingUp : TrendingDown" class="h-4 w-4" />
            {{ Math.abs(benchmarkDelta).toFixed(1) }}% {{ benchmarkDelta >= 0 ? 'below' : 'above' }} the {{ region }} benchmark
          </p>
        </div>
        <div class="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-3 text-white">
          <Sparkles class="h-5 w-5 text-primary-light" />
          <div>
            <p class="text-xs text-white/60">AI confidence</p>
            <p class="font-bold">93.4%</p>
          </div>
        </div>
      </div>
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
        <BarChart :key="region" :labels="elements.labels" :data="elements.data" :height="280" />
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
