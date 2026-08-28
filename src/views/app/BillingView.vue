<script setup>
import { ref, computed, onMounted } from 'vue'
import { Check, Sparkles, CreditCard, Download, Zap, X, ShieldCheck } from 'lucide-vue-next'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import { downloadMock } from '@/utils/download'
import { useSubscriptionStore, PLANS, TRIAL_DAYS } from '@/stores/subscription'
import { pay, isConfigured } from '@/utils/paystack'
import { formatFull } from '@/utils/format'

const auth = useAuthStore()
const { toast } = useToast()
const subscription = useSubscriptionStore()

const paying = ref('')

onMounted(() => subscription.refresh())

const plans = PLANS
const currentPlan = computed(() => subscription.currentPlan || PLANS[1])

const planOpen = ref(false)
const cardOpen = ref(false)

const card = ref({ number: '', name: auth.user.name, expiry: '', cvc: '' })
const cardOnFile = ref({ last4: '4242', expiry: '08/28' })
const cardError = ref('')

function manage() {
  planOpen.value = true
}
function upgrade() {
  planOpen.value = true
}

async function choosePlan(plan) {
  if (plan.price === null) {
    planOpen.value = false
    toast('Our sales team will contact you about Enterprise', 'info')
    return
  }
  if (subscription.status === 'active' && plan.name === subscription.plan) {
    toast(`You are already on ${plan.name}`, 'info')
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
  planOpen.value = false
  toast(`${plan.name} active — thank you. Renews ${subscription.renewsOn.toLocaleDateString('en-NG')}.`)
}

function updateCard() {
  // Card details are entered inside Paystack's own secure popup, never here.
  planOpen.value = true
  toast('Choose a plan to pay with — your card is entered securely on Paystack', 'info')
}

function saveCard() {
  const digits = card.value.number.replace(/\D/g, '')
  if (digits.length < 13 || digits.length > 19) {
    cardError.value = 'Enter a valid card number.'
    return
  }
  if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(card.value.expiry)) {
    cardError.value = 'Expiry must be in MM/YY format.'
    return
  }
  if (!/^\d{3,4}$/.test(card.value.cvc)) {
    cardError.value = 'CVC must be 3 or 4 digits.'
    return
  }
  cardOnFile.value = { last4: digits.slice(-4), expiry: card.value.expiry }
  cardOpen.value = false
  toast('Payment method updated')
}
function downloadInvoice(inv) {
  downloadMock(`${inv.id}.txt`, `Invoice ${inv.id}\nDate: ${inv.date}\nAmount: ₦${inv.amount.toLocaleString()}\nStatus: ${inv.status}\n`)
  toast(`Downloading ${inv.id}`)
}

// Allowances follow the plan you are actually on.
const usage = computed(() => [
  { label: 'AI Credits', used: 1240, total: currentPlan.value.credits, unit: '' },
  { label: 'Active Projects', used: 12, total: 'Unlimited', unit: '' },
  { label: 'Storage', used: 34, total: currentPlan.value.storage, unit: ' GB' },
  { label: 'Team Seats', used: 5, total: currentPlan.value.seats, unit: '' },
])

const paidInvoices = computed(() =>
  subscription.payments.map((p) => ({
    id: p.id,
    date: new Date(p.paidAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }),
    amount: p.amount,
    status: 'Paid',
  }))
)

const sampleInvoices = [
  { id: 'INV-2026-006', date: 'Jun 1, 2026', amount: 54000, status: 'Paid' },
  { id: 'INV-2026-005', date: 'May 1, 2026', amount: 54000, status: 'Paid' },
  { id: 'INV-2026-004', date: 'Apr 1, 2026', amount: 54000, status: 'Paid' },
  { id: 'INV-2026-003', date: 'Mar 1, 2026', amount: 54000, status: 'Paid' },
]

const invoices = computed(() => (paidInvoices.value.length ? paidInvoices.value : sampleInvoices))

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
            <button class="btn border border-white/20 text-white hover:bg-white/10 btn-md" @click="manage">Manage</button>
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
          <button class="btn-outline btn-md mt-4 w-full" @click="updateCard">
            <CreditCard class="h-4 w-4" /> Change plan or card
          </button>
        </div>

        <!-- Invoices -->
        <div class="card overflow-hidden lg:col-span-2">
          <div class="border-b border-brand-border-light p-5">
            <h3 class="font-display font-bold text-secondary">Invoices</h3>
          </div>
          <div class="divide-y divide-brand-border-light">
            <div v-for="inv in invoices" :key="inv.id" class="flex flex-col gap-3 px-5 py-3.5 hover:bg-brand-bg sm:flex-row sm:items-center sm:gap-4">
              <div class="flex min-w-0 flex-1 items-center gap-4">
                <div class="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary-dark text-xs font-bold">PDF</div>
                <div class="min-w-0">
                  <p class="truncate font-mono text-sm font-semibold text-secondary">{{ inv.id }}</p>
                  <p class="text-xs text-brand-light">{{ inv.date }}</p>
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
          <div class="grid flex-1 gap-4 overflow-y-auto p-6 sm:grid-cols-3">
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
    </transition>

    <!-- Update card -->
    <transition name="page">
      <div v-if="cardOpen" class="fixed inset-0 z-[60] flex items-center justify-center bg-secondary/50 p-4 backdrop-blur-sm" @click.self="cardOpen = false">
        <div class="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-card-hover">
          <div class="flex items-center justify-between border-b border-brand-border-light px-6 py-4">
            <h3 class="font-display text-lg font-bold text-secondary">Update payment method</h3>
            <button class="btn btn-ghost btn-sm" @click="cardOpen = false"><X class="h-5 w-5" /></button>
          </div>
          <form class="space-y-4 p-6" @submit.prevent="saveCard">
            <div><label class="label">Card number</label><input v-model="card.number" class="input" placeholder="4242 4242 4242 4242" inputmode="numeric" /></div>
            <div><label class="label">Name on card</label><input v-model="card.name" class="input" /></div>
            <div class="grid grid-cols-2 gap-4">
              <div><label class="label">Expiry</label><input v-model="card.expiry" class="input" placeholder="MM/YY" /></div>
              <div><label class="label">CVC</label><input v-model="card.cvc" class="input" placeholder="123" inputmode="numeric" /></div>
            </div>
            <p v-if="cardError" class="text-sm font-medium text-danger">{{ cardError }}</p>
            <p class="text-xs text-brand-light">Demo only — card details are not sent anywhere and no charge is made.</p>
            <div class="flex gap-2 pt-1">
              <button type="button" class="btn-outline btn-md flex-1" @click="cardOpen = false">Cancel</button>
              <button type="submit" class="btn-primary btn-md flex-1"><CreditCard class="h-4 w-4" /> Save card</button>
            </div>
          </form>
        </div>
      </div>
    </transition>
  </div>
</template>
