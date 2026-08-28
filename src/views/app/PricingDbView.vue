<script setup>
import { ref, computed } from 'vue'
import { Database, Search, Plus, TrendingUp, TrendingDown, Package, HardHat, Wrench, Upload, Globe, Trash2, X } from 'lucide-vue-next'
import { useToast } from '@/composables/useToast'
import { normalizeUnit, COMMON_UNITS } from '@/utils/units'

const { toast } = useToast()
const query = ref('')
const category = ref('All')
const categories = ['All', 'Materials', 'Labour', 'Equipment']

const iconFor = { Materials: Package, Labour: HardHat, Equipment: Wrench }

const region = ref('Lagos')
const regions = ['Lagos', 'Abuja', 'Port Harcourt', 'Kano']

const items = ref([
  { id: 1, name: 'Portland Cement (50kg bag)', cat: 'Materials', unit: 'bag', rate: 9500, change: 4.2, region: 'Lagos', icon: Package },
  { id: 2, name: 'Sharp Sand', cat: 'Materials', unit: 'm³', rate: 18000, change: -1.5, region: 'Lagos', icon: Package },
  { id: 3, name: 'Granite (3/4")', cat: 'Materials', unit: 'm³', rate: 42000, change: 6.8, region: 'Lagos', icon: Package },
  { id: 4, name: 'Y16 Reinforcement Bar', cat: 'Materials', unit: 'tonne', rate: 980000, change: 2.1, region: 'Lagos', icon: Package },
  { id: 5, name: 'Sandcrete Block (9")', cat: 'Materials', unit: 'no', rate: 480, change: 0, region: 'Lagos', icon: Package },
  { id: 6, name: 'Mason (skilled)', cat: 'Labour', unit: 'day', rate: 12000, change: 8.3, region: 'Lagos', icon: HardHat },
  { id: 7, name: 'Labourer (unskilled)', cat: 'Labour', unit: 'day', rate: 6500, change: 3.0, region: 'Lagos', icon: HardHat },
  { id: 8, name: 'Steel Fixer', cat: 'Labour', unit: 'day', rate: 14000, change: 5.5, region: 'Lagos', icon: HardHat },
  { id: 9, name: 'Concrete Mixer (hire)', cat: 'Equipment', unit: 'day', rate: 25000, change: -2.4, region: 'Lagos', icon: Wrench },
  { id: 10, name: 'Poker Vibrator (hire)', cat: 'Equipment', unit: 'day', rate: 15000, change: 1.2, region: 'Lagos', icon: Wrench },
])

const catColor = { Materials: 'bg-primary/10 text-primary', Labour: 'bg-success/10 text-success', Equipment: 'bg-warning/10 text-warning' }

let rateId = 100

// Adding a rate used to drop a blank "New rate item" row on the table and
// leave you to find it. Ask for the details up front instead.
const addOpen = ref(false)
const draft = ref(blankRate())
const draftError = ref('')

function blankRate() {
  return { name: '', cat: 'Materials', unit: '', rate: null }
}

function openAddRate() {
  draft.value = blankRate()
  if (category.value !== 'All') draft.value.cat = category.value
  draftError.value = ''
  addOpen.value = true
}

function addRate() {
  const name = draft.value.name.trim()
  if (!name) {
    draftError.value = 'Give the item a name.'
    return
  }
  if (items.value.some((i) => i.name.trim().toLowerCase() === name.toLowerCase())) {
    draftError.value = 'A rate with that name already exists.'
    return
  }
  if (!draft.value.unit.trim()) {
    draftError.value = 'Set a unit — bag, m², tonne, day and so on.'
    return
  }
  if (!(Number(draft.value.rate) > 0)) {
    draftError.value = 'Enter a rate greater than zero.'
    return
  }

  items.value.unshift({
    id: ++rateId,
    name,
    cat: draft.value.cat,
    unit: normalizeUnit(draft.value.unit),
    rate: Number(draft.value.rate),
    change: 0,
    region: region.value,
    icon: iconFor[draft.value.cat],
  })
  query.value = ''
  category.value = 'All'
  addOpen.value = false
  toast(`${name} added at ₦${Number(draft.value.rate).toLocaleString()}/${draft.value.unit.trim()}`)
}

function removeRate(item) {
  const i = items.value.findIndex((x) => x.id === item.id)
  if (i !== -1) items.value.splice(i, 1)
  toast(`Removed ${item.name}`, 'info')
}

// Importing reads a real CSV: name,category,unit,rate
const fileInput = ref(null)
function importLibrary() {
  fileInput.value?.click()
}
function onLibraryPicked(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    const lines = String(reader.result).split(/\r?\n/).filter((l) => l.trim())
    if (!lines.length) {
      toast('That file was empty', 'warning')
      return
    }
    // Skip a header row if it looks like one.
    if (/name/i.test(lines[0]) && /rate|price/i.test(lines[0])) lines.shift()
    let added = 0
    for (const line of lines) {
      const [name, cat, unit, rate] = line.split(',').map((c) => (c || '').trim())
      if (!name) continue
      const normalised = ['Materials', 'Labour', 'Equipment'].includes(cat) ? cat : 'Materials'
      items.value.unshift({
        id: ++rateId,
        name,
        cat: normalised,
        unit: normalizeUnit(unit) || 'no',
        rate: Number(String(rate).replace(/[^0-9.]/g, '')) || 0,
        // Imported libraries spell units many ways; normalise on the way in.
        change: 0,
        region: region.value,
        icon: iconFor[normalised],
      })
      added++
    }
    toast(added ? `${added} rates imported from ${file.name}` : 'No usable rows found in that file', added ? 'success' : 'warning')
  }
  reader.readAsText(file)
}

