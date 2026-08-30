<script setup>
import { ref, computed, onMounted } from 'vue'
import { FileText, Download, FileSpreadsheet, FileType, BarChart3, TrendingUp, Award, PieChart, Search, Plus } from 'lucide-vue-next'
import BarChart from '@/components/charts/BarChart.vue'
import { useToast } from '@/composables/useToast'
import { useReportsStore } from '@/stores/reports'
import { useProjectsStore } from '@/stores/projects'
import { formatNumber, timeAgo } from '@/utils/format'

const { toast } = useToast()
const store = useReportsStore()
const projects = useProjectsStore()

onMounted(async () => {
  await Promise.all([
    store.fetch().catch((e) => toast(e.message, 'warning')),
    store.fetchKpis(),
    store.fetchTenders(),
    projects.ensureProject(),
  ])
})

const reports = computed(() => store.reports)

// "View all" used to be a dead toast. It now actually expands the list and
// reveals the filter, which is what the label promises.
const showAll = ref(false)
const query = ref('')
const typeFilter = ref('All')

function viewAll() {
  showAll.value = !showAll.value
}

async function downloadReport(r) {
  const meta = await store.downloadUrl(r.id)
  if (!meta?.url) {
    toast(`${r.name} could not be fetched — try again`, 'warning')
    return
  }
  window.open(meta.url, '_blank', 'noopener')
  toast(`Downloading ${r.name}`)
}

// Generating produces a real file from real data. Only two report types exist
// server-side; anything else would be a button that cannot do its job.
const generating = computed(() => store.generating)

async function generate(type) {
  if (!projects.currentProjectId) {
    toast('Create a project first — a report is built from one', 'warning')
    return
  }
  try {
    const r = await store.generate(projects.currentProjectId, type)
    toast(`${r.name} generated`)
  } catch (err) {
    toast(err.message || 'That report could not be generated', 'warning')
  }
}

// Tender outcomes are not tracked anywhere, so there is nothing to chart. The
// server says so in its own notes and this shows them instead of a fake bar.
const tenderData = computed(() => ({
  labels: store.tenders.map((t) => t.label),
  data: store.tenders.map((t) => t.count),
}))
const hasTenders = computed(() => tenderData.value.data.length > 0)

/**
 * Three of the four KPIs used to be fixed figures — 72% win rate, 18.4% margin,
 * 98.2% accuracy. Two of them cannot be computed from anything the system
 * records, so the server returns null with a reason and they render as
 * unavailable rather than as invented percentages.
 */
const kpis = computed(() => {
  const k = store.kpis
  if (!k) return []
  const unavailable = store.unavailable
  return [
    { label: 'Tender Win Rate', value: k.winRate ?? '—', why: unavailable.winRate, icon: Award, color: 'bg-success/10 text-success' },
    { label: 'Avg. Margin', value: k.averageMargin ?? '—', why: unavailable.averageMargin, icon: TrendingUp, color: 'bg-primary/10 text-primary' },
    { label: 'Drawings Analysed', value: formatNumber(k.drawingsAnalysed ?? 0), icon: BarChart3, color: 'bg-warning/10 text-warning' },
    { label: 'Reports Generated', value: formatNumber(k.reportsGenerated ?? 0), icon: PieChart, color: 'bg-primary-light/20 text-primary-dark' },
  ]
})

const FORMAT_ICON = { PDF: FileType, XLSX: FileSpreadsheet, DOCX: FileText, csv: FileSpreadsheet, CSV: FileSpreadsheet }
const iconFor = (r) => FORMAT_ICON[r.format] || FileText

const fmtColor = {
  PDF: 'bg-danger/10 text-danger',
  XLSX: 'bg-success/10 text-success',
  DOCX: 'bg-primary/10 text-primary-dark',
  csv: 'bg-success/10 text-success',
  CSV: 'bg-success/10 text-success',
}

const reportTypes = computed(() => store.types)

