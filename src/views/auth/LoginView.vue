<script setup>
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()
const email = ref('adetunjidammie2@gmail.com')
const password = ref('demo1234')
const show = ref(false)
const loading = ref(false)

function submit() {
  loading.value = true
  setTimeout(() => {
    auth.login(email.value)
    router.push('/app/dashboard')
  }, 600)
}

function googleLogin() {
  auth.login()
  router.push('/app/dashboard')
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
          <input v-model="email" type="email" class="input pl-10" placeholder="you@company.com" required />
        </div>
      </div>

      <div>
        <div class="flex items-center justify-between">
          <label class="label">Password</label>
          <RouterLink to="/auth/reset" class="text-xs font-semibold text-primary hover:underline">Forgot password?</RouterLink>
        </div>
        <div class="relative">
          <Lock class="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-light" />
          <input v-model="password" :type="show ? 'text' : 'password'" class="input px-10" placeholder="••••••••" required />
          <button type="button" class="absolute right-3 top-1/2 -translate-y-1/2 text-brand-light hover:text-brand-muted" @click="show = !show">
            <component :is="show ? EyeOff : Eye" class="h-4 w-4" />
          </button>
        </div>
      </div>

      <label class="flex items-center gap-2 text-sm text-brand-muted">
        <input type="checkbox" class="h-4 w-4 rounded border-brand-border text-primary focus:ring-primary" checked />
        Keep me signed in
      </label>

      <button type="submit" class="btn-primary btn-md w-full" :disabled="loading">
        <span v-if="!loading" class="flex items-center gap-2">Sign in <ArrowRight class="h-4 w-4" /></span>
        <span v-else>Signing in…</span>
      </button>
    </form>

    <div class="my-6 flex items-center gap-4">
      <div class="h-px flex-1 bg-brand-border"></div>
      <span class="text-xs text-brand-light">OR</span>
      <div class="h-px flex-1 bg-brand-border"></div>
    </div>

    <button class="btn-outline btn-md w-full" @click="googleLogin">
      <svg class="h-4 w-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"/><path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"/></svg>
      Continue with Google
    </button>

    <p class="mt-8 text-center text-sm text-brand-muted">
      Don't have an account?
      <RouterLink to="/auth/signup" class="font-semibold text-primary hover:underline">Sign up free</RouterLink>
    </p>
  </div>
</template>
