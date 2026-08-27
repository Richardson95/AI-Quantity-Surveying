<script setup>
import { ref, computed } from 'vue'
import { UserPlus, Mail, Shield, Crown, X, Trash2, RefreshCw } from 'lucide-vue-next'
import { useToast } from '@/composables/useToast'

const { toast } = useToast()

const members = ref([
  { name: 'Dammie Adetunji', email: 'adetunjidammie2@gmail.com', role: 'Company Admin', avatar: 'DA', status: 'Active', online: true },
  { name: 'Kemi Olu', email: 'kemi@adetunji.co', role: 'Quantity Surveyor', avatar: 'KO', status: 'Active', online: true },
  { name: 'Tunde James', email: 'tunde@adetunji.co', role: 'Project Manager', avatar: 'TJ', status: 'Active', online: false },
  { name: 'Maryam Nuhu', email: 'maryam@adetunji.co', role: 'Quantity Surveyor', avatar: 'MN', status: 'Active', online: false },
  { name: 'Client — Oceanview', email: 'pm@oceanview.com', role: 'Client Viewer', avatar: 'OV', status: 'Invited', online: false },
])

// Inviting used to fabricate a placeholder teammate. Now it asks who you mean.
const inviteOpen = ref(false)
const invite = ref({ name: '', email: '', role: 'Quantity Surveyor' })
const inviteError = ref('')

function openInvite() {
  invite.value = { name: '', email: '', role: 'Quantity Surveyor' }
  inviteError.value = ''
  inviteOpen.value = true
}

function initials(name) {
  const parts = String(name).trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '??'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function sendInvite() {
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
  members.value.push({
    name: name.trim(),
    email: email.trim(),
    role,
    avatar: initials(name),
    status: 'Invited',
    online: false,
  })
  inviteOpen.value = false
  toast(`Invitation sent to ${email.trim()}`)
}

function resendInvite(m) {
  toast(`Invitation resent to ${m.email}`, 'info')
}

function removeMember(m) {
  if (m.role === 'Company Admin') {
    toast('The company admin cannot be removed', 'warning')
    return
  }
  members.value = members.value.filter((x) => x.email !== m.email)
  toast(`${m.name} removed from the team`, 'info')
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
          <p class="mt-1 text-brand-muted">{{ members.length }} members · Adetunji & Associates</p>
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
        <div class="divide-y divide-brand-border-light">
          <div v-for="m in members" :key="m.email" class="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-brand-bg sm:flex-row sm:items-center sm:gap-4">
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
              <select v-model="m.role" class="rounded-full border-0 px-2.5 py-1 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30" :class="roleColor[m.role]">
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
              <button type="submit" class="btn-primary btn-md flex-1"><UserPlus class="h-4 w-4" /> Send invite</button>
            </div>
          </form>
        </div>
      </div>
    </transition>
  </div>
</template>
