<script setup>
import { ref, computed } from 'vue'
import {
  Upload, Sparkles, Download, Search, Plus, FileSpreadsheet, Check,
  Pencil, Trash2, ChevronDown, Cpu, FileText, Layers,
} from 'lucide-vue-next'
import { useProjectsStore } from '@/stores/projects'
import { useToast } from '@/composables/useToast'
import { downloadMock } from '@/utils/download'
import { formatFull } from '@/utils/format'

const store = useProjectsStore()
const { toast } = useToast()
const query = ref('')
const generating = ref(false)
const generated = ref(true)
const activeSection = ref('All')

const sections = computed(() => ['All', ...new Set(store.boqItems.map((i) => i.section))])
const filtered = computed(() =>
  store.boqItems.filter((i) => {
    const s = activeSection.value === 'All' || i.section === activeSection.value
    const q = i.desc.toLowerCase().includes(query.value.toLowerCase()) || i.code.toLowerCase().includes(query.value.toLowerCase())
    return s && q
  })
)
const total = computed(() => filtered.value.reduce((a, i) => a + i.qty * i.rate, 0))

const suggestions = [
  { text: 'Reinforcement ratio looks low for slab B2.1 — consider 120kg/m³.', type: 'warning' },
  { text: 'Block wall B1.1 quantity matches drawing area (1,860 m²).', type: 'success' },
  { text: 'Missing waterproofing item for substructure — add?', type: 'info' },
]
const suggColor = { warning: 'border-warning/30 bg-warning/5', success: 'border-success/30 bg-success/5', info: 'border-primary/30 bg-primary/5' }
const suggDot = { warning: 'bg-warning', success: 'bg-success', info: 'bg-primary' }

function generate() {
  generating.value = true
  setTimeout(() => { generating.value = false; generated.value = true; toast('BOQ regenerated from latest drawings') }, 1800)
}
function uploadDrawing() {
  toast('Drawing uploaded — AI is analyzing it', 'info')
}
function exportBoq() {
  const rows = [['Code', 'Description', 'Unit', 'Qty', 'Rate', 'Amount']]
  filtered.value.forEach((i) => rows.push([i.code, i.desc, i.unit, i.qty, i.rate, i.qty * i.rate]))
  const csv = rows.map((r) => r.join(',')).join('\n')
  downloadMock('Lekki-Duplex-BOQ.csv', csv)
  toast('BOQ exported')
}
function addItem() {
  store.addBoqItem(activeSection.value === 'All' ? 'Substructure' : activeSection.value)
  toast('Item added — edit its details')
}
function editItem(item) {
  toast(`Editing ${item.code} (inline editing is mock for now)`, 'info')
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
      </div>
      <div class="flex flex-wrap gap-2">
        <button class="btn-outline btn-md" @click="uploadDrawing"><Upload class="h-4 w-4" /> Upload drawing</button>
        <button class="btn-outline btn-md" @click="exportBoq"><Download class="h-4 w-4" /> Export</button>
        <button class="btn-primary btn-md" @click="generate" :disabled="generating">
          <Sparkles class="h-4 w-4" /> {{ generating ? 'Generating…' : 'Regenerate BOQ' }}
        </button>
      </div>
    </div>

    <div class="grid gap-6 xl:grid-cols-3">
      <!-- Left: drawing viewer + AI -->
      <div class="space-y-6">
        <!-- Drawing viewer -->
        <div class="card overflow-hidden">
          <div class="flex items-center justify-between border-b border-brand-border-light px-4 py-3">
            <span class="flex items-center gap-2 text-sm font-semibold text-secondary"><Layers class="h-4 w-4 text-primary" /> Drawing Viewer</span>
            <span class="badge bg-success/10 text-success"><Check class="h-3 w-3" /> Analyzed</span>
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
            <div class="absolute bottom-3 left-3 flex items-center gap-2 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs text-white backdrop-blur">
              <Cpu class="h-3.5 w-3.5 text-primary-light" /> 14 elements detected
            </div>
          </div>
        </div>

        <!-- AI suggestions -->
        <div class="card p-5">
          <div class="mb-4 flex items-center gap-2">
            <div class="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary"><Sparkles class="h-4 w-4" /></div>
            <h3 class="font-display font-bold text-secondary">AI Suggestions</h3>
          </div>
          <div class="space-y-2.5">
            <div v-for="(s, i) in suggestions" :key="i" class="flex gap-3 rounded-xl border p-3" :class="suggColor[s.type]">
              <span class="mt-1.5 h-2 w-2 shrink-0 rounded-full" :class="suggDot[s.type]"></span>
              <p class="text-sm text-secondary">{{ s.text }}</p>
            </div>
          </div>
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
              <tr v-for="item in filtered" :key="item.code" class="group border-b border-brand-border-light transition-colors hover:bg-brand-bg">
                <td class="px-5 py-3 font-mono text-xs text-brand-muted">{{ item.code }}</td>
                <td class="px-2 py-3 text-secondary">{{ item.desc }}</td>
                <td class="px-2 py-3 text-right font-medium text-secondary">{{ item.qty.toLocaleString() }}</td>
                <td class="px-2 py-3 text-brand-muted">{{ item.unit }}</td>
                <td class="px-2 py-3 text-right text-brand-muted">{{ item.rate.toLocaleString() }}</td>
                <td class="px-2 py-3 text-right font-semibold text-secondary">{{ (item.qty * item.rate).toLocaleString() }}</td>
                <td class="px-2 py-3 text-center">
                  <span class="text-xs font-bold" :class="confidenceColor(item.confidence)">{{ item.confidence }}%</span>
                </td>
                <td class="px-5 py-3">
                  <div class="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button class="grid h-7 w-7 place-items-center rounded-lg text-brand-light hover:bg-brand-border-light hover:text-primary" @click="editItem(item)"><Pencil class="h-3.5 w-3.5" /></button>
                    <button class="grid h-7 w-7 place-items-center rounded-lg text-brand-light hover:bg-danger/10 hover:text-danger" @click="deleteItem(item)"><Trash2 class="h-3.5 w-3.5" /></button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Footer total -->
        <div class="flex items-center justify-between border-t border-brand-border-light bg-brand-bg px-5 py-4">
          <button class="flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline" @click="addItem"><Plus class="h-4 w-4" /> Add item</button>
          <div class="text-right">
            <p class="text-xs text-brand-muted">{{ activeSection === 'All' ? 'Grand total' : activeSection + ' total' }}</p>
            <p class="font-display text-xl font-bold text-secondary">{{ formatFull(total) }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
