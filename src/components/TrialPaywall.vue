<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { Lock, Check, Sparkles, CreditCard, ShieldCheck, LogOut } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useSubscriptionStore, PLANS, TRIAL_DAYS } from '@/stores/subscription'
import { useToast } from '@/composables/useToast'
import { pay, isConfigured } from '@/utils/paystack'
import { formatFull } from '@/utils/format'

// ---------------------------------------------------------------------------
// Shown over the workspace once the free trial ends.
// ---------------------------------------------------------------------------
// Deliberately has no close button, ignores Escape and ignores clicks on the
// backdrop: paying is the only way past it. The workspace stays visible behind
// so the user can see their own projects are still there.
// ---------------------------------------------------------------------------

const auth = useAuthStore()
const subscription = useSubscriptionStore()
const { toast } = useToast()
const router = useRouter()

const paying = ref('')
const visible = computed(() => !subscription.hasAccess)

async function choosePlan(plan) {
  if (plan.price === null) {
    toast('Our sales team will contact you about Enterprise', 'info')
    return
  }
  if (!isConfigured()) {
    toast('Payments are not configured yet — add your Paystack public key.', 'warning')
    return
  }
  if (paying.value) return

  paying.value = plan.name
  const result = await pay({
    email: auth.user.email,
    amountNaira: plan.price,
    purpose: 'SUB',
    metadata: { plan: plan.name, company: auth.user.company },
  })
  paying.value = ''

  if (!result.ok) {
    if (!result.cancelled) toast(result.error, 'warning')
    return
  }

  // Only reached once the reference has been verified server-side.
  subscription.activate({ plan: plan.name, reference: result.reference, amount: plan.price })
  auth.updateProfile({ plan: plan.name })
  toast(`${plan.name} active — welcome back.`)
}

function signOut() {
  auth.logout()
  router.push('/auth/login')
}

// Escape must not dismiss this.
function swallowEscape(e) {
  if (e.key === 'Escape' && visible.value) {
    e.preventDefault()
    e.stopPropagation()
  }
}

// Stop the workspace behind from scrolling while it is locked.
watch(
  visible,
  (locked) => {
    if (typeof document === 'undefined') return
    document.body.style.overflow = locked ? 'hidden' : ''
  },
  { immediate: true }
)

onMounted(() => document.addEventListener('keydown', swallowEscape, true))
onBeforeUnmount(() => {
  document.removeEventListener('keydown', swallowEscape, true)
  if (typeof document !== 'undefined') document.body.style.overflow = ''
})
</script>

<template>
  <div
    v-if="visible"
    class="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto bg-secondary/70 p-4 backdrop-blur-md sm:items-center"
    role="dialog"
    aria-modal="true"
    aria-labelledby="paywall-title"
  >
    <div class="my-auto w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-card-hover">
      <!-- Header -->
      <div class="relative overflow-hidden bg-navy-gradient p-6 text-center sm:p-8">
        <div class="absolute inset-0 bg-hero-glow"></div>
        <div class="relative">
          <div class="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white/10 text-primary-light">
            <Lock class="h-7 w-7" />
          </div>
          <h2 id="paywall-title" class="mt-4 font-display text-2xl font-extrabold text-white sm:text-3xl">
            Your free trial has ended
          </h2>
          <p class="mx-auto mt-3 max-w-lg text-sm text-white/70">
            Your {{ TRIAL_DAYS }}-day trial is over. Choose a plan to unlock your workspace —
            your projects, BOQs and estimates are all still here, exactly as you left them.
          </p>
          <p class="mt-4 inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-xs text-white/80">
            <ShieldCheck class="h-4 w-4 shrink-0 text-primary-light" />
            Secure payment by Paystack · cancel anytime
          </p>
        </div>
      </div>

      <!-- Plans -->
      <div class="grid gap-4 p-6 sm:p-8 lg:grid-cols-3">
        <div
          v-for="p in PLANS"
          :key="p.name"
          class="card flex flex-col p-5"
          :class="p.name === 'Professional' ? 'ring-2 ring-primary' : ''"
        >
          <span v-if="p.name === 'Professional'" class="badge mb-3 self-start bg-brand-gradient text-white">
            <Sparkles class="h-3 w-3" /> Most popular
          </span>
          <h3 class="font-display text-lg font-bold text-secondary">{{ p.name }}</h3>
          <p class="text-sm text-brand-muted">{{ p.blurb }}</p>
          <p class="mt-4 font-display text-2xl font-extrabold text-secondary">
            {{ p.price === null ? 'Custom' : formatFull(p.price) }}
            <span v-if="p.price !== null" class="text-sm font-medium text-brand-light">/mo</span>
          </p>
          <ul class="mt-4 flex-1 space-y-2 text-sm text-brand-muted">
            <li class="flex items-start gap-2"><Check class="mt-0.5 h-4 w-4 shrink-0 text-success" /> {{ p.credits }} AI credits / month</li>
            <li class="flex items-start gap-2"><Check class="mt-0.5 h-4 w-4 shrink-0 text-success" /> {{ p.seats }} team seats</li>
            <li class="flex items-start gap-2"><Check class="mt-0.5 h-4 w-4 shrink-0 text-success" /> {{ p.storage }} GB storage</li>
            <li class="flex items-start gap-2"><Check class="mt-0.5 h-4 w-4 shrink-0 text-success" /> Unlimited projects &amp; BOQs</li>
          </ul>
          <button class="btn-primary btn-md mt-5" :disabled="!!paying" @click="choosePlan(p)">
            <CreditCard class="h-4 w-4" />
            {{
              paying === p.name
                ? 'Opening Paystack…'
                : p.price === null
                  ? 'Contact sales'
                  : `Pay ${formatFull(p.price)}`
            }}
          </button>
        </div>
      </div>

      <!-- Footer: no dismiss, only sign out -->
      <div class="flex flex-wrap items-center justify-between gap-3 border-t border-brand-border-light bg-brand-bg px-6 py-4">
        <p class="text-xs text-brand-muted">
          Signed in as <span class="font-semibold text-secondary">{{ auth.user.email }}</span>
        </p>
        <button class="btn btn-ghost btn-sm text-brand-muted" @click="signOut">
          <LogOut class="h-4 w-4" /> Sign out
        </button>
      </div>
    </div>
  </div>
</template>
