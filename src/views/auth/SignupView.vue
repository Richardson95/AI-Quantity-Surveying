<script setup>
import { ref, computed } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { User, Mail, Lock, Building2, ArrowRight } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()
const form = ref({ name: '', email: '', company: '', password: '' })
const loading = ref(false)
const error = ref('')
const fieldErrors = ref({})

const strength = computed(() => {
  const p = form.value.password
  let s = 0
  if (p.length >= 8) s++
  if (/[A-Z]/.test(p)) s++
  if (/[0-9]/.test(p)) s++
  if (/[^A-Za-z0-9]/.test(p)) s++
  return s
})
const strengthLabel = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong']
const strengthColor = ['bg-brand-border', 'bg-danger', 'bg-warning', 'bg-primary', 'bg-success']

async function submit() {
  if (loading.value) return
  error.value = ''
  fieldErrors.value = {}

  // The server enforces all of this again; checking here saves a round trip
  // and puts the message next to the field it belongs to.
  if (form.value.name.trim().length < 2) {
    fieldErrors.value.name = 'Enter your full name.'
    return
  }
  if (form.value.company.trim().length < 2) {
    fieldErrors.value.company = 'Enter your company name.'
    return
  }
  if (strength.value < 4) {
    fieldErrors.value.password = 'Use at least 8 characters, with an uppercase letter, a number and a symbol.'
    return
  }

  loading.value = true
  try {
    // Creates the organization, its first admin and the 14-day trial, and
    // returns a session — signing in separately is not needed.
    await auth.signup({
      name: form.value.name.trim(),
      email: form.value.email.trim(),
      company: form.value.company.trim(),
      password: form.value.password,
    })
    router.replace('/app/dashboard')
  } catch (err) {
    // The server returns per-field messages; show them where they belong.
    fieldErrors.value = err.fields || {}
    if (!Object.keys(fieldErrors.value).length) {
      error.value = err.message || 'Could not create your account.'
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div>
    <h1 class="font-display text-2xl font-bold text-secondary">Create your account</h1>
    <p class="mt-1.5 text-sm text-brand-muted">Start your 14-day free trial. No credit card required.</p>

    <form class="mt-8 space-y-4" @submit.prevent="submit">
      <div>
        <label class="label">Full name</label>
        <div class="relative">
          <User class="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-light" />
          <input v-model="form.name" class="input pl-10" placeholder="Your full name" autocomplete="name" required />
        </div>
        <p v-if="fieldErrors.name" class="mt-1.5 text-xs font-medium text-danger">{{ fieldErrors.name }}</p>
      </div>

      <div>
        <label class="label">Work email</label>
        <div class="relative">
          <Mail class="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-light" />
          <input v-model="form.email" type="email" class="input pl-10" placeholder="you@company.com" autocomplete="email" required />
        </div>
        <p v-if="fieldErrors.email" class="mt-1.5 text-xs font-medium text-danger">{{ fieldErrors.email }}</p>
      </div>

      <div>
        <label class="label">Company</label>
        <div class="relative">
          <Building2 class="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-light" />
          <input v-model="form.company" class="input pl-10" placeholder="Your company" autocomplete="organization" required />
        </div>
        <p v-if="fieldErrors.company" class="mt-1.5 text-xs font-medium text-danger">{{ fieldErrors.company }}</p>
        <p v-else class="mt-1.5 text-xs text-brand-light">This becomes your workspace name.</p>
      </div>

      <div>
        <label class="label">Password</label>
        <div class="relative">
          <Lock class="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-light" />
          <input v-model="form.password" type="password" class="input pl-10" placeholder="Create a strong password" autocomplete="new-password" required />
        </div>
        <p v-if="fieldErrors.password" class="mt-1.5 text-xs font-medium text-danger">{{ fieldErrors.password }}</p>
        <div v-if="form.password" class="mt-2 flex items-center gap-2">
          <div class="flex flex-1 gap-1">
            <div v-for="i in 4" :key="i" class="h-1.5 flex-1 rounded-full transition-colors" :class="i <= strength ? strengthColor[strength] : 'bg-brand-border'"></div>
          </div>
          <span class="text-xs font-medium text-brand-muted">{{ strengthLabel[strength] }}</span>
        </div>
      </div>

      <p v-if="error" class="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm font-medium text-danger">
        {{ error }}
      </p>

      <button type="submit" class="btn-primary btn-md w-full" :disabled="loading">
        <span v-if="!loading" class="flex items-center gap-2">Create account <ArrowRight class="h-4 w-4" /></span>
        <span v-else>Creating account…</span>
      </button>
    </form>

    <p class="mt-4 text-center text-xs text-brand-light">
      By signing up you agree to our
      <RouterLink to="/terms" class="text-primary hover:underline">Terms</RouterLink> and
      <RouterLink to="/privacy" class="text-primary hover:underline">Privacy Policy</RouterLink>.
    </p>

    <p class="mt-6 text-center text-sm text-brand-muted">
      Already have an account?
      <RouterLink to="/auth/login" class="font-semibold text-primary hover:underline">Sign in</RouterLink>
    </p>
  </div>
</template>
