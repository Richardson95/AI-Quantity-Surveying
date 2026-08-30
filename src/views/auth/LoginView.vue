<script setup>
import { ref } from 'vue'
import { RouterLink, useRouter, useRoute } from 'vue-router'
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

// Return to whatever page bounced us here, when it was an in-app path.
function destination() {
  const r = route.query.redirect
  return typeof r === 'string' && r.startsWith('/app') ? r : '/app/dashboard'
}

const email = ref('')
const password = ref('')
const show = ref(false)
const loading = ref(false)
const error = ref('')

async function submit() {
  if (loading.value) return
  error.value = ''

  if (!email.value.trim() || !password.value) {
    error.value = 'Enter your email and password.'
    return
  }

  loading.value = true
  try {
    await auth.login(email.value.trim(), password.value)
    router.replace(destination())
  } catch (err) {
    // The server answers identically whether the email or the password was
    // wrong, so this screen cannot be used to find out who has an account.
    error.value = err.message || 'Could not sign in.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div>
    <h1 class="font-display text-2xl font-bold text-secondary">Welcome back</h1>
    <p class="mt-1.5 text-sm text-brand-muted">Sign in to continue to your workspace.</p>

    <form class="mt-8 space-y-5" @submit.prevent="submit">
      <div>
        <label class="label">Email address</label>
        <div class="relative">
          <Mail class="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-light" />
          <input v-model="email" type="email" autocomplete="username" class="input pl-10" placeholder="you@company.com" required />
        </div>
      </div>

      <div>
        <div class="flex items-center justify-between">
          <label class="label">Password</label>
          <RouterLink to="/auth/reset" class="text-xs font-semibold text-primary hover:underline">Forgot password?</RouterLink>
        </div>
        <div class="relative">
          <Lock class="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-light" />
          <input v-model="password" :type="show ? 'text' : 'password'" autocomplete="current-password" class="input px-10" placeholder="••••••••" required />
          <button type="button" class="absolute right-3 top-1/2 -translate-y-1/2 text-brand-light hover:text-brand-muted" @click="show = !show">
            <component :is="show ? EyeOff : Eye" class="h-4 w-4" />
          </button>
        </div>
      </div>

      <p v-if="error" class="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm font-medium text-danger">
        {{ error }}
      </p>

      <button type="submit" class="btn-primary btn-md w-full" :disabled="loading">
        <span v-if="!loading" class="flex items-center gap-2">Sign in <ArrowRight class="h-4 w-4" /></span>
        <span v-else>Signing in…</span>
      </button>
    </form>

    <p class="mt-8 text-center text-sm text-brand-muted">
      Don't have an account?
      <RouterLink to="/auth/signup" class="font-semibold text-primary hover:underline">Sign up free</RouterLink>
    </p>
  </div>
</template>
