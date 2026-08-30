import { defineStore } from 'pinia'
import { api } from '@/services/api'

// ---------------------------------------------------------------------------
// Trial and subscription state.
// ---------------------------------------------------------------------------
// Every account starts on a 14-day free trial. When it elapses the workspace
// is locked and only the billing screen remains reachable, so the user must
// subscribe before doing any more work.
//
// This store is a MIRROR, not a source of truth. `hydrate()` copies the
// server's answer in, and `hasAccess` returns exactly what the server said.
// Editing localStorage restores nothing — the API returns 402 on every business
// endpoint regardless of what the browser believes.
// ---------------------------------------------------------------------------

const SUB_KEY = 'buildq.subscription'

export const TRIAL_DAYS = 14
const DAY = 24 * 60 * 60 * 1000

// Only the marketing copy lives here. Every price, seat count and credit
// allowance comes from GET /billing/plans — the server is what charges, so the
// server is what quotes.
export const PLAN_BLURBS = {
  Starter: 'Freelance surveyors',
  Professional: 'Construction companies',
  Enterprise: 'Large firms & government',
}

// Nothing persisted is ever trusted: the app starts locked and waits for the
// server, so a hand-edited storage entry grants nothing.
export const useSubscriptionStore = defineStore('subscription', {
  state: () => ({
    // 'trialing' | 'active' | 'expired'
    status: 'trialing',
    plan: null,
    trialStartedAt: new Date().toISOString(),
    // Set when a verified payment comes back.
    currentPeriodEnd: null,
    payments: [],

    // ─── Server-driven fields ───────────────────────────────────────────────
    serverDriven: false,
    serverHasAccess: false,
    serverTrialEndsAt: null,
    serverTrialDaysLeft: 0,
    serverUrgency: 'calm',
    // Until the server has answered, the app knows nothing.
    hydrated: false,
  }),

  getters: {
    trialEndsAt: (s) =>
      s.serverDriven && s.serverTrialEndsAt
        ? new Date(s.serverTrialEndsAt)
        : new Date(new Date(s.trialStartedAt).getTime() + TRIAL_DAYS * DAY),

    /** Whole days left in the trial; 0 once it has run out. */
    trialDaysLeft(s) {
      if (s.serverDriven) return s.serverTrialDaysLeft
      const ms = this.trialEndsAt.getTime() - Date.now()
      return ms <= 0 ? 0 : Math.ceil(ms / DAY)
    },

    trialExpired() {
      return this.status === 'trialing' && this.trialDaysLeft === 0
    },

    subscriptionExpired: (s) => {
      if (s.status !== 'active' || !s.currentPeriodEnd) return false
      return new Date(s.currentPeriodEnd).getTime() <= Date.now()
    },

    /**
     * The one question the rest of the app asks.
     * Answered by the server; the local computation is only a mirror of it.
     */
    hasAccess(s) {
      if (s.serverDriven) return s.serverHasAccess
      if (this.status === 'active') return !this.subscriptionExpired
      if (this.status === 'trialing') return this.trialDaysLeft > 0
      return false
    },

    isTrialing() {
      return this.status === 'trialing' && this.trialDaysLeft > 0
    },

    /** Nudge harder in the last stretch of the trial. */
    trialUrgency(s) {
      if (s.serverDriven) return s.serverUrgency
      const d = this.trialDaysLeft
      if (d === 0) return 'over'
      if (d <= 3) return 'critical'
      if (d <= 7) return 'warning'
      return 'calm'
    },

    currentPlan: (s) => s.plan,

    renewsOn: (s) => (s.currentPeriodEnd ? new Date(s.currentPeriodEnd) : null),
  },

  actions: {
    /**
     * Copies the server's subscription in. Called from the auth store on
     * login, signup and every /auth/me. After this the server's answer is the
     * only thing `hasAccess` consults.
     */
    hydrate(server) {
      if (!server) return
      this.serverDriven = true
      this.hydrated = true

      this.status = server.status
      this.plan = server.plan
      this.trialStartedAt = server.trialStartedAt || this.trialStartedAt
      this.currentPeriodEnd = server.currentPeriodEnd

      this.serverHasAccess = Boolean(server.hasAccess)
      this.serverTrialEndsAt = server.trialEndsAt
      this.serverTrialDaysLeft = server.trialDaysLeft ?? 0
      this.serverUrgency = server.urgency || 'calm'

      this._persist()
    },

    /** Re-evaluate on load and on each navigation, so day 15 locks the app. */
    refresh() {
      // Always ask the server rather than recomputing from the browser.
      return this.reload()
    },

    /** Pulls the current entitlement straight from the server. */
    async reload() {
      try {
        const data = await api.get('/auth/me')
        this.hydrate(data.subscription)
        return data.subscription
      } catch {
        return null
      }
    },

    /**
     * Called only after a payment has been verified server-side.
     * `reference` is kept so a charge can be traced back to Paystack.
     */
    activate({ plan, reference, amount, months = 1 }) {
      const from = this.renewsOn && this.renewsOn > new Date() ? this.renewsOn : new Date()
      const end = new Date(from.getTime())
      end.setMonth(end.getMonth() + months)

      this.status = 'active'
      this.plan = plan
      this.currentPeriodEnd = end.toISOString()
      this.payments.unshift({
        id: reference,
        plan,
        amount,
        paidAt: new Date().toISOString(),
        periodEnd: end.toISOString(),
      })
      this._persist()

      // The server has already recorded the payment, so take its version
      // rather than trusting what we just computed locally.
      this.reload()
    },

    /** Resets local state on sign-out; the server owns the real trial. */
    startTrial() {
      this.status = 'trialing'
      this.plan = null
      this.trialStartedAt = new Date().toISOString()
      this.currentPeriodEnd = null
      this._persist()
    },

    _persist() {
      try {
        localStorage.setItem(
          SUB_KEY,
          JSON.stringify({
            status: this.status,
            plan: this.plan,
            trialStartedAt: this.trialStartedAt,
            currentPeriodEnd: this.currentPeriodEnd,
            payments: this.payments,
          })
        )
      } catch {
        /* storage unavailable — session-only */
      }
    },
  },
})
