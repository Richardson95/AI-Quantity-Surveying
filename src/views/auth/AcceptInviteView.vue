<script setup>
import { ref, computed } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { User, Lock, Check, ArrowLeft } from 'lucide-vue-next'
import { useTeamStore } from '@/stores/team'
import { useAuthStore } from '@/stores/auth'

// ---------------------------------------------------------------------------
// Where an invited teammate lands from the emailed link:
//   /auth/accept-invite?token=…
//
// The invitation carries the email address and the role, so neither is asked
// for here — the invitee only chooses a name and a password. Using the link is
// what proves they control the address, so the account is created verified.
// ---------------------------------------------------------------------------

const route = useRoute()
const router = useRouter()
const team = useTeamStore()
const auth = useAuthStore()

const token = computed(() => String(route.query.token || ''))

const name = ref('')
const password = ref('')
const confirm = ref('')
const loading = ref(false)
const error = ref('')
const joinedEmail = ref('')

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

async function accept() {
  if (loading.value) return
  error.value = ''

  if (name.value.trim().length < 2) {
    error.value = 'Enter your full name.'
    return
  }
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
    const res = await team.acceptInvite({
      token: token.value,
      name: name.value.trim(),
      password: password.value,
    })
    joinedEmail.value = res.email || ''
    // The endpoint creates the account but does not sign anyone in — signing in
    // is a separate, deliberate step, so the new password is used once here to
    // prove it works rather than being taken on trust.
    try {
      await auth.login(joinedEmail.value, password.value)
      router.replace('/app/dashboard')
    } catch {
      // Account exists; they can sign in by hand.
    }
  } catch (err) {
    error.value = err.message || 'This invitation is invalid, has expired, or has already been used.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div>
    <!-- No token at all: the link was mistyped or truncated by a mail client. -->
    <div v-if="!token">
      <h1 class="font-display text-2xl font-bold text-secondary">This invitation link is incomplete</h1>
      <p class="mt-1.5 text-sm text-brand-muted">
        Open the link straight from the invitation email. If it keeps failing, ask whoever invited you to send it again.
      </p>
      <RouterLink to="/auth/login" class="btn-outline btn-md mt-8 w-full">
        <ArrowLeft class="h-4 w-4" /> Go to sign in
      </RouterLink>
    </div>

    <div v-else-if="joinedEmail" class="text-center">
      <div class="mx-auto grid h-16 w-16 place-items-center rounded-full bg-success/10 text-success">
        <Check class="h-8 w-8" />
      </div>
      <h1 class="mt-5 font-display text-2xl font-bold text-secondary">You're in</h1>
      <p class="mt-2 text-sm text-brand-muted">
        Your account for <span class="font-semibold text-secondary">{{ joinedEmail }}</span> is ready.
      </p>
      <RouterLink to="/auth/login" class="btn-primary btn-md mt-8 w-full">Sign in</RouterLink>
    </div>

    <div v-else>
      <h1 class="font-display text-2xl font-bold text-secondary">Join the workspace</h1>
      <p class="mt-1.5 text-sm text-brand-muted">
        Choose a name and password to finish setting up your account. Your email address and role come from the invitation.
      </p>

      <form class="mt-8 space-y-5" @submit.prevent="accept">
        <div>
          <label class="label">Full name</label>
          <div class="relative">
            <User class="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-light" />
            <input v-model="name" class="input pl-10" placeholder="Your full name" autocomplete="name" required />
          </div>
        </div>

        <div>
          <label class="label">Password</label>
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
          {{ loading ? 'Setting up…' : 'Join workspace' }}
        </button>
      </form>
    </div>
  </div>
</template>
