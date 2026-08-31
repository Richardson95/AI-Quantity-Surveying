<script setup>
import { computed, ref, onMounted, watch , onBeforeUnmount } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import {
  ArrowLeft, MapPin, Building2, Calendar, FileSpreadsheet,
  GitCompareArrows, FileText, Download, Users, FolderSearch, Pencil, Trash2, X,
} from 'lucide-vue-next'
import AreaChart from '@/components/charts/AreaChart.vue'
import { useProjectsStore } from '@/stores/projects'
import { useDocumentsStore } from '@/stores/documents'
import { useToast } from '@/composables/useToast'
import { formatMoney } from '@/utils/format'
import FileDropzone from '@/components/FileDropzone.vue'
import DocumentList from '@/components/DocumentList.vue'

const route = useRoute()
const router = useRouter()
const store = useProjectsStore()
const documents = useDocumentsStore()
const { toast } = useToast()
// A bad id must say so — silently showing a different project is worse than a 404.
const project = computed(() => store.projects.find((p) => p.id === route.params.id) || null)
const loading = ref(true)

async function load(id) {
  if (!id) return
  loading.value = true
  try {
    await store.fetchProject(id)
    if (store.byId(id)) {
      // Opening a project makes it the one every other screen works against.
      store.selectProject(id)
      await Promise.all([store.fetchActivity(id), documents.fetchForScope(id)])
    }
  } finally {
    loading.value = false
  }
}

onMounted(() => load(route.params.id))
watch(() => route.params.id, (id) => load(id))

