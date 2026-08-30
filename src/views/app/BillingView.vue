<script setup>
import { ref, computed, onMounted } from 'vue'
import { Check, Sparkles, CreditCard, Download, Zap, X, ShieldCheck } from 'lucide-vue-next'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import { useSubscriptionStore, PLAN_BLURBS, TRIAL_DAYS } from '@/stores/subscription'
import { useBillingStore } from '@/stores/billing'
import { formatFull } from '@/utils/format'

const auth = useAuthStore()
const { toast } = useToast()
const route = useRoute()
const router = useRouter()
const subscription = useSubscriptionStore()
const billing = useBillingStore()

const paying = ref('')

onMounted(async () => {
  subscription.refresh()
  await billing.fetchAll()

  // Coming back from Paystack. The reference is in the URL; the server decides
  // whether it was paid, for how much, and what it bought — the browser only
  // hands it over.
  const reference = route.query.reference || route.query.trxref
  if (reference) {
    paying.value = 'verifying'
    try {
      await billing.verifyPayment(String(reference))
      toast('Payment confirmed — thank you.')
    } catch (err) {
      toast(err.message || 'That payment could not be confirmed', 'warning')
    } finally {
      paying.value = ''
      // Strip the reference so a refresh does not re-verify it.
      router.replace({ query: {} })
    }
  }
})

// Plans come from the server where it has them, so the price charged and the
// price shown are the same number.
const plans = computed(() =>
  billing.plans.map((p) => ({
    name: p.name,
    id: p.id,
    price: p.price,
    seats: p.seats ?? 'Unlimited',
    credits: p.credits ?? 'Unlimited',
    storage: p.storage,
    selfServe: p.selfServe,
    blurb: PLAN_BLURBS[p.name] || '',
  }))
)
const currentPlan = computed(
  () => plans.value.find((p) => p.name === subscription.plan || p.id === subscription.plan) || null
)

const planOpen = ref(false)

function manage() {
  planOpen.value = true
}
function upgrade() {
  planOpen.value = true
}

async function choosePlan(plan) {
  if (plan.price === null || plan.selfServe === false) {
    planOpen.value = false
    toast('Our sales team will contact you about Enterprise', 'info')
    return
  }
  if (subscription.status === 'active' && plan.name === subscription.plan) {
    toast(`You are already on ${plan.name}`, 'info')
    return
  }
  if (paying.value) return

  // The SERVER starts the transaction. It generates the reference, records the
  // payment as pending against this organization, and decides the amount — so a
  // tampered browser cannot pay a price it chose. We only follow the
  // authorization URL it hands back.
  if (!billing.paystackConfigured) {
    toast('Payments are not configured on the server yet.', 'warning')
    return
  }

  paying.value = plan.name
  try {
    const payment = await billing.startCheckout(plan.id || plan.name.toLowerCase())
    if (!payment?.authorizationUrl) {
      toast('Could not start that payment. Please try again.', 'warning')
      return
    }
    window.location.href = payment.authorizationUrl
  } catch (err) {
    toast(err.message || 'Could not start that payment', 'warning')
  } finally {
    paying.value = ''
  }
}

async function cancelSubscription() {
  try {
    const res = await billing.cancel()
    toast(
      res.accessUntil
        ? `Cancelled. Access continues until ${new Date(res.accessUntil).toLocaleDateString('en-NG')}.`
        : 'Subscription cancelled.',
      'info'
    )
  } catch (err) {
    toast(err.message || 'That subscription could not be cancelled', 'warning')
  }
}

