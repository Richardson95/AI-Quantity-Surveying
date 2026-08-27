<script setup>
import { computed } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import {
  ArrowLeft, MapPin, Building2, Calendar, FileSpreadsheet,
  GitCompareArrows, FileText, Download, Users, FolderSearch,
} from 'lucide-vue-next'
import AreaChart from '@/components/charts/AreaChart.vue'
import { useProjectsStore } from '@/stores/projects'
import { useDocumentsStore } from '@/stores/documents'
import { useToast } from '@/composables/useToast'
import { downloadMock } from '@/utils/download'
import { formatMoney } from '@/utils/format'
import FileDropzone from '@/components/FileDropzone.vue'
import DocumentList from '@/components/DocumentList.vue'

const route = useRoute()
const store = useProjectsStore()
const documents = useDocumentsStore()
const { toast } = useToast()
// A bad id must say so — silently showing a different project is worse than a 404.
const project = computed(() => store.projects.find((p) => p.id === route.params.id) || null)

function exportProject() {
  downloadMock(`${project.value.name} — Summary.txt`)
  toast('Project summary exported')
}
function downloadDoc(doc) {
  downloadMock(`${doc.name}.${doc.type.toLowerCase()}`)
  toast(`Downloading ${doc.name}`)
}

const statusColor = {
  'In Progress': 'bg-primary/10 text-primary-dark',
  Tender: 'bg-warning/10 text-warning',
  Completed: 'bg-success/10 text-success',
  'On Hold': 'bg-brand-border text-brand-muted',
}

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
const spend = [{ label: 'Cumulative spend', data: [20, 42, 60, 85, 105, 121].map((n) => n * 1_000_000), color: '#1CA5F6' }]

const docs = [
  { name: 'Architectural Drawings Rev C', type: 'PDF', size: '12.4 MB', date: 'Jun 9' },
  { name: 'Structural Plans', type: 'DWG', size: '8.1 MB', date: 'Jun 7' },
  { name: 'Substructure BOQ', type: 'XLSX', size: '420 KB', date: 'Jun 5' },
  { name: 'Material Specifications', type: 'PDF', size: '2.2 MB', date: 'Jun 2' },
]
</script>

