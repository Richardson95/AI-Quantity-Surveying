<script setup>
import { Check, Sparkles, CreditCard, Download, Zap } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import { downloadMock } from '@/utils/download'

const auth = useAuthStore()
const { toast } = useToast()

function manage() { toast('Opening subscription management…', 'info') }
function upgrade() { toast('Upgrade — redirecting to checkout (mock)', 'info') }
function updateCard() { toast('Card update form (mock)', 'info') }
function downloadInvoice(inv) {
  downloadMock(`${inv.id}.txt`, `Invoice ${inv.id}\nDate: ${inv.date}\nAmount: ₦${inv.amount.toLocaleString()}\nStatus: ${inv.status}\n`)
  toast(`Downloading ${inv.id}`)
}

const usage = [
  { label: 'AI Credits', used: 1240, total: 2000, unit: '' },
  { label: 'Active Projects', used: 12, total: 'Unlimited', unit: '' },
  { label: 'Storage', used: 34, total: 100, unit: ' GB' },
  { label: 'Team Seats', used: 5, total: 10, unit: '' },
]

const invoices = [
  { id: 'INV-2026-006', date: 'Jun 1, 2026', amount: 54000, status: 'Paid' },
  { id: 'INV-2026-005', date: 'May 1, 2026', amount: 54000, status: 'Paid' },
  { id: 'INV-2026-004', date: 'Apr 1, 2026', amount: 54000, status: 'Paid' },
  { id: 'INV-2026-003', date: 'Mar 1, 2026', amount: 54000, status: 'Paid' },
]

function pct(u, t) {
  return typeof t === 'number' ? Math.round((u / t) * 100) : 0
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h2 class="font-display text-2xl font-bold text-secondary">Billing & Subscription</h2>
      <p class="mt-1 text-brand-muted">Manage your plan, usage and invoices</p>
    </div>

    <!-- Current plan -->
    <div class="relative overflow-hidden rounded-2xl bg-navy-gradient p-6 sm:p-8">
      <div class="absolute inset-0 bg-hero-glow"></div>
      <div class="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span class="badge bg-white/10 text-primary-light"><Sparkles class="h-3 w-3" /> Current plan</span>
          <h3 class="mt-3 font-display text-3xl font-extrabold text-white">{{ auth.user.plan }}</h3>
          <p class="mt-1 text-white/60">₦54,000 / month · renews Jul 1, 2026</p>
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
            <div class="grid h-10 w-14 place-items-center rounded-lg bg-secondary text-white"><CreditCard class="h-5 w-5" /></div>
            <div>
              <p class="font-semibold text-secondary">•••• •••• •••• 4242</p>
              <p class="text-xs text-brand-light">Expires 08/28</p>
            </div>
          </div>
        </div>
        <button class="btn-outline btn-md mt-4 w-full" @click="updateCard">Update card</button>
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
</template>
