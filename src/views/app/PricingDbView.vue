<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { Database, Search, Plus, TrendingUp, TrendingDown, Package, HardHat, Wrench, Upload, Globe, Trash2, X, History } from 'lucide-vue-next'
import { useToast } from '@/composables/useToast'
import { useRatesStore } from '@/stores/rates'
import { normalizeUnit, COMMON_UNITS } from '@/utils/units'
import { formatFull, timeAgo } from '@/utils/format'

const { toast } = useToast()
const store = useRatesStore()

const query = ref('')
const category = ref('All')
const categories = ['All', 'Materials', 'Labour', 'Equipment']

const iconFor = { Materials: Package, Labour: HardHat, Equipment: Wrench }

const region = ref('Lagos')
// Regions come from the server: the factors and benchmarks live in a table an
// administrator edits, not in this file.
const regions = computed(() =>
  store.regions.map((r) => r.name)
)

const items = computed(() => store.rates)

onMounted(async () => {
  await Promise.all([
    store.fetch({ region: region.value }).catch((e) => toast(e.message, 'warning')),
    store.fetchRegions(),
  ])
})

// Rates are regional, so changing region re-reads the library rather than
// filtering a list that only ever held one region's prices.
watch(region, (r) => store.fetch({ region: r, force: true }).catch(() => {}))

const catColor = { Materials: 'bg-primary/10 text-primary', Labour: 'bg-success/10 text-success', Equipment: 'bg-warning/10 text-warning' }

// Adding a rate used to drop a blank "New rate item" row on the table and
// leave you to find it. Ask for the details up front instead.
const addOpen = ref(false)
const saving = ref(false)
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

async function addRate() {
  if (saving.value) return
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

  saving.value = true
  try {
    await store.create({
      name,
      cat: draft.value.cat,
      unit: draft.value.unit,
      rate: Number(draft.value.rate),
      region: region.value,
    })
    query.value = ''
    category.value = 'All'
    addOpen.value = false
    toast(`${name} added at ₦${Number(draft.value.rate).toLocaleString()}/${normalizeUnit(draft.value.unit)}`)
  } catch (err) {
    draftError.value = err.message || 'That rate could not be added.'
  } finally {
    saving.value = false
  }
}

async function editRate(item, patch) {
  try {
    await store.update(item.id, patch)
  } catch (err) {
    toast(err.message || 'That rate could not be updated', 'warning')
    await store.fetch({ region: region.value, force: true }).catch(() => {})
  }
}

async function removeRate(item) {
  try {
    await store.remove(item.id)
    toast(`Removed ${item.name}`, 'info')
  } catch (err) {
    // Curated global market rates belong to everyone; the server refuses.
    toast(err.message || `${item.name} could not be removed`, 'warning')
  }
}

// Importing hands the CSV to the server, which parses it and reports every row
// it could not read rather than silently dropping any.
const fileInput = ref(null)
const importing = ref(false)

function importLibrary() {
  fileInput.value?.click()
}

async function onLibraryPicked(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file) return

  importing.value = true
  try {
    const res = await store.importCsv(file)
    for (const r of (res.rejected || []).slice(0, 3)) {
      toast(`Row ${r.row} skipped — ${r.reason}`, 'warning')
    }
    if ((res.rejected || []).length > 3) {
      toast(`…and ${res.rejected.length - 3} more rows skipped`, 'warning')
    }
    toast(
      res.imported
        ? `${res.imported} rate${res.imported > 1 ? 's' : ''} imported from ${file.name}`
        : 'No usable rows found in that file',
      res.imported ? 'success' : 'warning'
    )
  } catch (err) {
    toast(err.message || 'That file could not be imported', 'warning')
  } finally {
    importing.value = false
  }
}

// --- Price history -----------------------------------------------------------
// The table shows a movement percentage; the readings behind it had no UI.
const historyOpen = ref(false)
const historyFor = ref(null)
const historyRows = ref([])
const loadingHistory = ref(false)

