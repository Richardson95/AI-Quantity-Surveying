<script setup>
import { ref } from 'vue'
import { UserPlus, Mail, MoreHorizontal, Shield, Crown } from 'lucide-vue-next'
import { useToast } from '@/composables/useToast'

const { toast } = useToast()

const members = ref([
  { name: 'Dammie Adetunji', email: 'adetunjidammie2@gmail.com', role: 'Company Admin', avatar: 'DA', status: 'Active', online: true },
  { name: 'Kemi Olu', email: 'kemi@adetunji.co', role: 'Quantity Surveyor', avatar: 'KO', status: 'Active', online: true },
  { name: 'Tunde James', email: 'tunde@adetunji.co', role: 'Project Manager', avatar: 'TJ', status: 'Active', online: false },
  { name: 'Maryam Nuhu', email: 'maryam@adetunji.co', role: 'Quantity Surveyor', avatar: 'MN', status: 'Active', online: false },
  { name: 'Client — Oceanview', email: 'pm@oceanview.com', role: 'Client Viewer', avatar: 'OV', status: 'Invited', online: false },
])

let inviteSeq = 1
function inviteMember() {
  const n = inviteSeq++
  members.value.push({
    name: `Invited teammate ${n}`,
    email: `teammate${n}@adetunji.co`,
    role: 'Quantity Surveyor',
    avatar: 'IT',
    status: 'Invited',
    online: false,
  })
  toast('Invitation sent — pending acceptance')
}
function memberOptions(m) {
  toast(`Options for ${m.name} (mock)`, 'info')
}

const roleColor = {
  'Company Admin': 'bg-primary/10 text-primary-dark',
  'Quantity Surveyor': 'bg-success/10 text-success',
  'Project Manager': 'bg-warning/10 text-warning',
  'Client Viewer': 'bg-brand-border text-brand-muted',
}

const roles = [
  { name: 'Company Admin', desc: 'Manage users, projects, workflows & reports', icon: Crown, count: 1 },
  { name: 'Quantity Surveyor', desc: 'Generate BOQs, edit quantities, upload drawings', icon: Shield, count: 2 },
  { name: 'Project Manager', desc: 'Review budgets, approve changes, monitor progress', icon: Shield, count: 1 },
  { name: 'Client Viewer', desc: 'View approved documents, reports & variations', icon: Shield, count: 1 },
]
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="font-display text-2xl font-bold text-secondary">Team</h2>
        <p class="mt-1 text-brand-muted">{{ members.length }} members · Adetunji & Associates</p>
      </div>
      <button class="btn-primary btn-md self-start" @click="inviteMember"><UserPlus class="h-4 w-4" /> Invite member</button>
    </div>

    <!-- Roles overview -->
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
        <div v-for="m in members" :key="m.email" class="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-brand-bg">
          <div class="relative">
            <div class="grid h-11 w-11 place-items-center rounded-full bg-brand-gradient text-sm font-bold text-white">{{ m.avatar }}</div>
            <span v-if="m.online" class="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-success ring-2 ring-white"></span>
          </div>
          <div class="min-w-0 flex-1">
            <p class="font-semibold text-secondary">{{ m.name }}</p>
            <p class="flex items-center gap-1.5 text-xs text-brand-muted"><Mail class="h-3 w-3" /> {{ m.email }}</p>
          </div>
          <span class="badge" :class="roleColor[m.role]">{{ m.role }}</span>
          <span class="badge" :class="m.status === 'Active' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'">{{ m.status }}</span>
          <button class="grid h-9 w-9 place-items-center rounded-lg text-brand-light hover:bg-brand-border-light hover:text-secondary" @click="memberOptions(m)"><MoreHorizontal class="h-4 w-4" /></button>
        </div>
      </div>
    </div>
  </div>
</template>