async function downloadInvoice(inv) {
  // The server builds the receipt from the stored payment.
  const blob = await billing.invoiceUrl(inv.id).catch(() => null)
  if (!blob) {
    toast(`${inv.id} could not be fetched`, 'warning')
    return
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${inv.id}.txt`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
  toast(`Downloading ${inv.id}`)
}

// Allowances follow the plan you are actually on, and the figures are the ones
// the server enforces against — an exhausted credit balance is what blocks the
// next AI call, so the number here and the number there cannot disagree.
const usage = computed(() => {
  const u = billing.usage
  if (!u) return []
  return [
    { label: 'AI Credits', used: u.credits.used, total: u.credits.limit ?? 'Unlimited', unit: '' },
    { label: 'Storage', used: u.storage.usedGb, total: u.storage.limitGb ?? 'Unlimited', unit: ' GB' },
    { label: 'Team Seats', used: u.seats.used, total: u.seats.limit ?? 'Unlimited', unit: '' },
  ]
})

// Only real verified payments appear. An empty list means nothing has been
// charged yet, which is the truth — it used to show four invented ₦54,000
// invoices to an account that had never paid anything.
const invoices = computed(() =>
  billing.invoices.map((p) => ({
    id: p.id,
    date: p.paidAt
      ? new Date(p.paidAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
      : '—',
    amount: p.amount,
    status: 'Paid',
    purpose: p.purpose,
  }))
)

function pct(u, t) {
  return typeof t === 'number' ? Math.round((u / t) * 100) : 0
}
</script>

<template>
  <div>
    <div class="space-y-6">
      <div>
        <h2 class="font-display text-2xl font-bold text-secondary">Billing & Subscription</h2>
        <p class="mt-1 text-brand-muted">Manage your plan, usage and invoices</p>
      </div>

      <!-- Trial countdown -->
      <div v-if="subscription.isTrialing" class="card flex flex-wrap items-center gap-4 border-l-4 border-l-primary p-5">
        <div class="min-w-0 flex-1">
          <p class="font-semibold text-secondary">
            {{ subscription.trialDaysLeft }} {{ subscription.trialDaysLeft === 1 ? 'day' : 'days' }} left in your free trial
          </p>
          <p class="mt-0.5 text-sm text-brand-muted">
            Ends {{ subscription.trialEndsAt.toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' }) }}.
            Subscribe before then to keep working without interruption.
          </p>
        </div>
        <button class="btn-primary btn-md" @click="planOpen = true"><CreditCard class="h-4 w-4" /> Subscribe</button>
      </div>

      <!-- Current plan -->
      <div class="relative overflow-hidden rounded-2xl bg-navy-gradient p-6 sm:p-8">
        <div class="absolute inset-0 bg-hero-glow"></div>
        <div class="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span class="badge bg-white/10 text-primary-light">
              <Sparkles class="h-3 w-3" /> {{ subscription.status === 'active' ? 'Current plan' : 'Free trial' }}
            </span>
            <h3 class="mt-3 font-display text-3xl font-extrabold text-white">
              {{ subscription.status === 'active' ? subscription.plan : 'Trial' }}
            </h3>
            <p class="mt-1 text-white/60">
              <template v-if="subscription.status === 'active' && currentPlan.price">
                {{ formatFull(currentPlan.price) }} / month · renews
                {{ subscription.renewsOn.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) }}
              </template>
              <template v-else-if="subscription.isTrialing">
                No card required · {{ subscription.trialDaysLeft }} of {{ TRIAL_DAYS }} days remaining
              </template>
              <template v-else>Custom pricing · managed by your success manager</template>
            </p>
          </div>
          <div class="flex gap-2">
            <!-- Cancelling is not a refund: access continues to the end of the
                 period already paid for, which is what the server does. -->
            <button v-if="subscription.status === 'active'" class="btn border border-white/20 text-white hover:bg-white/10 btn-md" :disabled="billing.working" @click="cancelSubscription">
              Cancel plan
            </button>
            <button v-else class="btn border border-white/20 text-white hover:bg-white/10 btn-md" @click="manage">Manage</button>
            <button class="btn-primary btn-md" @click="upgrade"><Zap class="h-4 w-4" /> Upgrade</button>
          </div>
        </div>
      </div>

      <!-- Usage -->
      <div class="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <div v-for="u in usage" :key="u.label" class="card p-5">
          <p class="text-sm text-brand-muted">{{ u.label }}</p>
          <p class="mt-1 font-display text-xl font-bold text-secondary">
            {{ u.used.toLocaleString() }}<span class="text-sm font-medium text-brand-light"> / {{ u.total }}{{ u.unit }}</span>
          </p>
          <div v-if="typeof u.total === 'number'" class="mt-3 h-1.5 overflow-hidden rounded-full bg-brand-border">
            <div class="h-full rounded-full bg-brand-gradient" :style="{ width: pct(u.used, u.total) + '%' }"></div>
          </div>
          <p v-else class="mt-3 text-xs font-medium text-success">Unlimited on your plan</p>
        </div>
      </div>

      <div class="grid gap-6 lg:grid-cols-3">
        <!-- Payment method -->
        <div class="card p-6">
          <h3 class="font-display font-bold text-secondary">Payment Method</h3>
          <div class="mt-4 rounded-xl border border-brand-border-light p-4">
            <div class="flex items-center gap-3">
              <div class="grid h-10 w-14 place-items-center rounded-lg bg-secondary text-white"><ShieldCheck class="h-5 w-5" /></div>
              <div class="min-w-0">
                <p class="font-semibold text-secondary">Paystack</p>
                <p class="text-xs text-brand-light">Card details are entered on Paystack, never stored here</p>
              </div>
            </div>
          </div>
          <button class="btn-outline btn-md mt-4 w-full" @click="planOpen = true">
            <CreditCard class="h-4 w-4" /> Change plan
          </button>
        </div>

        <!-- Invoices -->
        <div class="card overflow-hidden lg:col-span-2">
          <div class="border-b border-brand-border-light p-5">
            <h3 class="font-display font-bold text-secondary">Invoices</h3>
          </div>
          <p v-if="!invoices.length" class="px-5 py-12 text-center text-sm text-brand-muted">
            No payments yet. Invoices appear here once a charge has been verified.
          </p>
          <div v-else class="divide-y divide-brand-border-light">
            <div v-for="inv in invoices" :key="inv.id" class="flex flex-col gap-3 px-5 py-3.5 hover:bg-brand-bg sm:flex-row sm:items-center sm:gap-4">
              <div class="flex min-w-0 flex-1 items-center gap-4">
                <div class="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary-dark text-xs font-bold">TXT</div>
                <div class="min-w-0">
                  <p class="truncate font-mono text-sm font-semibold text-secondary">{{ inv.id }}</p>
                  <p class="text-xs text-brand-light">
                    {{ inv.date }}<template v-if="inv.purpose"> · {{ inv.purpose.replace(/_/g, ' ') }}</template>
                  </p>
                </div>
              </div>
              <div class="flex items-center gap-3 pl-[52px] sm:pl-0">
                <span class="font-semibold text-secondary">₦{{ inv.amount.toLocaleString() }}</span>
                <span class="badge whitespace-nowrap bg-success/10 text-success"><Check class="h-3 w-3" /> {{ inv.status }}</span>
                <button class="ml-auto grid h-9 w-9 shrink-0 place-items-center rounded-lg text-brand-light hover:bg-brand-border-light hover:text-primary sm:ml-0" @click="downloadInvoice(inv)"><Download class="h-4 w-4" /></button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Change plan -->
    <transition name="page">
      <div v-if="planOpen" class="fixed inset-0 z-[60] flex items-end justify-center bg-secondary/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" @click.self="planOpen = false">
        <div class="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-card-hover sm:rounded-2xl">
          <div class="flex items-center justify-between border-b border-brand-border-light px-6 py-4">
            <h3 class="font-display text-lg font-bold text-secondary">Change your plan</h3>
            <button class="btn btn-ghost btn-sm" @click="planOpen = false"><X class="h-5 w-5" /></button>
          </div>
          <div class="flex-1 overflow-y-auto p-6">
          <!-- The server flags its own prices as placeholders; carry that
               through rather than presenting them as settled. -->
          <p v-for="n in billing.planNotes" :key="n.text" class="mb-4 rounded-xl border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-brand-muted">
            {{ n.text }}
          </p>
          <div class="grid gap-4 sm:grid-cols-3">
            <div v-for="p in plans" :key="p.name" class="card flex flex-col p-5"
              :class="subscription.status === 'active' && p.name === subscription.plan ? 'ring-2 ring-primary' : ''">
              <h4 class="font-display font-bold text-secondary">{{ p.name }}</h4>
              <p class="text-xs text-brand-muted">{{ p.blurb }}</p>
              <p class="mt-3 font-display text-2xl font-extrabold text-secondary">
                {{ p.price === null ? 'Custom' : '₦' + p.price.toLocaleString() }}
                <span v-if="p.price !== null" class="text-sm font-medium text-brand-light">/mo</span>
              </p>
              <ul class="mt-4 flex-1 space-y-2 text-sm text-brand-muted">
                <li class="flex items-start gap-2"><Check class="mt-0.5 h-4 w-4 shrink-0 text-success" /> {{ p.credits }} AI credits</li>
                <li class="flex items-start gap-2"><Check class="mt-0.5 h-4 w-4 shrink-0 text-success" /> {{ p.seats }} team seats</li>
                <li class="flex items-start gap-2"><Check class="mt-0.5 h-4 w-4 shrink-0 text-success" /> {{ p.storage }} GB storage</li>
              </ul>
              <button class="btn-md mt-5" :disabled="paying === p.name"
                :class="subscription.status === 'active' && p.name === subscription.plan ? 'btn-outline' : 'btn-primary'"
                @click="choosePlan(p)">
                <template v-if="paying === p.name">Opening Paystack…</template>
                <template v-else-if="subscription.status === 'active' && p.name === subscription.plan">Current plan</template>
                <template v-else-if="p.price === null">Contact sales</template>
                <template v-else><CreditCard class="h-4 w-4" /> Pay {{ formatFull(p.price) }}</template>
              </button>
            </div>
          </div>
          </div>
        </div>
      </div>
    </transition>

  </div>
</template>
