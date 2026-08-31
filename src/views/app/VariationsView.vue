<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { GitCompareArrows, Plus, ArrowUp, ArrowDown, Check, Clock, X, Trash2 } from 'lucide-vue-next'
import { useToast } from '@/composables/useToast'
import { useProjectsStore } from '@/stores/projects'
import { useVariationsStore } from '@/stores/variations'
import { formatFull, timeAgo } from '@/utils/format'
import ProjectSwitcher from '@/components/ProjectSwitcher.vue'

const { toast } = useToast()
const projects = useProjectsStore()
const store = useVariationsStore()

const filter = ref('All')
const filters = ['All', 'Pending', 'Approved', 'Rejected']

const projectId = computed(() => projects.currentProjectId)
const variations = computed(() => store.variations)

onMounted(async () => {
  await projects.ensureProject()
  if (projectId.value) store.fetchForProject(projectId.value).catch((e) => toast(e.message, 'warning'))
})
watch(projectId, (id) => {
  if (id) store.fetchForProject(id).catch(() => {})
})

// A variation is a described change with a cost, so ask for both rather than
// inserting a placeholder row titled "describe the change".
const createOpen = ref(false)
const saving = ref(false)
const draft = ref(blankVariation())
const draftError = ref('')

function blankVariation() {
  return { title: '', description: '', revFrom: 'Rev C', revTo: 'Rev D', impact: null, direction: 'add' }
}

function openCreate() {
  draft.value = blankVariation()
  draftError.value = ''
  createOpen.value = true
}

async function newVariation() {
  if (saving.value) return
  const title = draft.value.title.trim()
  if (!title) {
    draftError.value = 'Describe the change.'
    return
  }
  if (draft.value.impact === null || draft.value.impact === '' || Number(draft.value.impact) < 0) {
    draftError.value = 'Enter the cost impact as a positive figure, then pick add or omit.'
    return
  }

  saving.value = true
  const magnitude = Math.abs(Number(draft.value.impact))
  try {
    await store.create(
      {
        title,
        description: draft.value.description.trim() || title,
        impact: magnitude,
        direction: draft.value.direction,
        revFrom: draft.value.revFrom,
        revTo: draft.value.revTo,
      },
      projectId.value
    )
    filter.value = 'All'
    createOpen.value = false
    toast(`Variation raised — ${formatFull(magnitude)} ${draft.value.direction === 'omit' ? 'omission' : 'addition'}, pending approval`)
  } catch (err) {
    draftError.value = err.message || 'That variation could not be raised.'
  } finally {
    saving.value = false
  }
}

// A variations register you cannot act on is just a list. Pending items get
// approve / reject — but only from someone entitled to decide, and never on
// their own variation. The server is what enforces that; a 403 here is the
// real answer, not a hint.
async function setStatus(v, status) {
  try {
    await store.decide(v.id, status, projectId.value)
    toast(`${v.id} ${status.toLowerCase()}`, status === 'Rejected' ? 'warning' : 'success')
  } catch (err) {
    toast(err.message || `${v.id} could not be ${status.toLowerCase()}`, 'warning')
  }
}

async function removeVariation(v) {
  try {
    await store.remove(v.id)
    toast(`${v.id} deleted`, 'info')
  } catch (err) {
    // An approved variation is part of the cost record — the server refuses and
    // asks for a reversing variation instead.
    toast(err.message || `${v.id} could not be deleted`, 'warning')
  }
}

async function editVariation(v, patch) {
  try {
    await store.update(v.id, patch)
  } catch (err) {
    toast(err.message || 'That change could not be saved', 'warning')
    await store.fetchForProject(projectId.value, { force: true }).catch(() => {})
  }
}

/**
 * The table shows a signed figure; the API takes a positive magnitude plus a
 * direction. Split it here so the sign the user typed is what gets stored.
 */
async function editImpact(v, raw) {
  const n = Number(raw)
  if (!Number.isFinite(n)) return
  await editVariation(v, { impact: Math.abs(n), direction: n < 0 ? 'omit' : 'add' })
}

const statusMeta = {
  Approved: { c: 'bg-success/10 text-success', icon: Check },
  Pending: { c: 'bg-warning/10 text-warning', icon: Clock },
  Rejected: { c: 'bg-danger/10 text-danger', icon: X },
}