const filtered = computed(() => items.value.filter((i) => {
  const c = category.value === 'All' || i.cat === category.value
  const q = i.name.toLowerCase().includes(query.value.toLowerCase())
  return c && q
}))
</script>

<template>
  <div class="space-y-6">
    <datalist id="unit-options">
      <option v-for="u in COMMON_UNITS" :key="u" :value="u" />
    </datalist>
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="font-display text-2xl font-bold text-secondary">Pricing Database</h2>
        <p class="mt-1 text-brand-muted">Live material, labour & equipment rates · {{ region }} region</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <div class="flex items-center gap-2 rounded-xl border border-brand-border bg-white px-3 py-2">
          <Globe class="h-4 w-4 text-brand-light" />
          <select v-model="region" class="bg-transparent text-sm font-medium text-secondary focus:outline-none">
            <option v-for="r in regions" :key="r">{{ r }}</option>
          </select>
        </div>
        <input ref="fileInput" type="file" accept=".csv,.txt" class="hidden" @change="onLibraryPicked" />
        <button class="btn-outline btn-md" @click="importLibrary"><Upload class="h-4 w-4" /> Import library</button>
        <button class="btn-primary btn-md" @click="openAddRate"><Plus class="h-4 w-4" /> Add rate</button>
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
              <th class="px-3 py-3 text-right">30-day change</th>
              <th class="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="i in filtered" :key="i.id" class="group border-b border-brand-border-light last:border-0 hover:bg-brand-bg">
              <td class="px-5 py-3">
                <div class="flex items-center gap-3">
                  <div :class="catColor[i.cat]" class="grid h-9 w-9 shrink-0 place-items-center rounded-lg"><component :is="i.icon" class="h-4 w-4" /></div>
                  <input v-model="i.name" class="w-full min-w-0 rounded-md bg-transparent font-medium text-secondary hover:bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
              </td>
              <td class="px-3 py-3">
                <select v-model="i.cat" class="chip border-0 focus:outline-none focus:ring-2 focus:ring-primary/30" :class="catColor[i.cat]" @change="i.icon = iconFor[i.cat]">
                  <option v-for="c in categories.slice(1)" :key="c" :value="c">{{ c }}</option>
                </select>
              </td>
              <td class="px-3 py-3 text-brand-muted">
                <input v-model="i.unit" list="unit-options" class="w-16 rounded-md bg-transparent hover:bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                  @change="i.unit = normalizeUnit(i.unit)" />
              </td>
              <td class="px-3 py-3 text-right font-bold text-secondary">
                <span class="text-brand-light">₦</span>
                <input v-model.number="i.rate" type="number" min="0" step="any" class="w-28 rounded-md bg-transparent text-right font-bold hover:bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary" />
              </td>
              <td class="px-3 py-3 text-right">
                <span v-if="i.change === 0" class="text-sm text-brand-light">—</span>
                <span v-else class="inline-flex items-center gap-1 text-sm font-semibold" :class="i.change > 0 ? 'text-danger' : 'text-success'">
                  <component :is="i.change > 0 ? TrendingUp : TrendingDown" class="h-4 w-4" />
                  {{ Math.abs(i.change) }}%
                </span>
              </td>
              <td class="px-5 py-3 text-right">
                <button class="grid h-8 w-8 place-items-center rounded-lg text-brand-light opacity-0 transition-opacity hover:bg-danger/10 hover:text-danger group-hover:opacity-100"
                  title="Delete rate" @click="removeRate(i)"><Trash2 class="h-4 w-4" /></button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-if="!filtered.length" class="px-5 py-14 text-center text-sm text-brand-muted">
        No rates match your search. Add one, or import a CSV library.
      </p>
    </div>

    <!-- Add rate -->
    <transition name="page">
      <div v-if="addOpen" class="fixed inset-0 z-[60] flex items-end justify-center bg-secondary/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" @click.self="addOpen = false">
        <div class="w-full max-w-lg overflow-hidden rounded-t-2xl bg-white shadow-card-hover sm:rounded-2xl">
          <div class="flex items-center justify-between border-b border-brand-border-light px-6 py-4">
            <h3 class="font-display text-lg font-bold text-secondary">Add a rate</h3>
            <button class="btn btn-ghost btn-sm" @click="addOpen = false"><X class="h-5 w-5" /></button>
          </div>
          <form class="space-y-4 p-6" @submit.prevent="addRate">
            <div>
              <label class="label">Item</label>
              <input v-model="draft.name" class="input" placeholder="Portland Cement (50kg bag)" autofocus />
            </div>
            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label class="label">Category</label>
                <select v-model="draft.cat" class="input">
                  <option v-for="c in categories.slice(1)" :key="c" :value="c">{{ c }}</option>
                </select>
              </div>
              <div>
                <label class="label">Unit</label>
                <input v-model="draft.unit" list="unit-options" class="input" placeholder="bag, m², tonne, day…"
                  @change="draft.unit = normalizeUnit(draft.unit)" />
              </div>
            </div>
            <div>
              <label class="label">Rate (₦ per unit)</label>
              <input v-model.number="draft.rate" type="number" min="0" step="any" class="input" placeholder="9500" />
              <p class="mt-1.5 text-xs text-brand-muted">Saved against the {{ region }} region.</p>
            </div>
            <p v-if="draftError" class="text-sm font-medium text-danger">{{ draftError }}</p>
            <div class="flex gap-2 pt-2">
              <button type="button" class="btn-outline btn-md flex-1" @click="addOpen = false">Cancel</button>
              <button type="submit" class="btn-primary btn-md flex-1"><Plus class="h-4 w-4" /> Add rate</button>
            </div>
          </form>
        </div>
      </div>
    </transition>
  </div>
</template>
