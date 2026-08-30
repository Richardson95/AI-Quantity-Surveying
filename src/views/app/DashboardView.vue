<script setup>
import { RouterLink } from 'vue-router'
import {
  FolderKanban, Wallet, FileSpreadsheet, Sparkles, ArrowRight,
  Bot, CheckCircle2, Upload, MessageSquare, Pencil, Plus,
} from 'lucide-vue-next'
import StatCard from '@/components/StatCard.vue'
import DoughnutChart from '@/components/charts/DoughnutChart.vue'
import { computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useProjectsStore } from '@/stores/projects'
import { useReportsStore } from '@/stores/reports'
import { useBillingStore } from '@/stores/billing'
import { formatMoney, formatNumber, timeAgo } from '@/utils/format'

const auth = useAuthStore()
const store = useProjectsStore()
const reports = useReportsStore()
const billing = useBillingStore()

onMounted(async () => {
  await store.fetchProjects().catch(() => {})
  // The feed follows whichever project is current; without one it stays empty
  // rather than showing another project's history.
  if (store.currentProjectId) {
    store.fetchActivity()
    store.fetchBoq().catch(() => {})
  }
  reports.fetchKpis()
  billing.fetchUsage()
})

// The system records no month-on-month history, so there is no delta to show.
// A "+12% vs last month" badge would be an invention.
const boqsGenerated = computed(() => formatNumber(reports.kpis?.boqsGenerated ?? 0))
const creditsUsed = computed(() => formatNumber(billing.usage?.credits?.used ?? 0))

// The server tags events with its own vocabulary (success, info, warning, ai,
// upload, edit). Anything unrecognised still gets an icon rather than rendering
// an undefined component.
const ACTIVITY_ICONS = {
  ai: Bot,
  approve: CheckCircle2,
  success: CheckCircle2,
  upload: Upload,
  comment: MessageSquare,
  edit: Pencil,
  info: MessageSquare,
  warning: Pencil,
}
const ACTIVITY_COLORS = {
  ai: 'bg-primary/10 text-primary',
  approve: 'bg-success/10 text-success',
  success: 'bg-success/10 text-success',
  upload: 'bg-warning/10 text-warning',
  warning: 'bg-warning/10 text-warning',
  comment: 'bg-secondary/10 text-secondary-variant',
  info: 'bg-secondary/10 text-secondary-variant',
  edit: 'bg-primary-light/20 text-primary-dark',
}
const activityIcon = (type) => ACTIVITY_ICONS[type] || Pencil
const activityColor = (type) => ACTIVITY_COLORS[type] || 'bg-brand-border text-brand-muted'

// Cost breakdown is real: the section totals of the current project's bill.
// The estimated-vs-actual trend that used to sit beside it was six months of
// invented figures — the system records no actual spend to compare against, so
// there is nothing to plot and the panel says so.
const costBreakdown = computed(() => ({
  labels: store.boqSections.map((x) => x.section),
  data: store.boqSections.map((x) => x.total),
}))
const hasBreakdown = computed(() => costBreakdown.value.labels.length > 0)

const statusColor = {
  'In Progress': 'bg-primary/10 text-primary-dark',
  Tender: 'bg-warning/10 text-warning',
  Completed: 'bg-success/10 text-success',
  'On Hold': 'bg-brand-border text-brand-muted',
}
</script>

