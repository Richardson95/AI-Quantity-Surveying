<script setup>
import { ref, computed } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { Mail, Lock, ArrowLeft, Check } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'

// ---------------------------------------------------------------------------
// Two screens in one, decided by whether the URL carries a token.
// ---------------------------------------------------------------------------
//   /auth/reset             ask for the email, request a link
//   /auth/reset?token=…     the link from that email — set the new password
//
// The request half always reports success, whether or not the address exists.
// Saying "no account with that email" would turn this page into a way to find
// out who has an account, so the server refuses to and neither does this.
// ---------------------------------------------------------------------------

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const token = computed(() => String(route.query.token || ''))
const hasToken = computed(() => token.value.length > 0)

const email = ref('')
const sent = ref(false)
const loading = ref(false)
const error = ref('')

async function requestLink() {
  if (loading.value) return
  error.value = ''
  loading.value = true
  try {
    await auth.requestPasswordReset(email.value.trim())
    sent.value = true
  } catch (err) {
    error.value = err.message || 'Could not send that link. Please try again.'
  } finally {
    loading.value = false
  }
}

// --- Setting the new password ----------------------------------------------
const password = ref('')
const confirm = ref('')

const strength = computed(() => {
  const p = password.value
  let s = 0
  if (p.length >= 8) s++
  if (/[A-Z]/.test(p)) s++
  if (/[0-9]/.test(p)) s++
  if (/[^A-Za-z0-9]/.test(p)) s++
  return s
})
const strengthLabel = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong']
const strengthColor = ['bg-brand-border', 'bg-danger', 'bg-warning', 'bg-primary', 'bg-success']

async function setPassword() {
  if (loading.value) return
  error.value = ''

  if (strength.value < 4) {
    error.value = 'Use at least 8 characters, with an uppercase letter, a number and a symbol.'
    return
  }
  if (password.value !== confirm.value) {
    error.value = 'The two passwords do not match.'
    return
  }

  loading.value = true
  try {
    // Single-use: the server destroys the token and retires every outstanding
    // session, then signs this browser back in with a fresh pair.
    await auth.resetPassword(token.value, password.value)
    await auth.fetchMe()
    router.replace('/app/dashboard')
  } catch (err) {
    error.value = err.message || 'This reset link is invalid or has expired.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div>
    <RouterLink to="/auth/login" class="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-brand-muted hover:text-secondary">
      <ArrowLeft class="h-4 w-4" /> Back to sign in
    </RouterLink>

    <!-- Arrived from the emailed link -->
    <div v-if="hasToken">
      <h1 class="font-display text-2xl font-bold text-secondary">Choose a new password</h1>
      <p class="mt-1.5 text-sm text-brand-muted">
        This link can be used once. Setting a password signs you back in and ends every other session.
      </p>

      <form class="mt-8 space-y-5" @submit.prevent="setPassword">
        <div>
          <label class="label">New password</label>
          <div class="relative">
            <Lock class="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-light" />
            <input v-model="password" type="password" autocomplete="new-password" class="input pl-10" placeholder="Create a strong password" required />
          </div>
          <div v-if="password" class="mt-2 flex items-center gap-2">
            <div class="flex flex-1 gap-1">
              <div v-for="i in 4" :key="i" class="h-1.5 flex-1 rounded-full transition-colors" :class="i <= strength ? strengthColor[strength] : 'bg-brand-border'"></div>
            </div>
            <span class="text-xs font-medium text-brand-muted">{{ strengthLabel[strength] }}</span>
          </div>
        </div>

        <div>
          <label class="label">Confirm password</label>
          <div class="relative">
            <Lock class="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-light" />
            <input v-model="confirm" type="password" autocomplete="new-password" class="input pl-10" placeholder="Type it again" required />
          </div>
        </div>

        <p v-if="error" class="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm font-medium text-danger">
          {{ error }}
        </p>

        <button type="submit" class="btn-primary btn-md w-full" :disabled="loading">
          {{ loading ? 'Saving…' : 'Set password and sign in' }}
        </button>
      </form>
    </div>

    <!-- Asking for the link -->
    <div v-else-if="!sent">
      <h1 class="font-display text-2xl font-bold text-secondary">Reset your password</h1>
      <p class="mt-1.5 text-sm text-brand-muted">Enter your email and we'll send you a link to reset it.</p>

      <form class="mt-8 space-y-5" @submit.prevent="requestLink">
        <div>
          <label class="label">Email address</label>
          <div class="relative">
            <Mail class="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-light" />
            <input v-model="email" type="email" autocomplete="username" class="input pl-10" placeholder="you@company.com" required />
          </div>
        </div>

        <p v-if="error" class="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm font-medium text-danger">
          {{ error }}
        </p>

        <button type="submit" class="btn-primary btn-md w-full" :disabled="loading">
          {{ loading ? 'Sending…' : 'Send reset link' }}
        </button>
      </form>
    </div>

    <div v-else class="text-center">
      <div class="mx-auto grid h-16 w-16 place-items-center rounded-full bg-success/10 text-success">
        <Check class="h-8 w-8" />
      </div>
      <h1 class="mt-5 font-display text-2xl font-bold text-secondary">Check your inbox</h1>
      <!-- Deliberately not "we sent it to that address": the server does not
           confirm whether an account exists, and neither should this. -->
      <p class="mt-2 text-sm text-brand-muted">
        If <span class="font-semibold text-secondary">{{ email }}</span> has an account, a reset link is on its way.
        It can be used once and expires in 60 minutes.
      </p>
      <RouterLink to="/auth/login" class="btn-outline btn-md mt-8 w-full">Back to sign in</RouterLink>
    </div>
  </div>
</template>
