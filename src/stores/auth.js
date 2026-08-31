import { defineStore } from 'pinia'
import { api, setToken, getToken, ApiError } from '@/services/api'
import { useSubscriptionStore } from '@/stores/subscription'

const AUTH_KEY = 'buildq.auth'

// Initials are derived from the name so the avatar never goes stale after an edit.
export function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '??'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// The four workspace roles, mapped between the server's slugs and the labels
// the UI shows.
const ROLE_LABELS = {
  admin: 'Company Admin',
  qs: 'Quantity Surveyor',
  pm: 'Project Manager',
  client_viewer: 'Client Viewer',
}
const ROLE_SLUGS = Object.fromEntries(Object.entries(ROLE_LABELS).map(([k, v]) => [v, k]))

export const roleLabel = (slug) => ROLE_LABELS[slug] || slug
export const roleSlug = (label) => ROLE_SLUGS[label] || label

// Server user + organization → the shape the views already read.
function toViewUser(user, organization) {
  return {
    name: user.name,
    email: user.email,
    role: roleLabel(user.role),
    company: organization?.name || '',
    phone: user.phone || '',
    avatar: initials(user.name),
    photo: user.photoUrl || '',
    plan: null, // filled in from the subscription
  }
}

function load() {
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    if (!raw) return null
    const saved = JSON.parse(raw)
    return { user: saved.user, isAuthenticated: !!saved.isAuthenticated }
  } catch {
    return null
  }
}

const persisted = load()

// There is no such thing as "signed in by default": a token has to exist.
const initialAuth = Boolean(getToken())

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: persisted?.user ?? { name: '', email: '', role: '', company: '', phone: '', avatar: '', photo: '', plan: null },
    isAuthenticated: initialAuth,
    organization: null,
    // False until fetchMe() has answered, so the router can wait rather than
    // bouncing a signed-in user to the login screen on a hard refresh.
    ready: false,
    error: null,

    // Set when the session came from BRG Prime rather than a BuildQ signup.
    // BRG Prime has no company name and no BuildQ password, so the UI prompts
    // for both once.
    linkedFrom: null,
    needsCompanyName: false,
    needsPassword: false,
  }),

  getters: {},

  actions: {
    /** Sign in. */
    async login(email, password) {
      this.error = null

      try {
        const data = await api.post('/auth/login', { email, password })
        this._adopt(data)
        return data
      } catch (err) {
        this.error = err instanceof ApiError ? err.message : 'Could not sign in.'
        throw err
      }
    },

    async signup({ name, email, company, password }) {
      this.error = null

      try {
        const data = await api.post('/auth/signup', { name, email, company, password })
        this._adopt(data)
        return data
      } catch (err) {
        this.error = err instanceof ApiError ? err.message : 'Could not create your account.'
        throw err
      }
    },

    /**
     * Arriving from BRG Prime.
     *
     * BuildQ is served at brgprime.com/boq, so it shares an origin with the
     * BRG Prime app and can read the token it already stored. That is why no
     * token is ever put in the URL — query strings leak through history,
     * referrers and server logs.
     *
     * The server decides whether that token means anything; this only offers
     * it. Failure is silent: the user simply sees the BuildQ login screen.
     */
    async tryExchangeFromBrgPrime() {
      if (getToken()) return null

      let brgToken = null
      try {
        brgToken = localStorage.getItem('user_token')
      } catch {
        return null
      }
      if (!brgToken) return null

      try {
        const data = await api.post('/auth/exchange', { token: brgToken })
        this._adopt(data)
        // The UI uses these to ask for the two things BRG Prime cannot supply.
        this.needsCompanyName = Boolean(data.needsCompanyName)
        this.needsPassword = Boolean(data.needsPassword)
        this.linkedFrom = data.linkedFrom || null
        return data
      } catch {
        return null
      }
    },

    /** Re-reads the session from the server. The paywall depends on this. */
    async fetchMe() {
      if (!getToken()) {
        // No BuildQ session — but the visitor may have arrived from BRG Prime.
        const linked = await this.tryExchangeFromBrgPrime()
        if (linked) {
          this.ready = true
          return linked
        }
        this.isAuthenticated = false
        this.ready = true
        return null
      }
      try {
        const data = await api.get('/auth/me')
        this._adopt(data)
        return data
      } catch {
        this.isAuthenticated = false
        setToken('')
        return null
      } finally {
        this.ready = true
      }
    },

    async requestPasswordReset(email) {
      return api.post('/auth/password/reset-request', { email })
    },

    async resetPassword(token, password) {
      const data = await api.post('/auth/password/reset', { token, password })
      if (data.token) setToken(data.token)
      return data
    },

    async changePassword(currentPassword, newPassword) {
      const data = await api.post('/auth/password/change', { currentPassword, newPassword })
      if (data.token) setToken(data.token)
      return data
    },

    async logout() {
      if (getToken()) {
        try {
          await api.post('/auth/logout')
        } catch {
          /* signing out locally matters more than the round trip succeeding */
        }
      }
      setToken('')
      this.isAuthenticated = false
      this.organization = null
      this._persist()
    },

    async updateProfile(patch = {}) {
      // Applied locally first so the UI stays responsive; the server is the
      // authority and its response wins.
      Object.assign(this.user, patch)
      if (patch.name) this.user.avatar = initials(patch.name)
      this._persist()

      const body = {}
      if (patch.name !== undefined) body.name = patch.name
      if (patch.email !== undefined) body.email = patch.email
      if (patch.phone !== undefined) body.phone = patch.phone
      if (patch.company !== undefined) body.company = patch.company
      if (patch.role !== undefined) body.role = roleSlug(patch.role)
      // Organization-wide settings; the server refuses these from a non-admin.
      if (patch.industry !== undefined) body.industry = patch.industry
      if (patch.country !== undefined) body.country = patch.country
      if (patch.currency !== undefined) body.currency = patch.currency
      if (!Object.keys(body).length) return null

      const data = await api.patch('/auth/me', body)
      this._adopt(data)
      return data
    },

    async uploadPhoto(file) {
      const data = await api.upload('/auth/me/photo', file, {}, 'photo')
      this.user.photo = data.photoUrl
      this._persist()
      return data
    },

    /** Takes a server session response and makes it the current session. */
    _adopt(data) {
      if (data.token) setToken(data.token)

      this.user = toViewUser(data.user, data.organization)
      this.organization = data.organization
      this.isAuthenticated = true
      this.ready = true

      // The subscription is server-driven — this is what closes the paywall
      // bypass described in §16.
      if (data.subscription) {
        const subscription = useSubscriptionStore()
        subscription.hydrate(data.subscription)
        this.user.plan = data.subscription.plan
      }

      this._persist()
    },

    _persist() {
      try {
        localStorage.setItem(AUTH_KEY, JSON.stringify({ user: this.user, isAuthenticated: this.isAuthenticated }))
      } catch {
        /* storage unavailable — keep in-memory only */
      }
    },
  },
})
