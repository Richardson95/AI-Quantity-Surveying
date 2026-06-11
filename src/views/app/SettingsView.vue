<script setup>
import { ref } from 'vue'
import { User, Bell, Lock, Globe, Building2, Camera, Check } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'

const auth = useAuthStore()
const { toast } = useToast()
const tab = ref('profile')
const saved = ref(false)

const tabs = [
  { id: 'profile', name: 'Profile', icon: User },
  { id: 'company', name: 'Company', icon: Building2 },
  { id: 'notifications', name: 'Notifications', icon: Bell },
  { id: 'security', name: 'Security', icon: Lock },
  { id: 'preferences', name: 'Preferences', icon: Globe },
]

const form = ref({
  name: auth.user.name,
  email: auth.user.email,
  role: auth.user.role,
  company: auth.user.company,
  phone: '+234 801 234 5678',
})

const notifications = ref({
  boqComplete: true, variations: true, teamActivity: false, priceAlerts: true, weekly: true,
})

function save() {
  auth.user.name = form.value.name
  saved.value = true
  toast('Changes saved')
  setTimeout(() => (saved.value = false), 2000)
}
function cancel() {
  form.value = {
    name: auth.user.name,
    email: auth.user.email,
    role: auth.user.role,
    company: auth.user.company,
    phone: '+234 801 234 5678',
  }
  toast('Changes discarded', 'info')
}
function changePhoto() {
  toast('Photo upload (mock)', 'info')
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h2 class="font-display text-2xl font-bold text-secondary">Settings</h2>
      <p class="mt-1 text-brand-muted">Manage your account and preferences</p>
    </div>

    <div class="grid gap-6 lg:grid-cols-4">
      <!-- Tabs -->
      <nav class="space-y-1 lg:col-span-1">
        <button v-for="t in tabs" :key="t.id" @click="tab = t.id"
          class="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors"
          :class="tab === t.id ? 'bg-primary/10 text-primary-dark' : 'text-brand-muted hover:bg-brand-border-light hover:text-secondary'">
          <component :is="t.icon" class="h-[18px] w-[18px]" /> {{ t.name }}
        </button>
      </nav>

      <!-- Panel -->
      <div class="card p-6 lg:col-span-3">
        <!-- Profile -->
        <div v-if="tab === 'profile'" class="space-y-6">
          <h3 class="font-display text-lg font-bold text-secondary">Profile</h3>
          <div class="flex items-center gap-5">
            <div class="relative">
              <div class="grid h-20 w-20 place-items-center rounded-2xl bg-brand-gradient text-2xl font-bold text-white">{{ auth.user.avatar }}</div>
              <button class="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-lg border border-brand-border bg-white text-brand-muted shadow-sm hover:text-primary" @click="changePhoto"><Camera class="h-4 w-4" /></button>
            </div>
            <div>
              <p class="font-semibold text-secondary">{{ form.name }}</p>
              <p class="text-sm text-brand-muted">{{ form.role }}</p>
            </div>
          </div>
          <div class="grid gap-5 sm:grid-cols-2">
            <div><label class="label">Full name</label><input v-model="form.name" class="input" /></div>
            <div><label class="label">Email</label><input v-model="form.email" type="email" class="input" /></div>
            <div><label class="label">Role</label><input v-model="form.role" class="input" /></div>
            <div><label class="label">Phone</label><input v-model="form.phone" class="input" /></div>
          </div>
        </div>

        <!-- Company -->
        <div v-else-if="tab === 'company'" class="space-y-6">
          <h3 class="font-display text-lg font-bold text-secondary">Company</h3>
          <div class="grid gap-5 sm:grid-cols-2">
            <div><label class="label">Company name</label><input v-model="form.company" class="input" /></div>
            <div><label class="label">Industry</label><input value="Construction & QS" class="input" /></div>
            <div><label class="label">Country</label>
              <select class="input"><option>Nigeria</option><option>Ghana</option><option>Kenya</option><option>South Africa</option></select>
            </div>
            <div><label class="label">Default currency</label>
              <select class="input"><option>₦ Naira (NGN)</option><option>$ Dollar (USD)</option><option>£ Pound (GBP)</option></select>
            </div>
          </div>
        </div>

        <!-- Notifications -->
        <div v-else-if="tab === 'notifications'" class="space-y-2">
          <h3 class="mb-4 font-display text-lg font-bold text-secondary">Notifications</h3>
          <label v-for="(val, key) in notifications" :key="key"
            class="flex cursor-pointer items-center justify-between rounded-xl border border-brand-border-light p-4 hover:bg-brand-bg">
            <div>
              <p class="font-medium capitalize text-secondary">{{ key.replace(/([A-Z])/g, ' $1') }}</p>
              <p class="text-xs text-brand-muted">Email me about this activity</p>
            </div>
            <button type="button" @click="notifications[key] = !notifications[key]"
              class="relative h-6 w-11 rounded-full transition-colors" :class="val ? 'bg-primary' : 'bg-brand-border'">
              <span class="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform" :class="val ? 'left-[22px]' : 'left-0.5'"></span>
            </button>
          </label>
        </div>

        <!-- Security -->
        <div v-else-if="tab === 'security'" class="space-y-6">
          <h3 class="font-display text-lg font-bold text-secondary">Security</h3>
          <div class="grid gap-5 sm:grid-cols-2">
            <div><label class="label">Current password</label><input type="password" class="input" placeholder="••••••••" /></div>
            <div></div>
            <div><label class="label">New password</label><input type="password" class="input" placeholder="••••••••" /></div>
            <div><label class="label">Confirm password</label><input type="password" class="input" placeholder="••••••••" /></div>
          </div>
          <div class="flex items-center justify-between rounded-xl border border-brand-border-light p-4">
            <div>
              <p class="font-medium text-secondary">Two-factor authentication</p>
              <p class="text-xs text-brand-muted">Add an extra layer of security to your account</p>
            </div>
            <span class="badge bg-success/10 text-success"><Check class="h-3 w-3" /> Enabled</span>
          </div>
        </div>

        <!-- Preferences -->
        <div v-else class="space-y-6">
          <h3 class="font-display text-lg font-bold text-secondary">Preferences</h3>
          <div class="grid gap-5 sm:grid-cols-2">
            <div><label class="label">Measurement standard</label>
              <select class="input"><option>RICS / SMM7</option><option>NIQS</option><option>POMI</option><option>Metric (ISO)</option></select>
            </div>
            <div><label class="label">Language</label>
              <select class="input"><option>English</option><option>French</option></select>
            </div>
            <div><label class="label">Date format</label>
              <select class="input"><option>DD/MM/YYYY</option><option>MM/DD/YYYY</option></select>
            </div>
            <div><label class="label">Default region pricing</label>
              <select class="input"><option>Lagos</option><option>Abuja</option><option>Port Harcourt</option></select>
            </div>
          </div>
        </div>

        <div class="mt-8 flex items-center justify-end gap-3 border-t border-brand-border-light pt-6">
          <span v-if="saved" class="flex items-center gap-1.5 text-sm font-medium text-success"><Check class="h-4 w-4" /> Saved</span>
          <button class="btn-outline btn-md" @click="cancel">Cancel</button>
          <button class="btn-primary btn-md" @click="save">Save changes</button>
        </div>
      </div>
    </div>
  </div>
</template>
