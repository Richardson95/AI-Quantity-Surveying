<script setup>
import { FileText, Download, FileSpreadsheet, FileType, BarChart3, TrendingUp, Award, PieChart } from 'lucide-vue-next'
import AreaChart from '@/components/charts/AreaChart.vue'
import BarChart from '@/components/charts/BarChart.vue'
import { useToast } from '@/composables/useToast'
import { downloadMock } from '@/utils/download'

const { toast } = useToast()

function exportCenter() {
  const csv = ['Report,Type,Format,Date']
    .concat(reports.map((r) => `${r.name},${r.type},${r.format},${r.date}`))
    .join('\n')
  downloadMock('BuildQ-Reports.csv', csv)
  toast('Reports exported')
}
function viewAll() {
  toast('Showing all reports', 'info')
}
function downloadReport(r) {
  downloadMock(`${r.name}.${r.format.toLowerCase()}`)
  toast(`Downloading ${r.name}`)
}

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
const revenue = [{ label: 'Project value won', data: [180, 220, 195, 310, 280, 420].map((n) => n * 1_000_000), color: '#1CA5F6' }]
const tenderData = { labels: ['Won', 'Lost', 'Pending'], data: [18, 7, 5] }

const kpis = [
  { label: 'Tender Win Rate', value: '72%', icon: Award, color: 'bg-success/10 text-success' },
  { label: 'Avg. Margin', value: '18.4%', icon: TrendingUp, color: 'bg-primary/10 text-primary' },
  { label: 'Est. Accuracy', value: '98.2%', icon: BarChart3, color: 'bg-warning/10 text-warning' },
  { label: 'Reports Generated', value: '64', icon: PieChart, color: 'bg-primary-light/20 text-primary-dark' },
]

const reports = [
  { name: 'Lekki Duplex — Tender BOQ', type: 'Tender', format: 'PDF', date: 'Jun 10', icon: FileType },
  { name: 'Q2 Profitability Report', type: 'Analytics', format: 'XLSX', date: 'Jun 8', icon: FileSpreadsheet },
  { name: 'Ikoyi Tower — Cost Summary', type: 'Cost', format: 'PDF', date: 'Jun 5', icon: FileType },
  { name: 'Material Consumption Trends', type: 'Analytics', format: 'XLSX', date: 'Jun 2', icon: FileSpreadsheet },
  { name: 'Abuja Estate — Variation Report', type: 'Variation', format: 'DOCX', date: 'May 30', icon: FileText },
]
const fmtColor = { PDF: 'bg-danger/10 text-danger', XLSX: 'bg-success/10 text-success', DOCX: 'bg-primary/10 text-primary-dark' }
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="font-display text-2xl font-bold text-secondary">Reports & Analytics</h2>
        <p class="mt-1 text-brand-muted">Business intelligence across your portfolio</p>
      </div>
      <button class="btn-primary btn-md self-start" @click="exportCenter"><Download class="h-4 w-4" /> Export center</button>
    </div>

    <!-- KPIs -->
    <div class="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      <div v-for="k in kpis" :key="k.label" class="card p-5">
        <div :class="k.color" class="grid h-10 w-10 place-items-center rounded-xl"><component :is="k.icon" class="h-5 w-5" /></div>
        <p class="mt-3 text-sm text-brand-muted">{{ k.label }}</p>
        <p class="font-display text-2xl font-bold text-secondary">{{ k.value }}</p>
      </div>
    </div>

    <!-- Charts -->
    <div class="grid gap-6 lg:grid-cols-3">
      <div class="card p-6 lg:col-span-2">
        <h3 class="mb-1 font-display text-lg font-bold text-secondary">Project Value Won</h3>
        <p class="mb-4 text-sm text-brand-muted">Monthly value of awarded tenders</p>
        <AreaChart :labels="months" :datasets="revenue" currency :height="280" />
      </div>
      <div class="card p-6">
        <h3 class="mb-1 font-display text-lg font-bold text-secondary">Tender Outcomes</h3>
        <p class="mb-4 text-sm text-brand-muted">Last 30 submissions</p>
        <BarChart :labels="tenderData.labels" :data="tenderData.data" :height="240" color="#2DC875" />
      </div>
    </div>

    <!-- Recent reports -->
    <div class="card overflow-hidden">
      <div class="flex items-center justify-between border-b border-brand-border-light p-5">
        <h3 class="font-display font-bold text-secondary">Recent Reports</h3>
        <button class="text-sm font-semibold text-primary hover:underline" @click="viewAll">View all</button>
      </div>
      <div class="divide-y divide-brand-border-light">
        <div v-for="r in reports" :key="r.name" class="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-brand-bg sm:flex-row sm:items-center sm:gap-4">
          <div class="flex min-w-0 flex-1 items-center gap-4">
            <div class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><component :is="r.icon" class="h-5 w-5" /></div>
            <div class="min-w-0">
              <p class="truncate font-semibold text-secondary">{{ r.name }}</p>
              <p class="text-xs text-brand-light">{{ r.type }} report · {{ r.date }}</p>
            </div>
          </div>
          <div class="flex items-center gap-3 pl-14 sm:pl-0">
            <span class="badge whitespace-nowrap" :class="fmtColor[r.format]">{{ r.format }}</span>
            <button class="ml-auto grid h-9 w-9 shrink-0 place-items-center rounded-lg text-brand-light hover:bg-brand-border-light hover:text-primary sm:ml-0" @click="downloadReport(r)"><Download class="h-4 w-4" /></button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
