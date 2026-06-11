<script setup>
import { ref, computed } from 'vue'
import { GitCompareArrows, Plus, ArrowUp, ArrowDown, Check, Clock, X, FileText } from 'lucide-vue-next'
import { useToast } from '@/composables/useToast'
import { formatFull } from '@/utils/format'

const { toast } = useToast()
const filter = ref('All')
const filters = ['All', 'Pending', 'Approved', 'Rejected']

const variations = ref([
  { id: 'VO-014', title: 'Upgrade kitchen finishes to imported tiles', rev: 'Rev B → Rev C', impact: 4200000, status: 'Approved', date: 'Jun 9', by: 'TJ' },
  { id: 'VO-013', title: 'Additional borehole & water treatment', impact: 8600000, rev: 'Rev B → Rev C', status: 'Pending', date: 'Jun 8', by: 'KO' },
  { id: 'VO-012', title: 'Reduce car park paving area by 120m²', impact: -2350000, rev: 'Rev A → Rev B', status: 'Approved', date: 'Jun 4', by: 'DA' },
  { id: 'VO-011', title: 'Change roof from concrete tile to aluminium', impact: -5100000, rev: 'Rev A → Rev B', status: 'Approved', date: 'Jun 2', by: 'TJ' },
  { id: 'VO-010', title: 'Add solar power provision', impact: 12400000, rev: 'Rev A → Rev B', status: 'Rejected', date: 'May 28', by: 'MN' },
])

let voSeq = 15
function newVariation() {
  variations.value.unshift({
    id: 'VO-0' + voSeq++,
    title: 'New variation — describe the change',
    rev: 'Rev C → Rev D', impact: 0, status: 'Pending', date: 'Just now', by: 'DA',
  })
  toast('Variation created — pending approval')
}

const statusMeta = {
  Approved: { c: 'bg-success/10 text-success', icon: Check },
  Pending: { c: 'bg-warning/10 text-warning', icon: Clock },
  Rejected: { c: 'bg-danger/10 text-danger', icon: X },
}

const filtered = () => filter.value === 'All' ? variations.value : variations.value.filter((v) => v.status === filter.value)
const netImpact = computed(() => variations.value.filter((v) => v.status === 'Approved').reduce((a, v) => a + v.impact, 0))
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="font-display text-2xl font-bold text-secondary">Variations</h2>
        <p class="mt-1 text-brand-muted">Change orders & cost impact · Lekki 4-Bedroom Duplex</p>
      </div>
      <button class="btn-primary btn-md self-start" @click="newVariation"><Plus class="h-4 w-4" /> New Variation</button>
    </div>

    <!-- Summary -->
    <div class="grid gap-4 sm:grid-cols-3">
      <div class="card p-5">
        <p class="text-sm text-brand-muted">Total Variations</p>
        <p class="mt-1 font-display text-2xl font-bold text-secondary">{{ variations.length }}</p>
      </div>
      <div class="card p-5">
        <p class="text-sm text-brand-muted">Pending Approval</p>
        <p class="mt-1 font-display text-2xl font-bold text-warning">{{ variations.filter((v) => v.status === 'Pending').length }}</p>
      </div>
      <div class="card p-5">
        <p class="text-sm text-brand-muted">Net Approved Impact</p>
        <p class="mt-1 font-display text-2xl font-bold" :class="netImpact >= 0 ? 'text-secondary' : 'text-success'">
          {{ netImpact >= 0 ? '+' : '' }}{{ formatFull(netImpact) }}
        </p>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex gap-2 overflow-x-auto no-scrollbar">
      <button v-for="f in filters" :key="f" @click="filter = f"
        class="whitespace-nowrap rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors"
        :class="filter === f ? 'border-primary bg-primary/10 text-primary-dark' : 'border-brand-border bg-white text-brand-muted hover:border-primary/40'">
        {{ f }}
      </button>
    </div>

    <!-- List -->
    <div class="space-y-3">
      <div v-for="v in filtered()" :key="v.id" class="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
        <div class="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <GitCompareArrows class="h-5 w-5" />
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <span class="font-mono text-xs text-brand-light">{{ v.id }}</span>
            <span class="text-xs text-brand-light">·</span>
            <span class="text-xs text-brand-muted">{{ v.rev }}</span>
          </div>
          <p class="mt-0.5 font-semibold text-secondary">{{ v.title }}</p>
          <p class="text-xs text-brand-light">Raised {{ v.date }} by {{ v.by }}</p>
        </div>
        <div class="flex items-center gap-4">
          <div class="text-right">
            <p class="text-xs text-brand-light">Cost impact</p>
            <p class="flex items-center justify-end gap-1 font-bold" :class="v.impact >= 0 ? 'text-danger' : 'text-success'">
              <component :is="v.impact >= 0 ? ArrowUp : ArrowDown" class="h-4 w-4" />
              {{ formatFull(Math.abs(v.impact)) }}
            </p>
          </div>
          <span class="badge" :class="statusMeta[v.status].c">
            <component :is="statusMeta[v.status].icon" class="h-3 w-3" /> {{ v.status }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
