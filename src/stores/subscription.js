import { defineStore } from 'pinia'

// ---------------------------------------------------------------------------
// Trial and subscription state.
// ---------------------------------------------------------------------------
// Every account starts on a 14-day free trial. When it elapses the workspace
// is locked and only the billing screen remains reachable, so the user must
// subscribe before doing any more work.
//
// This store decides what the UI shows. It is NOT a security boundary — a
// determined user can edit localStorage. The real gate is that payments are
// verified server-side (see api/paystack/verify.js), so an unpaid account can
// never obtain a valid subscription record. Once a backend exists, this state
// should be read from the server on login rather than from the browser.
// ---------------------------------------------------------------------------

const SUB_KEY = 'buildq.subscription'

export const TRIAL_DAYS = 14
const DAY = 24 * 60 * 60 * 1000

// Naira per month. Mirrors the public pricing page.
export const PLANS = [
  { name: 'Starter', price: 18000, blurb: 'Freelance surveyors', seats: 2, credits: 500, storage: 10 },
  { name: 'Professional', price: 54000, blurb: 'Construction companies', seats: 10, credits: 2000, storage: 100 },
  { name: 'Enterprise', price: null, blurb: 'Large firms & government', seats: 'Unlimited', credits: 'Unlimited', storage: 1000 },
]

function load() {
  try {
    const raw = localStorage.getItem(SUB_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const saved = load()

export const useSubscriptionStore = defineStore('subscription', {
  state: () => ({
    // 'trialing' | 'active' | 'expired'
    status: saved?.status || 'trialing',
    plan: saved?.plan || null,
    trialStartedAt: saved?.trialStartedAt || new Date().toISOString(),
    // Set when a verified payment comes back.
    currentPeriodEnd: saved?.currentPeriodEnd || null,
    payments: saved?.payments || [],
  }),

  getters: {
    trialEndsAt: (s) => new Date(new Date(s.trialStartedAt).getTime() + TRIAL_DAYS * DAY),

    /** Whole days left in the trial; 0 once it has run out. */
    trialDaysLeft() {
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

    /** The one question the rest of the app asks. */
    hasAccess() {
      if (this.status === 'active') return !this.subscriptionExpired
      if (this.status === 'trialing') return this.trialDaysLeft > 0
      return false
    },

    isTrialing() {
      return this.status === 'trialing' && this.trialDaysLeft > 0
    },

    /** Nudge harder in the last stretch of the trial. */
    trialUrgency() {
      const d = this.trialDaysLeft
      if (d === 0) return 'over'
      if (d <= 3) return 'critical'
      if (d <= 7) return 'warning'
      return 'calm'
    },

    currentPlan: (s) => PLANS.find((p) => p.name === s.plan) || null,

    renewsOn: (s) => (s.currentPeriodEnd ? new Date(s.currentPeriodEnd) : null),
  },

  actions: {
    /** Re-evaluate on load and on each navigation, so day 15 locks the app. */
    refresh() {
      if (this.status === 'trialing' && this.trialDaysLeft === 0) {
        this.status = 'expired'
        this._persist()
      }
      if (this.status === 'active' && this.subscriptionExpired) {
        this.status = 'expired'
        this._persist()
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
    },

    /** Used by the demo reset in billing, and by sign-out of a fresh account. */
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