<template>
  <div v-if="!project" class="card grid place-items-center px-6 py-20 text-center">
    <div class="grid h-14 w-14 place-items-center rounded-2xl bg-brand-bg text-brand-light"><FolderSearch class="h-6 w-6" /></div>
    <p class="mt-4 font-semibold text-secondary">Project not found</p>
    <p class="mt-1 max-w-sm text-sm text-brand-muted">
      No project matches <span class="font-mono text-secondary">{{ route.params.id }}</span>. It may have been removed.
    </p>
    <RouterLink to="/app/projects" class="btn-primary btn-md mt-6"><ArrowLeft class="h-4 w-4" /> Back to projects</RouterLink>
  </div>

  <div v-else class="space-y-6">
    <RouterLink to="/app/projects" class="inline-flex items-center gap-1.5 text-sm font-medium text-brand-muted hover:text-secondary">
      <ArrowLeft class="h-4 w-4" /> Back to projects
    </RouterLink>

    <!-- Header -->
    <div class="card overflow-hidden">
      <div :class="`bg-gradient-to-br ${project.cover}`" class="relative h-32">
        <div class="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(255,255,255,0.25),transparent_60%)]"></div>
      </div>
      <div class="p-6">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div class="flex items-center gap-3">
              <h2 class="font-display text-2xl font-bold text-secondary">{{ project.name }}</h2>
              <span class="badge" :class="statusColor[project.status]">{{ project.status }}</span>
            </div>
            <div class="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-brand-muted">
              <span class="flex items-center gap-1.5"><Building2 class="h-4 w-4" /> {{ project.client }}</span>
              <span class="flex items-center gap-1.5"><MapPin class="h-4 w-4" /> {{ project.location }}</span>
              <span class="flex items-center gap-1.5"><Calendar class="h-4 w-4" /> Updated {{ project.updated }}</span>
            </div>
          </div>
          <div class="flex gap-2">
            <RouterLink to="/app/boq" class="btn-outline btn-md"><FileSpreadsheet class="h-4 w-4" /> Open BOQ</RouterLink>
            <button class="btn-primary btn-md" @click="exportProject"><Download class="h-4 w-4" /> Export</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      <div class="card p-5">
        <p class="text-sm text-brand-muted">Total Budget</p>
        <p class="mt-1 font-display text-xl font-bold text-secondary">{{ formatMoney(project.budget) }}</p>
      </div>
      <div class="card p-5">
        <p class="text-sm text-brand-muted">Spent to Date</p>
        <p class="mt-1 font-display text-xl font-bold text-secondary">{{ formatMoney(project.spent) }}</p>
      </div>
      <div class="card p-5">
        <p class="text-sm text-brand-muted">Remaining</p>
        <p class="mt-1 font-display text-xl font-bold text-success">{{ formatMoney(project.budget - project.spent) }}</p>
      </div>
      <div class="card p-5">
        <p class="text-sm text-brand-muted">Completion</p>
        <p class="mt-1 font-display text-xl font-bold text-secondary">{{ project.progress }}%</p>
      </div>
    </div>

    <div class="grid gap-6 lg:grid-cols-3">
      <!-- Spend chart -->
      <div class="card p-6 lg:col-span-2">
        <h3 class="mb-1 font-display text-lg font-bold text-secondary">Spend Tracking</h3>
        <p class="mb-4 text-sm text-brand-muted">Cumulative project expenditure</p>
        <AreaChart :labels="months" :datasets="spend" currency :height="280" />
      </div>

      <!-- Team + quick links -->
      <div class="space-y-6">
        <div class="card p-6">
          <div class="mb-4 flex items-center gap-2">
            <Users class="h-4 w-4 text-primary" />
            <h3 class="font-display font-bold text-secondary">Project Team</h3>
          </div>
          <div class="space-y-3">
            <div v-for="(t, i) in project.team" :key="t" class="flex items-center gap-3">
              <div class="grid h-9 w-9 place-items-center rounded-full bg-brand-gradient text-xs font-semibold text-white">{{ t }}</div>
              <div>
                <p class="text-sm font-semibold text-secondary">Team Member {{ i + 1 }}</p>
                <p class="text-xs text-brand-light">{{ ['Lead QS', 'Estimator', 'Project Manager', 'Surveyor'][i % 4] }}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="card p-6">
          <h3 class="mb-3 font-display font-bold text-secondary">Quick Actions</h3>
          <div class="space-y-2">
            <RouterLink to="/app/variations" class="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-brand-muted hover:bg-brand-bg hover:text-secondary"><GitCompareArrows class="h-4 w-4" /> Manage variations</RouterLink>
            <RouterLink to="/app/reports" class="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-brand-muted hover:bg-brand-bg hover:text-secondary"><FileText class="h-4 w-4" /> Generate report</RouterLink>
          </div>
        </div>
      </div>
    </div>

    <!-- Documents -->
    <div class="card p-6">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 class="font-display text-lg font-bold text-secondary">Documents</h3>
          <p class="text-sm text-brand-muted">Drawings, plans, BOQs and specifications for this project</p>
        </div>
        <span v-if="documents.totalFor(project.id)" class="badge bg-primary/10 text-primary-dark">
          {{ documents.totalFor(project.id) }} uploaded
        </span>
      </div>

      <FileDropzone :scope="project.id" label="Drop project documents here" />

      <!-- Uploaded files sit directly beneath the dropzone. -->
      <div class="mt-4">
        <p class="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-light">
          Uploaded documents
          <span v-if="documents.totalFor(project.id)" class="text-brand-muted">· {{ documents.totalFor(project.id) }}</span>
        </p>
        <DocumentList
          :scope="project.id"
          empty-text="Nothing uploaded yet — drop drawings, BOQs or specifications above."
        />
      </div>

      <p class="mb-2 mt-8 text-xs font-semibold uppercase tracking-wider text-brand-light">Sample project files</p>
      <div class="grid gap-3 sm:grid-cols-2">
        <div v-for="d in docs" :key="d.name" class="flex items-center gap-3 rounded-xl border border-brand-border-light p-3 transition-colors hover:border-primary/30 hover:bg-brand-bg">
          <div class="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-xs font-bold text-primary-dark">{{ d.type }}</div>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-semibold text-secondary">{{ d.name }}</p>
            <p class="text-xs text-brand-light">{{ d.size }} · {{ d.date }}</p>
          </div>
          <button class="grid h-8 w-8 place-items-center rounded-lg text-brand-light hover:bg-brand-border-light hover:text-primary" @click="downloadDoc(d)"><Download class="h-4 w-4" /></button>
        </div>
      </div>
    </div>
  </div>
</template>
