<script setup>
import { RouterLink } from 'vue-router'
import {
  FolderKanban, Wallet, FileSpreadsheet, Sparkles, ArrowRight, ArrowUpRight,
  Bot, CheckCircle2, Upload, MessageSquare, Pencil, Plus,
} from 'lucide-vue-next'
import StatCard from '@/components/StatCard.vue'
import AreaChart from '@/components/charts/AreaChart.vue'
import DoughnutChart from '@/components/charts/DoughnutChart.vue'
import { useAuthStore } from '@/stores/auth'
import { useProjectsStore } from '@/stores/projects'
import { formatMoney } from '@/utils/format'

const auth = useAuthStore()
const store = useProjectsStore()

const activityIcon = { ai: Bot, approve: CheckCircle2, upload: Upload, comment: MessageSquare, edit: Pencil }
const activityColor = {
  ai: 'bg-primary/10 text-primary',
  approve: 'bg-success/10 text-success',
  upload: 'bg-warning/10 text-warning',
  comment: 'bg-secondary/10 text-secondary-variant',
  edit: 'bg-primary-light/20 text-primary-dark',
}

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
const costTrend = [
  { label: 'Estimated', data: [120, 145, 138, 162, 178, 185].map((n) => n * 1_000_000), color: '#1CA5F6' },
  { label: 'Actual', data: [118, 150, 134, 158, 172, 181].map((n) => n * 1_000_000), color: '#2DC875' },
]
const costBreakdown = { labels: ['Substructure', 'Superstructure', 'Finishes', 'Roofing', 'Services'], data: [28, 34, 18, 9, 11] }

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
      <StatCard label="Active Projects" :value="String(store.activeCount)" delta="12%" trend="up" :icon="FolderKanban" icon-class="bg-primary/10 text-primary" />
      <StatCard label="Total Portfolio Value" :value="formatMoney(store.totalBudget)" delta="8.4%" trend="up" :icon="Wallet" icon-class="bg-success/10 text-success" />
      <StatCard label="BOQs Generated" value="146" delta="23%" trend="up" :icon="FileSpreadsheet" icon-class="bg-warning/10 text-warning" />
      <StatCard label="AI Credits Used" value="1,240" delta="5%" trend="down" :icon="Sparkles" icon-class="bg-primary-light/20 text-primary-dark" />
    </div>

    <!-- Charts -->
    <div class="grid gap-6 lg:grid-cols-3">
      <div class="card p-6 lg:col-span-2">
        <div class="mb-5 flex items-center justify-between">
          <div>
            <h3 class="font-display text-lg font-bold text-secondary">Cost Performance</h3>
            <p class="text-sm text-brand-muted">Estimated vs actual spend (last 6 months)</p>
          </div>
          <span class="badge bg-success/10 text-success"><ArrowUpRight class="h-3 w-3" /> On budget</span>
        </div>
        <AreaChart :labels="months" :datasets="costTrend" currency :height="280" />
      </div>

      <div class="card p-6">
        <h3 class="font-display text-lg font-bold text-secondary">Cost Breakdown</h3>
        <p class="text-sm text-brand-muted">By construction element</p>
        <div class="mt-4">
          <DoughnutChart :labels="costBreakdown.labels" :data="costBreakdown.data" :height="240" />
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
        <div class="space-y-1">
          <div v-for="(a, i) in store.activity" :key="a.id" class="relative flex gap-3 pb-5 last:pb-0">
            <div v-if="i < store.activity.length - 1" class="absolute left-[18px] top-9 h-full w-px bg-brand-border-light"></div>
            <div :class="activityColor[a.type]" class="z-10 grid h-9 w-9 shrink-0 place-items-center rounded-full">
              <component :is="activityIcon[a.type]" class="h-4 w-4" />
            </div>
            <div class="pt-1">
              <p class="text-sm text-secondary">
                <span class="font-semibold">{{ a.user }}</span> {{ a.action }}
                <span class="font-semibold text-primary-dark">{{ a.target }}</span>
              </p>
              <p class="mt-0.5 text-xs text-brand-light">{{ a.time }}</p>
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