<template>
  <div class="space-y-6">
    <!-- Greeting -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="font-display text-2xl font-bold text-secondary">Welcome back, {{ auth.user.name.split(' ')[0] }} 👋</h2>
        <p class="mt-1 text-brand-muted">Here's what's happening across your projects today.</p>
      </div>
      <RouterLink to="/app/boq" class="btn-primary btn-md self-start"><Plus class="h-4 w-4" /> New BOQ</RouterLink>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      <StatCard label="Active Projects" :value="String(store.activeCount)" delta="" trend="up" :icon="FolderKanban" icon-class="bg-primary/10 text-primary" />
      <StatCard label="Total Portfolio Value" :value="formatMoney(store.totalBudget)" delta="" trend="up" :icon="Wallet" icon-class="bg-success/10 text-success" />
      <StatCard label="BOQs Generated" :value="boqsGenerated" delta="" trend="up" :icon="FileSpreadsheet" icon-class="bg-warning/10 text-warning" />
      <StatCard label="AI Credits Used" :value="creditsUsed" delta="" trend="down" :icon="Sparkles" icon-class="bg-primary-light/20 text-primary-dark" />
    </div>

    <!-- Charts -->
    <div class="grid gap-6 lg:grid-cols-3">
      <div class="card p-6 lg:col-span-2">
        <div class="mb-5 flex items-center justify-between">
          <div>
            <h3 class="font-display text-lg font-bold text-secondary">Cost Performance</h3>
            <p class="text-sm text-brand-muted">Estimated vs actual spend</p>
          </div>
        </div>
        <p class="grid h-[280px] place-content-center rounded-xl border border-dashed border-brand-border-light px-6 text-center text-sm text-brand-muted">
          No actual spend is recorded against estimates, so there is nothing to compare.
          Track costs on a project to populate this.
        </p>
      </div>

      <div class="card p-6">
        <h3 class="font-display text-lg font-bold text-secondary">Cost Breakdown</h3>
        <p class="text-sm text-brand-muted">By construction element</p>
        <div class="mt-4">
          <DoughnutChart v-if="hasBreakdown" :labels="costBreakdown.labels" :data="costBreakdown.data" :height="240" />
          <p v-else class="grid h-[240px] place-content-center rounded-xl border border-dashed border-brand-border-light px-4 text-center text-sm text-brand-muted">
            Generate a bill of quantities to see where the cost sits.
          </p>
        </div>
      </div>
    </div>

    <!-- Projects + Activity -->
    <div class="grid gap-6 lg:grid-cols-3">
      <!-- Recent projects -->
      <div class="card p-6 lg:col-span-2">
        <div class="mb-4 flex items-center justify-between">
          <h3 class="font-display text-lg font-bold text-secondary">Recent Projects</h3>
          <RouterLink to="/app/projects" class="flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
            View all <ArrowRight class="h-4 w-4" />
          </RouterLink>
        </div>
        <div class="space-y-3">
          <RouterLink
            v-for="p in store.projects.slice(0, 4)" :key="p.id"
            :to="`/app/projects/${p.id}`"
            class="flex items-center gap-4 rounded-xl border border-brand-border-light p-3 transition-all hover:border-primary/30 hover:bg-brand-bg"
          >
            <div :class="`bg-gradient-to-br ${p.cover}`" class="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-sm font-bold text-white">
              {{ p.name.charAt(0) }}
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate font-semibold text-secondary">{{ p.name }}</p>
              <p class="truncate text-xs text-brand-muted">{{ p.client }} · {{ p.location }}</p>
            </div>
            <div class="hidden w-28 sm:block">
              <div class="mb-1 flex justify-between text-xs">
                <span class="text-brand-muted">Progress</span>
                <span class="font-semibold text-secondary">{{ p.progress }}%</span>
              </div>
              <div class="h-1.5 overflow-hidden rounded-full bg-brand-border">
                <div class="h-full rounded-full bg-brand-gradient" :style="{ width: p.progress + '%' }"></div>
              </div>
            </div>
            <span class="badge shrink-0" :class="statusColor[p.status]">{{ p.status }}</span>
          </RouterLink>
        </div>
      </div>

      <!-- Activity feed -->
      <div class="card p-6">
        <h3 class="mb-4 font-display text-lg font-bold text-secondary">Activity</h3>
        <p v-if="!store.activity.length" class="rounded-xl border border-dashed border-brand-border-light px-4 py-8 text-center text-sm text-brand-muted">
          Nothing has happened on this project yet.
        </p>
        <div v-else class="space-y-1">
          <div v-for="(a, i) in store.activity" :key="a.id" class="relative flex gap-3 pb-5 last:pb-0">
            <div v-if="i < store.activity.length - 1" class="absolute left-[18px] top-9 h-full w-px bg-brand-border-light"></div>
            <div :class="activityColor(a.type)" class="z-10 grid h-9 w-9 shrink-0 place-items-center rounded-full">
              <component :is="activityIcon(a.type)" class="h-4 w-4" />
            </div>
            <div class="pt-1">
              <p class="text-sm text-secondary">
                <span class="font-semibold">{{ a.user }}</span> {{ a.action }}
                <span class="font-semibold text-primary-dark">{{ a.target }}</span>
              </p>
              <p class="mt-0.5 text-xs text-brand-light">{{ timeAgo(a.time) }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- AI banner -->
    <div class="relative overflow-hidden rounded-2xl bg-navy-gradient p-6 sm:p-8">
      <div class="absolute inset-0 bg-hero-glow"></div>
      <div class="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-primary/20 blur-3xl"></div>
      <div class="relative flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div class="flex items-start gap-4">
          <div class="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/10 text-primary-light">
            <Sparkles class="h-6 w-6" />
          </div>
          <div>
            <h3 class="font-display text-lg font-bold text-white">Ask the AI Assistant</h3>
            <p class="mt-1 max-w-md text-sm text-white/60">“Generate a BOQ for a 4-bedroom duplex” or “Compare costs with Lagos market rates.”</p>
          </div>
        </div>
        <RouterLink to="/app/assistant" class="btn-primary btn-md shrink-0">Open Assistant <ArrowRight class="h-4 w-4" /></RouterLink>
      </div>
    </div>
  </div>
</template>
