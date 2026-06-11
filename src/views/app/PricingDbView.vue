<script setup>
import { ref, computed } from 'vue'
import { Database, Search, Plus, TrendingUp, TrendingDown, Package, HardHat, Wrench, Upload } from 'lucide-vue-next'
import { useToast } from '@/composables/useToast'

const { toast } = useToast()
const query = ref('')
const category = ref('All')
const categories = ['All', 'Materials', 'Labour', 'Equipment']

const iconFor = { Materials: Package, Labour: HardHat, Equipment: Wrench }

const items = ref([
  { name: 'Portland Cement (50kg bag)', cat: 'Materials', unit: 'bag', rate: 9500, change: 4.2, region: 'Lagos', icon: Package },
  { name: 'Sharp Sand', cat: 'Materials', unit: 'm³', rate: 18000, change: -1.5, region: 'Lagos', icon: Package },
  { name: 'Granite (3/4")', cat: 'Materials', unit: 'm³', rate: 42000, change: 6.8, region: 'Lagos', icon: Package },
  { name: 'Y16 Reinforcement Bar', cat: 'Materials', unit: 'tonne', rate: 980000, change: 2.1, region: 'Lagos', icon: Package },
  { name: 'Sandcrete Block (9")', cat: 'Materials', unit: 'no', rate: 480, change: 0, region: 'Lagos', icon: Package },
  { name: 'Mason (skilled)', cat: 'Labour', unit: 'day', rate: 12000, change: 8.3, region: 'Lagos', icon: HardHat },
  { name: 'Labourer (unskilled)', cat: 'Labour', unit: 'day', rate: 6500, change: 3.0, region: 'Lagos', icon: HardHat },
  { name: 'Steel Fixer', cat: 'Labour', unit: 'day', rate: 14000, change: 5.5, region: 'Lagos', icon: HardHat },
  { name: 'Concrete Mixer (hire)', cat: 'Equipment', unit: 'day', rate: 25000, change: -2.4, region: 'Lagos', icon: Wrench },
  { name: 'Poker Vibrator (hire)', cat: 'Equipment', unit: 'day', rate: 15000, change: 1.2, region: 'Lagos', icon: Wrench },
])

const catColor = { Materials: 'bg-primary/10 text-primary', Labour: 'bg-success/10 text-success', Equipment: 'bg-warning/10 text-warning' }

function addRate() {
  const cat = category.value === 'All' ? 'Materials' : category.value
  items.value.unshift({ name: 'New rate item', cat, unit: 'no', rate: 0, change: 0, region: 'Lagos', icon: iconFor[cat] })
  toast('Rate added — set its price')
}
function importLibrary() {
  toast('Rate library imported (mock)', 'info')
}

const filtered = computed(() => items.value.filter((i) => {
  const c = category.value === 'All' || i.cat === category.value
  const q = i.name.toLowerCase().includes(query.value.toLowerCase())
  return c && q
}))
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="font-display text-2xl font-bold text-secondary">Pricing Database</h2>
        <p class="mt-1 text-brand-muted">Live material, labour & equipment rates · Lagos region</p>
      </div>
      <div class="flex gap-2">
        <button class="btn-outline btn-md" @click="importLibrary"><Upload class="h-4 w-4" /> Import library</button>
        <button class="btn-primary btn-md" @click="addRate"><Plus class="h-4 w-4" /> Add rate</button>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div class="relative flex-1">
        <Search class="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-light" />
        <input v-model="query" class="input pl-10" placeholder="Search materials, labour, equipment…" />
      </div>
      <div class="flex gap-2">
        <button v-for="c in categories" :key="c" @click="category = c"
          class="whitespace-nowrap rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors"
          :class="category === c ? 'border-primary bg-primary/10 text-primary-dark' : 'border-brand-border bg-white text-brand-muted hover:border-primary/40'">
          {{ c }}
        </button>
      </div>
    </div>

    <!-- Table -->
    <div class="card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-brand-border-light bg-brand-bg text-left text-xs font-semibold uppercase tracking-wide text-brand-light">
              <th class="px-5 py-3">Item</th>
              <th class="px-3 py-3">Category</th>
              <th class="px-3 py-3">Unit</th>
              <th class="px-3 py-3 text-right">Rate</th>
              <th class="px-5 py-3 text-right">30-day change</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="i in filtered" :key="i.name" class="border-b border-brand-border-light last:border-0 hover:bg-brand-bg">
              <td class="px-5 py-3">
                <div class="flex items-center gap-3">
                  <div :class="catColor[i.cat]" class="grid h-9 w-9 shrink-0 place-items-center rounded-lg"><component :is="i.icon" class="h-4 w-4" /></div>
                  <span class="font-medium text-secondary">{{ i.name }}</span>
                </div>
              </td>
              <td class="px-3 py-3"><span class="chip" :class="catColor[i.cat]">{{ i.cat }}</span></td>
              <td class="px-3 py-3 text-brand-muted">{{ i.unit }}</td>
              <td class="px-3 py-3 text-right font-bold text-secondary">₦{{ i.rate.toLocaleString() }}</td>
              <td class="px-5 py-3 text-right">
                <span v-if="i.change === 0" class="text-sm text-brand-light">—</span>
                <span v-else class="inline-flex items-center gap-1 text-sm font-semibold" :class="i.change > 0 ? 'text-danger' : 'text-success'">
                  <component :is="i.change > 0 ? TrendingUp : TrendingDown" class="h-4 w-4" />
                  {{ Math.abs(i.change) }}%
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
