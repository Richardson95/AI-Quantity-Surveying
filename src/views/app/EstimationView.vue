<script setup>
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { Calculator, TrendingUp, Sparkles, RefreshCw, Globe, Package, HardHat, Wrench, Store, Trash2, ArrowRight } from 'lucide-vue-next'
import BarChart from '@/components/charts/BarChart.vue'
import DoughnutChart from '@/components/charts/DoughnutChart.vue'
import { useToast } from '@/composables/useToast'
import { useVendorsStore } from '@/stores/vendors'
import { formatFull } from '@/utils/format'

const { toast } = useToast()
const vendors = useVendorsStore()
const region = ref('Lagos')
const regions = ['Lagos', 'Abuja', 'Port Harcourt', 'Kano']
const estimating = ref(false)

function reEstimate() {
  if (estimating.value) return
  estimating.value = true
  setTimeout(() => {
    estimating.value = false
    toast(`Estimate refreshed with latest ${region.value} rates`)
  }, 1500)
}

const categories = [
  { name: 'Materials', value: 98500000, pct: 53, icon: Package, color: 'bg-primary/10 text-primary' },
  { name: 'Labour', value: 52300000, pct: 28, icon: HardHat, color: 'bg-success/10 text-success' },
  { name: 'Equipment', value: 19800000, pct: 11, icon: Wrench, color: 'bg-warning/10 text-warning' },
  { name: 'Overheads & Profit', value: 14600000, pct: 8, icon: TrendingUp, color: 'bg-primary-light/20 text-primary-dark' },
]
const total = categories.reduce((a, c) => a + c.value, 0)

const elements = {
  labels: ['Substructure', 'Superstructure', 'Roofing', 'Finishes', 'Doors/Windows', 'Services'],
  data: [42, 58, 18, 31, 14, 22],
}
const split = { labels: categories.map((c) => c.name), data: categories.map((c) => c.pct) }

const rateAnalysis = [
  { item: 'RC slab 150mm (per m²)', material: 14800, labour: 6200, equipment: 1500, total: 22500 },
  { item: 'Block wall 225mm (per m²)', material: 4100, labour: 2300, equipment: 400, total: 6800 },
  { item: 'Plaster 12mm (per m²)', material: 1300, labour: 950, equipment: 150, total: 2400 },
  { item: 'Floor tiling (per m²)', material: 7800, labour: 3100, equipment: 600, total: 11500 },
]
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="font-display text-2xl font-bold text-secondary">Cost Estimation</h2>
        <p class="mt-1 text-brand-muted">AI-priced estimate · Lekki 4-Bedroom Duplex</p>
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
          <p class="mt-2 flex items-center gap-1.5 text-sm text-success"><TrendingUp class="h-4 w-4" /> 4.2% below regional benchmark</p>
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
        <BarChart :labels="elements.labels" :data="elements.data" :height="280" />
      </div>
      <div class="card p-6">
        <h3 class="mb-1 font-display text-lg font-bold text-secondary">Cost Split</h3>
        <p class="mb-4 text-sm text-brand-muted">By category</p>
        <DoughnutChart :labels="split.labels" :data="split.data" :height="240" />
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
              <td class="px-5 py-3 text-right">
                <button class="grid h-8 w-8 place-items-center rounded-lg text-brand-light transition-colors hover:bg-danger/10 hover:text-danger" title="Remove price"
                  @click="vendors.removeSavedPrice(p.id); toast('Price removed', 'info')">
                  <Trash2 class="h-4 w-4" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <p class="flex items-start gap-1.5 px-5 py-3 text-xs text-brand-light">
          <Sparkles class="mt-0.5 h-3.5 w-3.5 shrink-0" /> Live rates you confirmed with vendors — these feed straight into your estimate.
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
