import { defineStore } from 'pinia'
import { api, ApiError } from '@/services/api'
import { useSubscriptionStore } from '@/stores/subscription'

// ---------------------------------------------------------------------------
// Billing — plans, the subscription, invoices and metered usage.
// ---------------------------------------------------------------------------
// The browser never decides that a payment succeeded. `subscribe()` without a
// reference asks the server to START a Paystack transaction and returns the
// authorization URL to redirect to; calling it again WITH the reference asks
// the server to verify that reference against Paystack and, only then, grant
// the plan. Amount and status are both checked server-side.
//
// Usage is the same snapshot the server enforces against, so the number shown
// here and the number that blocks an AI call cannot disagree.
// ---------------------------------------------------------------------------

export const useBillingStore = defineStore('billing', {
  state: () => ({
    plans: [],
    planNotes: [],
    paystackConfigured: false,
    invoices: [],
    usage: null,
    loading: false,
    working: false,
    error: null,
    loaded: false,
  }),

  getters: {
    selfServePlans: (s) => s.plans.filter((p) => p.selfServe),
    creditsLeft: (s) => s.usage?.credits?.remaining ?? null,
    creditsExhausted: (s) =>
      s.usage?.credits?.limit != null && s.usage.credits.used >= s.usage.credits.limit,
    storagePercent: (s) => {
      const u = s.usage?.storage
      if (!u || !u.limitGb) return 0
      return Math.min(100, Math.round((u.usedGb / u.limitGb) * 100))
    },
  },

  actions: {
    async fetchPlans() {
      try {
        const data = await api.get('/billing/plans')
        this.plans = data.plans || []
        // The server flags its own prices as placeholders; carry that through
        // rather than presenting them as settled.
        this.planNotes = data.notes || []
        this.paystackConfigured = Boolean(data.paystackConfigured)
      } catch {
        this.plans = []
      }
      return this.plans
    },

    async fetchInvoices() {
      try {
        const data = await api.get('/billing/invoices')
        this.invoices = data.invoices || []
      } catch {
        this.invoices = []
      }
      return this.invoices
    },

    async fetchUsage() {
      try {
        this.usage = await api.get('/billing/usage')
      } catch {
        this.usage = null
      }
      return this.usage
    },

    async fetchAll() {
      this.loading = true
      try {
        await Promise.all([this.fetchPlans(), this.fetchInvoices(), this.fetchUsage()])
        this.loaded = true
      } finally {
        this.loading = false
      }
    },

    /**
     * Start a subscription payment.
     * Returns { authorizationUrl, reference } — redirect the browser there.
     */
    async startCheckout(plan) {
      this.working = true
      try {
        const res = await api.post('/billing/subscribe', { plan })
        return res.payment
      } finally {
        this.working = false
      }
    },

    /** Verifies any reference — used when returning from the Paystack redirect. */
    async verifyPayment(reference) {
      const res = await api.post('/payments/verify', { reference })
      await useSubscriptionStore().reload()
      await this.fetchInvoices()
      return res
    },

    /**
     * Cancel. Access continues to the end of the period already paid for —
     * cancelling is not a refund, and cutting access now would take the money
     * twice.
     */
    async cancel() {
      this.working = true
      try {
        const res = await api.post('/billing/cancel', {})
        useSubscriptionStore().hydrate(res.subscription)
        return res
      } finally {
        this.working = false
      }
    },

    async invoiceUrl(reference) {
      return api.download('/billing/invoices/' + reference + '/download')
    },
  },
})