const visibleReports = computed(() => {
  const q = query.value.trim().toLowerCase()
  const rows = reports.value.filter((r) => {
    const matchesType = typeFilter.value === 'All' || r.type === typeFilter.value
    const matchesQuery = !q || r.name.toLowerCase().includes(q)
    return matchesType && matchesQuery
  })
  return showAll.value ? rows : rows.slice(0, 3)
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="font-display text-2xl font-bold text-secondary">Reports & Analytics</h2>
        <p class="mt-1 text-brand-muted">Business intelligence across your portfolio</p>
      </div>
      <div class="flex flex-wrap gap-2 self-start">
        <button class="btn-outline btn-md" :disabled="generating" @click="generate('boq')">
          <Plus class="h-4 w-4" /> {{ generating ? 'Generating…' : 'BOQ report' }}
        </button>
        <button class="btn-outline btn-md" :disabled="generating" @click="generate('cost-summary')">
          <Plus class="h-4 w-4" /> Cost summary
        </button>
      </div>
    </div>

    <!-- KPIs -->
    <div class="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      <div v-for="k in kpis" :key="k.label" class="card p-5">
        <div :class="k.color" class="grid h-10 w-10 place-items-center rounded-xl"><component :is="k.icon" class="h-5 w-5" /></div>
        <p class="mt-3 text-sm text-brand-muted">{{ k.label }}</p>
        <p class="font-display text-2xl font-bold" :class="k.why ? 'text-brand-light' : 'text-secondary'">{{ k.value }}</p>
        <!-- A KPI with nothing behind it says why, rather than showing a number
             the system cannot actually compute. -->
        <p v-if="k.why" class="mt-1 text-[11px] leading-snug text-brand-light">{{ k.why }}</p>
      </div>
    </div>

    <!-- Charts -->
    <div class="grid gap-6 lg:grid-cols-3">
      <div class="card p-6 lg:col-span-2">
        <h3 class="mb-1 font-display text-lg font-bold text-secondary">Project Value Won</h3>
        <p class="mb-4 text-sm text-brand-muted">Monthly value of awarded tenders</p>
        <!-- Same reason as the tender chart: no tender outcome is recorded
             anywhere, so there is nothing to plot. -->
        <p class="grid h-[280px] place-content-center rounded-xl border border-dashed border-brand-border-light px-6 text-center text-sm text-brand-muted">
          No tender outcomes are recorded, so there is no won-value history to chart.
          Add won/lost tracking to a project to populate this.
        </p>
      </div>
      <div class="card p-6">
        <h3 class="mb-1 font-display text-lg font-bold text-secondary">Tender Outcomes</h3>
        <p class="mb-4 text-sm text-brand-muted">Last 30 submissions</p>
        <BarChart v-if="hasTenders" :labels="tenderData.labels" :data="tenderData.data" :height="240" color="#2DC875" />
        <p v-else class="grid h-[240px] place-content-center rounded-xl border border-dashed border-brand-border-light px-4 text-center text-sm text-brand-muted">
          <template v-for="n in store.tenderNotes" :key="n.text">{{ n.text }}</template>
          <template v-if="!store.tenderNotes.length">Tender outcomes are not tracked yet.</template>
        </p>
      </div>
    </div>

    <!-- Recent reports -->
    <div class="card overflow-hidden">
      <div class="flex items-center justify-between border-b border-brand-border-light p-5">
        <h3 class="font-display font-bold text-secondary">{{ showAll ? 'All Reports' : 'Recent Reports' }}</h3>
        <button class="text-sm font-semibold text-primary hover:underline" @click="viewAll">
          {{ showAll ? 'Show less' : 'View all' }}
        </button>
      </div>

      <div v-if="showAll" class="flex flex-col gap-3 border-b border-brand-border-light p-5 sm:flex-row sm:items-center">
        <div class="relative flex-1">
          <Search class="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-light" />
          <input v-model="query" class="input pl-10" placeholder="Search reports…" />
        </div>
        <div class="flex gap-2 overflow-x-auto no-scrollbar">
          <button v-for="t in reportTypes" :key="t" @click="typeFilter = t"
            class="whitespace-nowrap rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors"
            :class="typeFilter === t ? 'border-primary bg-primary/10 text-primary-dark' : 'border-brand-border bg-white text-brand-muted hover:border-primary/40'">
            {{ t }}
          </button>
        </div>
      </div>

      <div class="divide-y divide-brand-border-light">
        <div v-for="r in visibleReports" :key="r.id || r.name" class="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-brand-bg sm:flex-row sm:items-center sm:gap-4">
          <div class="flex min-w-0 flex-1 items-center gap-4">
            <div class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><component :is="iconFor(r)" class="h-5 w-5" /></div>
            <div class="min-w-0">
              <p class="truncate font-semibold text-secondary">{{ r.name }}</p>
              <p class="text-xs text-brand-light">{{ r.type }} report · {{ timeAgo(r.generatedAt || r.date) }}<template v-if="r.project"> · {{ r.project }}</template></p>
            </div>
          </div>
          <div class="flex items-center gap-3 pl-14 sm:pl-0">
            <span class="badge whitespace-nowrap" :class="fmtColor[r.format]">{{ r.format }}</span>
            <button class="ml-auto grid h-9 w-9 shrink-0 place-items-center rounded-lg text-brand-light hover:bg-brand-border-light hover:text-primary sm:ml-0" @click="downloadReport(r)"><Download class="h-4 w-4" /></button>
          </div>
        </div>
        <p v-if="store.loading && !visibleReports.length" class="px-5 py-12 text-center text-sm text-brand-muted">
          Loading reports…
        </p>
        <p v-else-if="!visibleReports.length" class="px-5 py-12 text-center text-sm text-brand-muted">
          {{ reports.length ? 'No reports match your search.' : 'No reports yet — generate one above.' }}
        </p>
      </div>
    </div>
  </div>
</template>