async function exportProject() {
  // The server renders the bill it actually holds.
  const blob = await store.exportBoq(route.params.id)
  if (!blob) {
    toast('There is no bill to export yet', 'warning')
    return
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${project.value.name} — BOQ.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
  toast('Bill of quantities exported')
}

// --- Editing -----------------------------------------------------------------
const PROJECT_TYPES = ['Residential', 'Commercial', 'Industrial', 'Renovation', 'Infrastructure']
const PROJECT_STATUSES = ['In Progress', 'Tender', 'Completed', 'On Hold']

const editOpen = ref(false)
const savingEdit = ref(false)
const editError = ref('')
const edit = ref(null)

function openEdit() {
  const p = project.value
  edit.value = {
    name: p.name,
    client: p.client,
    location: p.location,
    type: p.type,
    status: p.status,
    progress: p.progress,
    budget: p.budget,
    spent: p.spent,
  }
  editError.value = ''
  editOpen.value = true
}

async function saveEdit() {
  if (savingEdit.value) return
  editError.value = ''
  if (!edit.value.name.trim()) {
    editError.value = 'Project name is required.'
    return
  }
  if (!edit.value.client.trim()) {
    editError.value = 'Client is required.'
    return
  }

  savingEdit.value = true
  try {
    await store.updateProject(route.params.id, {
      name: edit.value.name.trim(),
      client: edit.value.client.trim(),
      location: edit.value.location.trim(),
      type: edit.value.type,
      status: edit.value.status,
      progress: Math.max(0, Math.min(100, Number(edit.value.progress) || 0)),
      budget: Math.max(0, Math.round(Number(edit.value.budget) || 0)),
      spent: Math.max(0, Math.round(Number(edit.value.spent) || 0)),
    })
    editOpen.value = false
    toast('Project updated')
  } catch (err) {
    editError.value = err.message || 'Those changes could not be saved.'
  } finally {
    savingEdit.value = false
  }
}

// --- Deleting ----------------------------------------------------------------
// Deleting a project cascades to its drawings, bill, takeoff and variations, so
// the name has to be typed out rather than confirmed with one click.
const deleteOpen = ref(false)
const deleteConfirm = ref('')
const deleting = ref(false)

const canDelete = computed(
  () => deleteConfirm.value.trim().toLowerCase() === (project.value?.name || '').toLowerCase()
)

async function confirmDelete() {
  if (deleting.value || !canDelete.value) return
  deleting.value = true
  try {
    await store.removeProject(route.params.id)
    toast(`${project.value?.name || 'Project'} deleted`, 'info')
    router.replace('/app/projects')
  } catch (err) {
    toast(err.message || 'That project could not be deleted', 'warning')
  } finally {
    deleting.value = false
  }
}

const statusColor = {
  'In Progress': 'bg-primary/10 text-primary-dark',
  Tender: 'bg-warning/10 text-warning',
  Completed: 'bg-success/10 text-success',
  'On Hold': 'bg-brand-border text-brand-muted',
}

// Spend history. The server builds this from approved variations — it is the
// only dated cost movement the system actually records — and says so in its
// own notes. With no data there is nothing to plot, and an invented curve is
// worse than an empty chart.
const spendSeries = ref(null)

watch(project, async (p) => {
  if (!p) return
  spendSeries.value = await store.fetchSpend(p.id)
}, { immediate: true })

const months = computed(() => (spendSeries.value?.series || []).map((s) => s.month))
const spend = computed(() => [
  {
    label: 'Cumulative spend',
    data: (spendSeries.value?.series || []).map((s) => s.cumulative),
    color: '#1CA5F6',
  },
])
const spendNotes = computed(() => spendSeries.value?.notes || [])
const hasSpend = computed(() => months.value.length > 0)

// Analysis polling runs on a timer in the documents store; stop it when the
// screen goes away, or navigating between projects leaves pollers behind.
onBeforeUnmount(() => documents.stopWatching())
</script>

<template>
  <!-- Wait for the server before deciding a project does not exist; otherwise
       a hard refresh flashes "not found" on a project that is perfectly fine. -->
  <div v-if="loading && !project" class="card grid place-items-center px-6 py-20 text-center">
    <p class="font-semibold text-secondary">Loading project…</p>
  </div>

  <div v-else-if="!project" class="card grid place-items-center px-6 py-20 text-center">
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
            <button class="btn-outline btn-md" @click="openEdit"><Pencil class="h-4 w-4" /> Edit</button>
            <button class="btn-primary btn-md" @click="exportProject"><Download class="h-4 w-4" /> Export</button>
            <button class="btn-outline btn-md !border-danger/40 !text-danger hover:!border-danger" title="Delete project" @click="deleteOpen = true">
              <Trash2 class="h-4 w-4" />
            </button>
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
        <AreaChart v-if="hasSpend" :labels="months" :datasets="spend" currency :height="280" />
        <p v-else class="grid h-[280px] place-content-center rounded-xl border border-dashed border-brand-border-light px-6 text-center text-sm text-brand-muted">
          No dated spend has been recorded for this project yet.
        </p>
        <p v-for="n in spendNotes" :key="n.text" class="mt-3 text-xs text-brand-light">{{ n.text }}</p>
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

    </div>

    <!-- Edit project -->
    <transition name="page">
      <div v-if="editOpen" class="fixed inset-0 z-[60] flex items-end justify-center bg-secondary/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" @click.self="editOpen = false">
        <div class="w-full max-w-lg overflow-hidden rounded-t-2xl bg-white shadow-card-hover sm:rounded-2xl">
          <div class="flex items-center justify-between border-b border-brand-border-light px-6 py-4">
            <h3 class="font-display text-lg font-bold text-secondary">Edit project</h3>
            <button class="btn btn-ghost btn-sm" @click="editOpen = false"><X class="h-5 w-5" /></button>
          </div>
          <form class="space-y-4 p-6" @submit.prevent="saveEdit">
            <div>
              <label class="label">Project name</label>
              <input v-model="edit.name" class="input" required />
            </div>
            <div class="grid gap-4 sm:grid-cols-2">
              <div><label class="label">Client</label><input v-model="edit.client" class="input" required /></div>
              <div><label class="label">Location</label><input v-model="edit.location" class="input" /></div>
            </div>
            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label class="label">Type</label>
                <select v-model="edit.type" class="input"><option v-for="t in PROJECT_TYPES" :key="t">{{ t }}</option></select>
              </div>
              <div>
                <label class="label">Status</label>
                <select v-model="edit.status" class="input"><option v-for="st in PROJECT_STATUSES" :key="st">{{ st }}</option></select>
              </div>
            </div>
            <div class="grid gap-4 sm:grid-cols-2">
              <div><label class="label">Budget (₦)</label><input v-model.number="edit.budget" type="number" min="0" step="100000" class="input" /></div>
              <div><label class="label">Spent to date (₦)</label><input v-model.number="edit.spent" type="number" min="0" step="100000" class="input" /></div>
            </div>
            <div>
              <label class="label">Completion — {{ edit.progress }}%</label>
              <input v-model.number="edit.progress" type="range" min="0" max="100" class="w-full accent-primary" />
            </div>
            <p v-if="editError" class="text-sm font-medium text-danger">{{ editError }}</p>
            <div class="flex gap-2 pt-2">
              <button type="button" class="btn-outline btn-md flex-1" :disabled="savingEdit" @click="editOpen = false">Cancel</button>
              <button type="submit" class="btn-primary btn-md flex-1" :disabled="savingEdit">{{ savingEdit ? 'Saving…' : 'Save changes' }}</button>
            </div>
          </form>
        </div>
      </div>
    </transition>

    <!-- Delete project -->
    <transition name="page">
      <div v-if="deleteOpen" class="fixed inset-0 z-[70] flex items-center justify-center bg-secondary/50 p-4 backdrop-blur-sm" @click.self="deleteOpen = false">
        <div class="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-card-hover">
          <div class="flex items-center justify-between border-b border-brand-border-light px-6 py-4">
            <h3 class="font-display text-lg font-bold text-danger">Delete this project?</h3>
            <button class="btn btn-ghost btn-sm" @click="deleteOpen = false"><X class="h-5 w-5" /></button>
          </div>
          <div class="space-y-4 p-6">
            <p class="text-sm text-brand-muted">
              This removes <span class="font-semibold text-secondary">{{ project.name }}</span> and everything under it —
              its drawings, every bill revision, the takeoff and all variations. It cannot be undone.
            </p>
            <div>
              <label class="label">Type the project name to confirm</label>
              <input v-model="deleteConfirm" class="input" :placeholder="project.name" autocomplete="off" />
            </div>
            <div class="flex gap-2 pt-1">
              <button type="button" class="btn-outline btn-md flex-1" :disabled="deleting" @click="deleteOpen = false">Cancel</button>
              <button class="btn-md flex-1 btn-primary !bg-danger hover:!bg-danger" :disabled="!canDelete || deleting" @click="confirmDelete">
                <Trash2 class="h-4 w-4" /> {{ deleting ? 'Deleting…' : 'Delete project' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </transition>

  </div>
</template>