const filtered = computed(() =>
  filter.value === 'All' ? variations.value : variations.value.filter((v) => v.status === filter.value)
)
const netImpact = computed(() => store.approvedTotal)
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="font-display text-2xl font-bold text-secondary">Variations</h2>
        <p class="mt-1 text-brand-muted">Change orders &amp; cost impact<template v-if="projects.current"> · {{ projects.current.name }}</template></p>
        <ProjectSwitcher class="mt-3" />
      </div>
      <button class="btn-primary btn-md self-start" @click="openCreate"><Plus class="h-4 w-4" /> New Variation</button>
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
    <div v-if="!filtered.length" class="card grid place-items-center py-16 text-center">
      <p class="font-semibold text-secondary">No {{ filter === 'All' ? '' : filter.toLowerCase() }} variations</p>
      <p class="mt-1 text-sm text-brand-muted">Raise one with “New Variation”, or switch filters.</p>
      <button class="btn-primary btn-md mt-5" @click="openCreate"><Plus class="h-4 w-4" /> New Variation</button>
    </div>
    <div v-else class="space-y-3">
      <div v-for="v in filtered" :key="v.id" class="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
        <div class="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <GitCompareArrows class="h-5 w-5" />
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <span class="font-mono text-xs text-brand-light">{{ v.id }}</span>
            <span class="text-xs text-brand-light">·</span>
            <span class="text-xs text-brand-muted">{{ v.rev }}</span>
          </div>
          <!-- Committed on change, not per keystroke: each edit is a round trip. -->
          <input :value="v.title" class="mt-0.5 w-full rounded-md bg-transparent font-semibold text-secondary hover:bg-brand-bg focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary"
            @change="editVariation(v, { title: $event.target.value })" />
          <p class="text-xs text-brand-light">Raised {{ timeAgo(v.date) }} by {{ v.by }}</p>
        </div>
        <div class="flex flex-wrap items-center gap-4">
          <div class="text-right">
            <p class="text-xs text-brand-light">Cost impact</p>
            <div class="flex items-center justify-end gap-1 font-bold" :class="v.impact >= 0 ? 'text-danger' : 'text-success'">
              <component :is="v.impact >= 0 ? ArrowUp : ArrowDown" class="h-4 w-4 shrink-0" />
              <span class="text-brand-light">₦</span>
              <input :value="v.impact" type="number" step="any"
                class="w-28 rounded-md bg-transparent text-right font-bold hover:bg-brand-bg focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                @change="editImpact(v, $event.target.value)" />
            </div>
          </div>
          <span class="badge" :class="statusMeta[v.status].c">
            <component :is="statusMeta[v.status].icon" class="h-3 w-3" /> {{ v.status }}
          </span>
          <div class="flex items-center gap-1.5">
            <template v-if="v.status === 'Pending'">
              <button class="btn-outline btn-sm !border-success/40 !text-success hover:!border-success" @click="setStatus(v, 'Approved')">
                <Check class="h-3.5 w-3.5" /> Approve
              </button>
              <button class="btn-outline btn-sm !border-danger/40 !text-danger hover:!border-danger" @click="setStatus(v, 'Rejected')">
                <X class="h-3.5 w-3.5" /> Reject
              </button>
            </template>
            <button v-else class="btn-outline btn-sm" @click="setStatus(v, 'Pending')">
              <Clock class="h-3.5 w-3.5" /> Reopen
            </button>
            <button class="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-brand-light hover:bg-danger/10 hover:text-danger" title="Delete variation" @click="removeVariation(v)">
              <Trash2 class="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- New variation -->
    <transition name="page">
      <div v-if="createOpen" class="fixed inset-0 z-[60] flex items-end justify-center bg-secondary/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" @click.self="createOpen = false">
        <div class="w-full max-w-lg overflow-hidden rounded-t-2xl bg-white shadow-card-hover sm:rounded-2xl">
          <div class="flex items-center justify-between border-b border-brand-border-light px-6 py-4">
            <h3 class="font-display text-lg font-bold text-secondary">Raise a variation</h3>
            <button class="btn btn-ghost btn-sm" @click="createOpen = false"><X class="h-5 w-5" /></button>
          </div>
          <form class="space-y-4 p-6" @submit.prevent="newVariation">
            <div>
              <label class="label">What changed?</label>
              <input v-model="draft.title" class="input" placeholder="Upgrade kitchen finishes to imported tiles" autofocus />
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label class="label">From revision</label>
                <input v-model="draft.revFrom" class="input" placeholder="Rev C" />
              </div>
              <div>
                <label class="label">To revision</label>
                <input v-model="draft.revTo" class="input" placeholder="Rev D" />
              </div>
            </div>

            <div>
              <label class="label">Effect on the account</label>
              <div class="flex gap-2">
                <button type="button" class="flex-1 rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition-colors"
                  :class="draft.direction === 'add' ? 'border-danger bg-danger/10 text-danger' : 'border-brand-border bg-white text-brand-muted hover:border-danger/40'"
                  @click="draft.direction = 'add'">
                  <ArrowUp class="inline h-4 w-4" /> Addition
                </button>
                <button type="button" class="flex-1 rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition-colors"
                  :class="draft.direction === 'omit' ? 'border-success bg-success/10 text-success' : 'border-brand-border bg-white text-brand-muted hover:border-success/40'"
                  @click="draft.direction = 'omit'">
                  <ArrowDown class="inline h-4 w-4" /> Omission
                </button>
              </div>
            </div>

            <div>
              <label class="label">Cost impact (₦)</label>
              <input v-model.number="draft.impact" type="number" min="0" step="any" class="input" placeholder="4200000" />
              <p v-if="draft.impact > 0" class="mt-1.5 text-xs" :class="draft.direction === 'omit' ? 'text-success' : 'text-danger'">
                {{ draft.direction === 'omit' ? 'Reduces' : 'Increases' }} the account by {{ formatFull(Math.abs(draft.impact)) }}.
              </p>
            </div>

            <p v-if="draftError" class="text-sm font-medium text-danger">{{ draftError }}</p>

            <div class="flex gap-2 pt-2">
              <button type="button" class="btn-outline btn-md flex-1" @click="createOpen = false">Cancel</button>
              <button type="submit" class="btn-primary btn-md flex-1" :disabled="saving"><Plus class="h-4 w-4" /> {{ saving ? 'Raising…' : 'Raise variation' }}</button>
            </div>
          </form>
        </div>
      </div>
    </transition>
  </div>
</template>
