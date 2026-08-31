<script setup>
import { ref, computed, onMounted } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { User, Lock, Check, ArrowLeft, Building2, AlertTriangle } from 'lucide-vue-next'
import { useTeamStore } from '@/stores/team'
import { useAuthStore } from '@/stores/auth'

// ---------------------------------------------------------------------------
// Where an invited teammate lands from the emailed link:
//   /auth/accept-invite?token=…
//
// The invitation carries the email address and the role, so neither is asked
// for. What differs is whether that address already has a BuildQ account:
//
//   no account   choose a name and password — the account is created inside
//                the inviting company.
//   has one      enter that account's password — it is verified and the person
//                moves into the inviting company.
//
// A BuildQ account belongs to exactly one organization, so the second path is a
// move. The server refuses it when the existing account has a real workspace of
// its own, rather than stranding that work.
// ---------------------------------------------------------------------------

const route = useRoute()
const router = useRouter()
const team = useTeamStore()
const auth = useAuthStore()

const token = computed(() => String(route.query.token || ''))

const invite = ref(null)
const lookupError = ref('')
const loadingInvite = ref(true)

const name = ref('')
const password = ref('')
const confirm = ref('')
const submitting = ref(false)
const error = ref('')
const done = ref(null)

const hasAccount = computed(() => Boolean(invite.value?.hasAccount))

onMounted(async () => {
  if (!token.value) {
    loadingInvite.value = false
    return
  }
  try {
    invite.value = await team.lookupInvite(token.value)
    name.value = invite.value.name || ''
    if (invite.value.alreadyAMember) {
      lookupError.value = `You are already a member of ${invite.value.organization}. Sign in to continue.`
    }
  } catch (err) {
    lookupError.value = err.message || 'This invitation is invalid, has expired, or has already been used.'
  } finally {
    loadingInvite.value = false
  }
})

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
  if (submitting.value) return
  error.value = ''

  // Creating an account has rules to meet; signing in with an existing one only
  // has to match what is already stored.
  if (!hasAccount.value) {
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
  } else if (!password.value) {
    error.value = 'Enter the password for your existing BuildQ account.'
    return
  }

  submitting.value = true
  try {
    const res = await team.acceptInvite({
      token: token.value,
      ...(hasAccount.value ? {} : { name: name.value.trim() }),
      password: password.value,
    })
    done.value = res

    // Sign straight in so they land in the workspace they just joined.
    try {
      await auth.login(res.email, password.value)
      router.replace('/app/dashboard')
    } catch {
      /* The account is in place; they can sign in by hand. */
    }
  } catch (err) {
    error.value = err.message || 'This invitation could not be accepted.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div>
    <!-- No token: the link was mistyped or truncated by a mail client. -->
    <div v-if="!token">
      <h1 class="font-display text-2xl font-bold text-secondary">This invitation link is incomplete</h1>
      <p class="mt-1.5 text-sm text-brand-muted">
        Open the link straight from the invitation email. If it keeps failing, ask whoever invited you to send it again.
      </p>
      <RouterLink to="/auth/login" class="btn-outline btn-md mt-8 w-full">
        <ArrowLeft class="h-4 w-4" /> Go to sign in
      </RouterLink>
    </div>

    <p v-else-if="loadingInvite" class="py-16 text-center text-sm text-brand-muted">Checking your invitation…</p>

    <div v-else-if="lookupError">
      <h1 class="font-display text-2xl font-bold text-secondary">We couldn't use that invitation</h1>
      <p class="mt-1.5 text-sm text-brand-muted">{{ lookupError }}</p>
      <RouterLink to="/auth/login" class="btn-primary btn-md mt-8 w-full">Go to sign in</RouterLink>
    </div>

    <div v-else-if="done" class="text-center">
      <div class="mx-auto grid h-16 w-16 place-items-center rounded-full bg-success/10 text-success">
        <Check class="h-8 w-8" />
      </div>
      <h1 class="mt-5 font-display text-2xl font-bold text-secondary">You're in</h1>
      <p class="mt-2 text-sm text-brand-muted">
        <span class="font-semibold text-secondary">{{ done.email }}</span> is now part of
        <span class="font-semibold text-secondary">{{ invite.organization }}</span>.
      </p>
      <RouterLink to="/auth/login" class="btn-primary btn-md mt-8 w-full">Sign in</RouterLink>
    </div>

    <div v-else>
      <h1 class="font-display text-2xl font-bold text-secondary">Join {{ invite.organization }}</h1>
      <p class="mt-1.5 text-sm text-brand-muted">
        You've been invited as <span class="font-semibold text-secondary">{{ invite.role }}</span>.
      </p>

      <div class="mt-5 flex items-center gap-3 rounded-2xl border border-brand-border-light bg-brand-bg p-4">
        <div class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <Building2 class="h-5 w-5" />
        </div>
        <div class="min-w-0">
          <p class="truncate text-sm font-semibold text-secondary">{{ invite.organization }}</p>
          <p class="truncate text-xs text-brand-muted">{{ invite.email }}</p>
        </div>
      </div>

      <!-- Moving an existing account is a one-way step; say so before they do it. -->
      <p v-if="hasAccount" class="mt-4 flex gap-2 rounded-xl border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-brand-muted">
        <AlertTriangle class="mt-0.5 h-4 w-4 shrink-0 text-warning" />
        <span>
          This email already has a BuildQ account. Confirm its password to join
          {{ invite.organization }} — an account belongs to one company at a time, so you'll move across.
        </span>
      </p>

      <form class="mt-6 space-y-5" @submit.prevent="accept">
        <div v-if="!hasAccount">
          <label class="label">Full name</label>
          <div class="relative">
            <User class="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-light" />
            <input v-model="name" class="input pl-10" placeholder="Your full name" autocomplete="name" required />
          </div>
        </div>

        <div>
          <label class="label">{{ hasAccount ? 'Your BuildQ password' : 'Password' }}</label>
          <div class="relative">
            <Lock class="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-light" />
            <input v-model="password" type="password" class="input pl-10"
              :placeholder="hasAccount ? 'The password you already use' : 'Create a strong password'"
              :autocomplete="hasAccount ? 'current-password' : 'new-password'" required />
          </div>
          <div v-if="!hasAccount && password" class="mt-2 flex items-center gap-2">
            <div class="flex flex-1 gap-1">
              <div v-for="i in 4" :key="i" class="h-1.5 flex-1 rounded-full transition-colors" :class="i <= strength ? strengthColor[strength] : 'bg-brand-border'"></div>
            </div>
            <span class="text-xs font-medium text-brand-muted">{{ strengthLabel[strength] }}</span>
          </div>
        </div>

        <div v-if="!hasAccount">
          <label class="label">Confirm password</label>
          <div class="relative">
            <Lock class="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-light" />
            <input v-model="confirm" type="password" autocomplete="new-password" class="input pl-10" placeholder="Type it again" required />
          </div>
        </div>

        <p v-if="error" class="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm font-medium text-danger">
          {{ error }}
        </p>

        <button type="submit" class="btn-primary btn-md w-full" :disabled="submitting">
          {{ submitting ? 'Joining…' : hasAccount ? `Sign in and join ${invite.organization}` : 'Create account and join' }}
        </button>
      </form>

      <p class="mt-6 text-center text-xs text-brand-light">This invitation expires {{ new Date(invite.expiresAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'long' }) }}.</p>
    </div>
  </div>
</template>
