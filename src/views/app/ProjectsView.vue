<script setup>
import { ref, computed } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { Search, Plus, MapPin, LayoutGrid, List, SlidersHorizontal } from 'lucide-vue-next'
import { useProjectsStore } from '@/stores/projects'
import { useToast } from '@/composables/useToast'
import { formatMoney } from '@/utils/format'

const store = useProjectsStore()
const router = useRouter()
const { toast } = useToast()

function newProject() {
  const p = store.addProject()
  toast('Project created — opening details')
  router.push(`/app/projects/${p.id}`)
}
const query = ref('')
const filter = ref('All')
const view = ref('grid')

const filters = ['All', 'In Progress', 'Tender', 'Completed', 'On Hold']
const statusColor = {
  'In Progress': 'bg-primary/10 text-primary-dark',
  Tender: 'bg-warning/10 text-warning',
  Completed: 'bg-success/10 text-success',
  'On Hold': 'bg-brand-border text-brand-muted',
}

const filtered = computed(() =>
  store.projects.filter((p) => {
    const matchesFilter = filter.value === 'All' || p.status === filter.value
    const matchesQuery = p.name.toLowerCase().includes(query.value.toLowerCase()) ||
      p.client.toLowerCase().includes(query.value.toLowerCase())
    return matchesFilter && matchesQuery
  })
)
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="font-display text-2xl font-bold text-secondary">Projects</h2>
        <p class="mt-1 text-brand-muted">{{ store.projects.length }} projects · {{ store.activeCount }} active</p>
      </div>
      <button class="btn-primary btn-md self-start" @click="newProject"><Plus class="h-4 w-4" /> New Project</button>
    </div>

    <!-- Toolbar -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div class="relative flex-1">
        <Search class="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-light" />
        <input v-model="query" class="input pl-10" placeholder="Search projects or clients…" />
      </div>
      <div class="flex items-center gap-2 overflow-x-auto no-scrollbar">
        <button v-for="f in filters" :key="f" @click="filter = f"
          class="whitespace-nowrap rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors"
          :class="filter === f ? 'border-primary bg-primary/10 text-primary-dark' : 'border-brand-border bg-white text-brand-muted hover:border-primary/40'">
          {{ f }}
        </button>
      </div>
      <div class="flex shrink-0 items-center gap-1 rounded-xl border border-brand-border bg-white p-1">
        <button @click="view = 'grid'" class="grid h-8 w-8 place-items-center rounded-lg transition-colors" :class="view === 'grid' ? 'bg-primary/10 text-primary' : 'text-brand-light'"><LayoutGrid class="h-4 w-4" /></button>
        <button @click="view = 'list'" class="grid h-8 w-8 place-items-center rounded-lg transition-colors" :class="view === 'list' ? 'bg-primary/10 text-primary' : 'text-brand-light'"><List class="h-4 w-4" /></button>
      </div>
    </div>

    <!-- Grid view -->
    <div v-if="view === 'grid'" class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      <RouterLink v-for="p in filtered" :key="p.id" :to="`/app/projects/${p.id}`"
        class="card group overflow-hidden transition-all hover:-translate-y-1 hover:shadow-card-hover">
        <div :class="`bg-gradient-to-br ${p.cover}`" class="relative h-28">
          <div class="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(255,255,255,0.25),transparent_60%)]"></div>
          <span class="badge absolute right-3 top-3 bg-white/90" :class="statusColor[p.status].split(' ')[1]">{{ p.status }}</span>
          <span class="absolute bottom-3 left-4 font-mono text-xs text-white/80">{{ p.id }}</span>
        </div>
        <div class="p-5">
          <h3 class="font-display font-bold text-secondary group-hover:text-primary">{{ p.name }}</h3>
          <p class="mt-1 flex items-center gap-1 text-xs text-brand-muted"><MapPin class="h-3.5 w-3.5" /> {{ p.location }}</p>

          <div class="mt-4">
            <div class="mb-1 flex justify-between text-xs">
              <span class="text-brand-muted">Progress</span>
              <span class="font-semibold text-secondary">{{ p.progress }}%</span>
            </div>
            <div class="h-1.5 overflow-hidden rounded-full bg-brand-border">
              <div class="h-full rounded-full bg-brand-gradient" :style="{ width: p.progress + '%' }"></div>
            </div>
          </div>

          <div class="mt-4 flex items-center justify-between border-t border-brand-border-light pt-4">
            <div>
              <p class="text-[11px] text-brand-light">Budget</p>
              <p class="text-sm font-bold text-secondary">{{ formatMoney(p.budget) }}</p>
            </div>
            <div class="flex -space-x-2">
              <div v-for="t in p.team" :key="t" class="grid h-7 w-7 place-items-center rounded-full border-2 border-white bg-brand-gradient text-[10px] font-semibold text-white">{{ t }}</div>
            </div>
          </div>
        </div>
      </RouterLink>
    </div>

    <!-- List view -->
    <div v-else class="card overflow-hidden">
      <div class="hidden grid-cols-12 gap-4 border-b border-brand-border-light bg-brand-bg px-5 py-3 text-xs font-semibold uppercase tracking-wide text-brand-light md:grid">
        <span class="col-span-4">Project</span>
        <span class="col-span-2">Client</span>
        <span class="col-span-2">Budget</span>
        <span class="col-span-2">Progress</span>
        <span class="col-span-2">Status</span>
      </div>
      <RouterLink v-for="p in filtered" :key="p.id" :to="`/app/projects/${p.id}`"
        class="grid grid-cols-2 items-center gap-4 border-b border-brand-border-light px-5 py-4 transition-colors last:border-0 hover:bg-brand-bg md:grid-cols-12">
        <div class="col-span-2 flex items-center gap-3 md:col-span-4">
          <div :class="`bg-gradient-to-br ${p.cover}`" class="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sm font-bold text-white">{{ p.name.charAt(0) }}</div>
          <div class="min-w-0">
            <p class="truncate font-semibold text-secondary">{{ p.name }}</p>
            <p class="truncate text-xs text-brand-muted">{{ p.location }}</p>
          </div>
        </div>
        <span class="col-span-2 hidden text-sm text-brand-muted md:block">{{ p.client }}</span>
        <span class="col-span-2 hidden text-sm font-semibold text-secondary md:block">{{ formatMoney(p.budget) }}</span>
        <div class="col-span-2 hidden md:block">
          <div class="h-1.5 overflow-hidden rounded-full bg-brand-border">
            <div class="h-full rounded-full bg-brand-gradient" :style="{ width: p.progress + '%' }"></div>
          </div>
        </div>
        <div class="col-span-2 flex justify-end md:justify-start">
          <span class="badge" :class="statusColor[p.status]">{{ p.status }}</span>
        </div>
      </RouterLink>
    </div>

    <div v-if="filtered.length === 0" class="card grid place-items-center py-20 text-center">
      <p class="font-semibold text-secondary">No projects found</p>
      <p class="mt-1 text-sm text-brand-muted">Try adjusting your search or filters.</p>
    </div>
  </div>
</template>
