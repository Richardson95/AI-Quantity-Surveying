<script setup>
import { ref, computed, onMounted } from 'vue'
import { UserPlus, Mail, Shield, Crown, X, Trash2, RefreshCw } from 'lucide-vue-next'
import { useToast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth'
import { useTeamStore } from '@/stores/team'

const { toast } = useToast()
const auth = useAuthStore()
const store = useTeamStore()

// Active members and pending invitations, as the screen renders them.
const members = computed(() => store.team)

onMounted(() => {
  store.fetch().catch((e) => toast(e.message, 'warning'))
})

// Inviting used to fabricate a placeholder teammate. Now it asks who you mean,
// and the server sends a real email with a single-use token.
const inviteOpen = ref(false)
const sending = ref(false)
const invite = ref({ name: '', email: '', role: 'Quantity Surveyor' })
const inviteError = ref('')

function openInvite() {
  // Seats are a real limit — say so before collecting details that get refused.
  if (store.seatsFull) {
    toast(`Your plan includes ${store.seats.limit} seats and they are all taken. Upgrade to invite more people.`, 'warning')
    return
  }
  invite.value = { name: '', email: '', role: 'Quantity Surveyor' }
  inviteError.value = ''
  inviteOpen.value = true
}

async function sendInvite() {
  if (sending.value) return
  const { name, email, role } = invite.value
  if (!name.trim() || !email.trim()) {
    inviteError.value = 'Name and email are both required.'
    return
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    inviteError.value = 'That email address does not look right.'
    return
  }
  if (members.value.some((m) => m.email.toLowerCase() === email.trim().toLowerCase())) {
    inviteError.value = 'That person is already on the team.'
    return
  }

  sending.value = true
  try {
    await store.invite({ name, email, role })
    inviteOpen.value = false
    toast(`Invitation sent to ${email.trim()}`)
  } catch (err) {
    inviteError.value = err.message || 'That invitation could not be sent.'
  } finally {
    sending.value = false
  }
}

async function resendInvite(m) {
  try {
    await store.resendInvite(m.id)
    toast(`Invitation resent to ${m.email}`, 'info')
  } catch (err) {
    toast(err.message || `Could not resend to ${m.email}`, 'warning')
  }
}

async function removeMember(m) {
  if (m.email && m.email.toLowerCase() === auth.user.email?.toLowerCase()) {
    toast('You cannot remove yourself from the team', 'warning')
    return
  }
  try {
    if (m.status === 'Invited') {
      await store.revokeInvite(m.id)
      toast(`Invitation to ${m.email} revoked`, 'info')
      return
    }
    await store.removeMember(m.id)
    toast(`${m.name} removed from the team`, 'info')
  } catch (err) {
    // The server refuses to leave an organization with no admin.
    toast(err.message || `${m.name} could not be removed`, 'warning')
  }
}

async function changeRole(m, role) {
  try {
    await store.updateMemberRole(m.id, role)
    toast(`${m.name} is now a ${role.toLowerCase()}`)
  } catch (err) {
    toast(err.message || 'That role could not be changed', 'warning')
    await store.fetch({ force: true }).catch(() => {})
  }
}

const roleColor = {
  'Company Admin': 'bg-primary/10 text-primary-dark',
  'Quantity Surveyor': 'bg-success/10 text-success',
  'Project Manager': 'bg-warning/10 text-warning',
  'Client Viewer': 'bg-brand-border text-brand-muted',
}

const roleDefs = [
  { name: 'Company Admin', desc: 'Manage users, projects, workflows & reports', icon: Crown },
  { name: 'Quantity Surveyor', desc: 'Generate BOQs, edit quantities, upload drawings', icon: Shield },
  { name: 'Project Manager', desc: 'Review budgets, approve changes, monitor progress', icon: Shield },
  { name: 'Client Viewer', desc: 'View approved documents, reports & variations', icon: Shield },
]

// Counts are derived, so inviting or removing someone updates these cards too.
const roles = computed(() =>
  roleDefs.map((r) => ({ ...r, count: members.value.filter((m) => m.role === r.name).length }))
)
const assignableRoles = roleDefs.map((r) => r.name)
</script>

<template>
  <div>
    <div class="space-y-6">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="font-display text-2xl font-bold text-secondary">Team</h2>
          <p class="mt-1 text-brand-muted">
            {{ store.members.length }} member{{ store.members.length === 1 ? '' : 's' }}<template v-if="store.invitations.length">, {{ store.invitations.length }} invited</template>
            <template v-if="auth.organization"> · {{ auth.organization.name }}</template>
            <template v-if="store.seats.limit"> · {{ store.seats.used }} of {{ store.seats.limit }} seats used</template>
          </p>
        </div>
        <button class="btn-primary btn-md self-start" @click="openInvite"><UserPlus class="h-4 w-4" /> Invite member</button>
      </div>

      <!-- Roles overview -->
      <div class="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <div v-for="r in roles" :key="r.name" class="card p-5">
          <div class="flex items-center justify-between">
            <div class="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><component :is="r.icon" class="h-5 w-5" /></div>
            <span class="font-display text-2xl font-bold text-secondary">{{ r.count }}</span>
          </div>
          <p class="mt-3 font-semibold text-secondary">{{ r.name }}</p>
          <p class="mt-1 text-xs text-brand-muted">{{ r.desc }}</p>
        </div>
      </div>

      <!-- Members -->
      <div class="card overflow-hidden">
        <div class="border-b border-brand-border-light p-5">
          <h3 class="font-display font-bold text-secondary">Members</h3>
        </div>
        <p v-if="store.loading && !members.length" class="px-5 py-14 text-center text-sm text-brand-muted">Loading the team…</p>
        <div v-else class="divide-y divide-brand-border-light">
          <div v-for="m in members" :key="m.id || m.email" class="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-brand-bg sm:flex-row sm:items-center sm:gap-4">
            <div class="flex min-w-0 flex-1 items-center gap-4">
              <div class="relative shrink-0">
                <div class="grid h-11 w-11 place-items-center rounded-full bg-brand-gradient text-sm font-bold text-white">{{ m.avatar }}</div>
                <span v-if="m.online" class="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-success ring-2 ring-white"></span>
              </div>
              <div class="min-w-0">
                <p class="truncate font-semibold text-secondary">{{ m.name }}</p>
                <p class="mt-0.5 flex items-center gap-1.5 text-xs text-brand-muted"><Mail class="h-3 w-3 shrink-0" /> <span class="truncate">{{ m.email }}</span></p>
              </div>
            </div>
            <div class="flex flex-wrap items-center gap-2 pl-[60px] sm:pl-0">
              <!-- Changing a role is an admin capability; the server refuses
                   anyone else, so a failure here is the real answer. -->
              <select :value="m.role" class="rounded-full border-0 px-2.5 py-1 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30" :class="roleColor[m.role]"
                @change="changeRole(m, $event.target.value)">
                <option v-for="r in assignableRoles" :key="r" :value="r">{{ r }}</option>
              </select>
              <span class="badge whitespace-nowrap" :class="m.status === 'Active' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'">{{ m.status }}</span>
              <div class="ml-auto flex items-center gap-1 sm:ml-0">
                <button v-if="m.status === 'Invited'" class="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-brand-light hover:bg-brand-border-light hover:text-primary" title="Resend invitation" @click="resendInvite(m)">
                  <RefreshCw class="h-4 w-4" />
                </button>
                <button class="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-brand-light hover:bg-danger/10 hover:text-danger" title="Remove from team" @click="removeMember(m)">
                  <Trash2 class="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Invite modal -->
    <transition name="page">
      <div v-if="inviteOpen" class="fixed inset-0 z-[60] flex items-center justify-center bg-secondary/50 p-4 backdrop-blur-sm" @click.self="inviteOpen = false">
        <div class="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-card-hover">
          <div class="flex items-center justify-between border-b border-brand-border-light px-6 py-4">
            <h3 class="font-display text-lg font-bold text-secondary">Invite a team member</h3>
            <button class="btn btn-ghost btn-sm" @click="inviteOpen = false"><X class="h-5 w-5" /></button>
          </div>
          <form class="space-y-4 p-6" @submit.prevent="sendInvite">
            <div><label class="label">Full name</label><input v-model="invite.name" class="input" placeholder="Kemi Olu" /></div>
            <div><label class="label">Work email</label><input v-model="invite.email" type="email" class="input" placeholder="kemi@company.com" /></div>
            <div>
              <label class="label">Role</label>
              <select v-model="invite.role" class="input">
                <option v-for="r in assignableRoles" :key="r" :value="r">{{ r }}</option>
              </select>
            </div>
            <p v-if="inviteError" class="text-sm font-medium text-danger">{{ inviteError }}</p>
            <div class="flex gap-2 pt-2">
              <button type="button" class="btn-outline btn-md flex-1" @click="inviteOpen = false">Cancel</button>
              <button type="submit" class="btn-primary btn-md flex-1" :disabled="sending">
                <UserPlus class="h-4 w-4" /> {{ sending ? 'Sending…' : 'Send invite' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </transition>
  </div>
</template>
