<script setup>
import { ref } from 'vue'
import { User, Lock, Globe, Building2, Camera, Check } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'

const auth = useAuthStore()
const { toast } = useToast()
const tab = ref('profile')
const saved = ref(false)

const tabs = [
  { id: 'profile', name: 'Profile', icon: User },
  { id: 'company', name: 'Company', icon: Building2 },
  { id: 'security', name: 'Security', icon: Lock },
  { id: 'preferences', name: 'Preferences', icon: Globe },
]

const PREFS_KEY = 'buildq.settings'

function loadPrefs() {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const defaults = {
  industry: 'Construction & QS',
  country: 'Nigeria',
  currency: '₦ Naira (NGN)',
  standard: 'RICS / SMM7',
  language: 'English',
  dateFormat: 'DD/MM/YYYY',
  defaultRegion: 'Lagos',
}

const stored = loadPrefs()

function blankForm() {
  return {
    name: auth.user.name,
    email: auth.user.email,
    role: auth.user.role,
    company: auth.user.company,
    phone: auth.user.phone,
    ...defaults,
    ...(stored || {}),
  }
}

const form = ref(blankForm())

const passwords = ref({ current: '', next: '', confirm: '' })
const errors = ref('')

// Every field on every tab is persisted — previously only the name survived.
function save() {
  errors.value = ''
  if (!form.value.name.trim()) {
    errors.value = 'Your name cannot be empty.'
    return
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.value.email)) {
    errors.value = 'Enter a valid email address.'
    return
  }
  if (tab.value === 'security' && (passwords.value.next || passwords.value.confirm || passwords.value.current)) {
    if (passwords.value.next.length < 8) {
      errors.value = 'New password must be at least 8 characters.'
      return
    }
    if (passwords.value.next !== passwords.value.confirm) {
      errors.value = 'The new passwords do not match.'
      return
    }
    passwords.value = { current: '', next: '', confirm: '' }
    toast('Password updated')
  }

  auth.updateProfile({
    name: form.value.name.trim(),
    email: form.value.email.trim(),
    role: form.value.role,
    company: form.value.company,
    phone: form.value.phone,
  })

  const { name, email, role, company, phone, ...prefs } = form.value
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
  } catch {
    /* storage unavailable — keep in-memory only */
  }

  saved.value = true
  toast('Changes saved')
  setTimeout(() => (saved.value = false), 2000)
}

function cancel() {
  form.value = blankForm()
  passwords.value = { current: '', next: '', confirm: '' }
  errors.value = ''
  toast('Changes discarded', 'info')
}

const photoInput = ref(null)
function changePhoto() {
  photoInput.value?.click()
}
function onPhotoPicked(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file) return
  if (!file.type.startsWith('image/')) {
    toast('Choose an image file', 'warning')
    return
  }
  const reader = new FileReader()
  reader.onload = () => {
    auth.updateProfile({ photo: reader.result })
    toast('Profile photo updated')
  }
  reader.readAsDataURL(file)
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
              <img v-if="auth.user.photo" :src="auth.user.photo" alt="Profile photo" class="h-20 w-20 rounded-2xl object-cover" />
              <div v-else class="grid h-20 w-20 place-items-center rounded-2xl bg-brand-gradient text-2xl font-bold text-white">{{ auth.user.avatar }}</div>
              <input ref="photoInput" type="file" accept="image/*" class="hidden" @change="onPhotoPicked" />
              <button class="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-lg border border-brand-border bg-white text-brand-muted shadow-sm hover:text-primary" title="Change photo" @click="changePhoto"><Camera class="h-4 w-4" /></button>
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
            <div><label class="label">Industry</label><input v-model="form.industry" class="input" /></div>
            <div><label class="label">Country</label>
              <select v-model="form.country" class="input"><option>Nigeria</option><option>Ghana</option><option>Kenya</option><option>South Africa</option></select>
            </div>
            <div><label class="label">Default currency</label>
              <select v-model="form.currency" class="input"><option>₦ Naira (NGN)</option><option>$ Dollar (USD)</option><option>£ Pound (GBP)</option></select>
            </div>
          </div>
        </div>

        <!-- Notifications -->
        <!-- Security -->
        <div v-else-if="tab === 'security'" class="space-y-6">
          <h3 class="font-display text-lg font-bold text-secondary">Security</h3>
          <div class="grid gap-5 sm:grid-cols-2">
            <div><label class="label">Current password</label><input v-model="passwords.current" type="password" class="input" placeholder="••••••••" /></div>
            <div></div>
            <div><label class="label">New password</label><input v-model="passwords.next" type="password" class="input" placeholder="At least 8 characters" /></div>
            <div><label class="label">Confirm password</label><input v-model="passwords.confirm" type="password" class="input" placeholder="••••••••" /></div>
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
              <select v-model="form.standard" class="input"><option>RICS / SMM7</option><option>NIQS</option><option>POMI</option><option>Metric (ISO)</option></select>
            </div>
            <div><label class="label">Language</label>
              <select v-model="form.language" class="input"><option>English</option><option>French</option></select>
            </div>
            <div><label class="label">Date format</label>
              <select v-model="form.dateFormat" class="input"><option>DD/MM/YYYY</option><option>MM/DD/YYYY</option></select>
            </div>
            <div><label class="label">Default region pricing</label>
              <select v-model="form.defaultRegion" class="input"><option>Lagos</option><option>Abuja</option><option>Port Harcourt</option><option>Kano</option></select>
            </div>
          </div>
        </div>

        <div class="mt-8 flex flex-wrap items-center justify-end gap-3 border-t border-brand-border-light pt-6">
          <p v-if="errors" class="mr-auto text-sm font-medium text-danger">{{ errors }}</p>
          <span v-if="saved" class="flex items-center gap-1.5 text-sm font-medium text-success"><Check class="h-4 w-4" /> Saved</span>
          <button class="btn-outline btn-md" @click="cancel">Cancel</button>
          <button class="btn-primary btn-md" @click="save">Save changes</button>
        </div>
      </div>
    </div>
  </div>
</template>
