import { defineStore } from 'pinia'

const AUTH_KEY = 'buildq.auth'

const defaultUser = {
  name: 'Dammie Adetunji',
  email: 'adetunjidammie2@gmail.com',
  role: 'Quantity Surveyor',
  company: 'Adetunji & Associates',
  phone: '+234 801 234 5678',
  avatar: 'DA',
  plan: 'Professional',
}

// Initials are derived from the name so the avatar never goes stale after an edit.
export function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '??'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function load() {
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    if (!raw) return null
    const saved = JSON.parse(raw)
    return { user: { ...defaultUser, ...saved.user }, isAuthenticated: !!saved.isAuthenticated }
  } catch {
    return null
  }
}

const persisted = load()

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: persisted ? persisted.user : { ...defaultUser },
    // Demo starts signed in, but a real sign-out survives a reload.
    isAuthenticated: persisted ? persisted.isAuthenticated : true,
  }),
  actions: {
    login(email) {
      this.isAuthenticated = true
      if (email) this.user.email = email
      this._persist()
    },
    logout() {
      this.isAuthenticated = false
      this._persist()
    },
    updateProfile(patch = {}) {
      Object.assign(this.user, patch)
      if (patch.name) this.user.avatar = initials(patch.name)
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
