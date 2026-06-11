<script setup>
import { ref, computed } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { User, Mail, Lock, Building2, ArrowRight, Check } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()
const form = ref({ name: '', email: '', company: '', password: '' })
const loading = ref(false)

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

function submit() {
  loading.value = true
  setTimeout(() => {
    auth.login(form.value.email)
    if (form.value.name) auth.user.name = form.value.name
    router.push('/app/dashboard')
  }, 700)
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
          <input v-model="form.name" class="input pl-10" placeholder="Dammie Adetunji" required />
        </div>
      </div>

      <div>
        <label class="label">Work email</label>
        <div class="relative">
          <Mail class="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-light" />
          <input v-model="form.email" type="email" class="input pl-10" placeholder="you@company.com" required />
        </div>
      </div>

      <div>
        <label class="label">Company <span class="text-brand-light">(optional)</span></label>
        <div class="relative">
          <Building2 class="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-light" />
          <input v-model="form.company" class="input pl-10" placeholder="Your company" />
        </div>
      </div>

      <div>
        <label class="label">Password</label>
        <div class="relative">
          <Lock class="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-light" />
          <input v-model="form.password" type="password" class="input pl-10" placeholder="Create a strong password" required />
        </div>
        <div v-if="form.password" class="mt-2 flex items-center gap-2">
          <div class="flex flex-1 gap-1">
            <div v-for="i in 4" :key="i" class="h-1.5 flex-1 rounded-full transition-colors" :class="i <= strength ? strengthColor[strength] : 'bg-brand-border'"></div>
          </div>
          <span class="text-xs font-medium text-brand-muted">{{ strengthLabel[strength] }}</span>
        </div>
      </div>

      <button type="submit" class="btn-primary btn-md w-full" :disabled="loading">
        <span v-if="!loading" class="flex items-center gap-2">Create account <ArrowRight class="h-4 w-4" /></span>
        <span v-else>Creating account…</span>
      </button>
    </form>

    <p class="mt-4 text-center text-xs text-brand-light">
      By signing up you agree to our <a href="#" class="text-primary hover:underline">Terms</a> and <a href="#" class="text-primary hover:underline">Privacy Policy</a>.
    </p>

    <p class="mt-6 text-center text-sm text-brand-muted">
      Already have an account?
      <RouterLink to="/auth/login" class="font-semibold text-primary hover:underline">Sign in</RouterLink>
    </p>
  </div>
</template>