async function openHistory(item) {
  historyFor.value = item
  historyOpen.value = true
  loadingHistory.value = true
  try {
    const res = await store.history(item.id)
    historyRows.value = res.history || []
  } finally {
    loadingHistory.value = false
  }
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
        <button class="btn-outline btn-md" :disabled="importing" @click="importLibrary"><Upload class="h-4 w-4" /> {{ importing ? 'Importing…' : 'Import library' }}</button>
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
            <!-- A curated global market rate belongs to every account, so only
                 the firm's own schedule is editable. The server refuses either
                 way; showing it read-only is the honest presentation. -->
            <tr v-for="i in filtered" :key="i.id" class="group border-b border-brand-border-light last:border-0 hover:bg-brand-bg">
              <td class="px-5 py-3">
                <div class="flex items-center gap-3">
                  <div :class="catColor[i.cat]" class="grid h-9 w-9 shrink-0 place-items-center rounded-lg"><component :is="iconFor[i.cat] || Package" class="h-4 w-4" /></div>
                  <div class="min-w-0 flex-1">
                    <input v-if="store.editable(i)" :value="i.name" class="w-full min-w-0 rounded-md bg-transparent font-medium text-secondary hover:bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                      @change="editRate(i, { name: $event.target.value })" />
                    <p v-else class="truncate font-medium text-secondary">{{ i.name }}</p>
                  </div>
                </div>
              </td>
              <td class="px-3 py-3">
                <select v-if="store.editable(i)" :value="i.cat" class="chip border-0 focus:outline-none focus:ring-2 focus:ring-primary/30" :class="catColor[i.cat]"
                  @change="editRate(i, { cat: $event.target.value })">
                  <option v-for="c in categories.slice(1)" :key="c" :value="c">{{ c }}</option>
                </select>
                <span v-else class="chip" :class="catColor[i.cat]">{{ i.cat }}</span>
              </td>
              <td class="px-3 py-3 text-brand-muted">
                <input v-if="store.editable(i)" :value="i.unit" list="unit-options" class="w-16 rounded-md bg-transparent hover:bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                  @change="editRate(i, { unit: $event.target.value })" />
                <span v-else>{{ i.unit }}</span>
              </td>
              <td class="px-3 py-3 text-right font-bold text-secondary">
                <span class="text-brand-light">₦</span>
                <input v-if="store.editable(i)" :value="i.rate" type="number" min="0" step="any" class="w-28 rounded-md bg-transparent text-right font-bold hover:bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                  @change="editRate(i, { rate: $event.target.value })" />
                <span v-else>{{ i.rate.toLocaleString() }}</span>
              </td>
              <td class="px-3 py-3 text-right">
                <!-- No earlier reading is not the same as "flat", so it reads
                     as unknown rather than 0%. -->
                <span v-if="!i.hasHistory" class="text-sm text-brand-light" title="No earlier price recorded">—</span>
                <span v-else-if="i.change === 0" class="text-sm text-brand-muted">0%</span>
                <span v-else class="inline-flex items-center gap-1 text-sm font-semibold" :class="i.change > 0 ? 'text-danger' : 'text-success'">
                  <component :is="i.change > 0 ? TrendingUp : TrendingDown" class="h-4 w-4" />
                  {{ Math.abs(i.change) }}%
                </span>
              </td>
              <td class="px-5 py-3">
                <div class="flex items-center justify-end gap-1">
                  <button class="grid h-8 w-8 place-items-center rounded-lg text-brand-light opacity-0 transition-opacity hover:bg-brand-border-light hover:text-primary group-hover:opacity-100"
                    title="Price history" @click="openHistory(i)"><History class="h-4 w-4" /></button>
                  <button v-if="store.editable(i)" class="grid h-8 w-8 place-items-center rounded-lg text-brand-light opacity-0 transition-opacity hover:bg-danger/10 hover:text-danger group-hover:opacity-100"
                    title="Delete rate" @click="removeRate(i)"><Trash2 class="h-4 w-4" /></button>
                  <span v-else class="text-[11px] text-brand-light" title="Curated market rate — shared by every account">Global</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-if="store.loading && !filtered.length" class="px-5 py-14 text-center text-sm text-brand-muted">
        Loading the rate library…
      </p>
      <p v-else-if="!filtered.length" class="px-5 py-14 text-center text-sm text-brand-muted">
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
              <button type="submit" class="btn-primary btn-md flex-1" :disabled="saving">
                <Plus class="h-4 w-4" /> {{ saving ? 'Adding…' : 'Add rate' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </transition>

    <!-- Price history -->
    <transition name="page">
      <div v-if="historyOpen" class="fixed inset-0 z-[60] flex items-center justify-center bg-secondary/50 p-4 backdrop-blur-sm" @click.self="historyOpen = false">
        <div class="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-card-hover">
          <div class="flex items-start justify-between border-b border-brand-border-light px-6 py-4">
            <div class="min-w-0">
              <h3 class="truncate font-display text-lg font-bold text-secondary">{{ historyFor?.name }}</h3>
              <p class="text-xs text-brand-light">
                Now {{ formatFull(historyFor?.rate || 0) }} per {{ historyFor?.unit }}
                <template v-if="historyFor?.hasHistory">
                  · {{ historyFor.change > 0 ? '+' : '' }}{{ historyFor.change }}% since {{ timeAgo(historyFor.changeSince) }}
                </template>
              </p>
            </div>
            <button class="btn btn-ghost btn-sm" @click="historyOpen = false"><X class="h-5 w-5" /></button>
          </div>
          <div class="max-h-80 overflow-y-auto p-4">
            <p v-if="loadingHistory" class="py-8 text-center text-sm text-brand-muted">Loading…</p>
            <p v-else-if="!historyRows.length" class="rounded-xl border border-dashed border-brand-border-light px-4 py-8 text-center text-sm text-brand-muted">
              No earlier price recorded. A reading is kept each time this rate changes.
            </p>
            <div v-else class="space-y-2">
              <div v-for="(h, n) in historyRows" :key="n" class="flex items-center justify-between rounded-xl border border-brand-border-light px-3 py-2 text-sm">
                <span class="text-brand-muted">{{ timeAgo(h.recordedAt) }}</span>
                <span class="font-semibold text-secondary">{{ formatFull(h.rate) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>

  </div>
</template>
