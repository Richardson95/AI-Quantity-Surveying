import { defineStore } from 'pinia'
import { api, ApiError } from '@/services/api'
import { roleLabel, roleSlug } from '@/stores/auth'

// ---------------------------------------------------------------------------
// The workspace team — active members and outstanding invitations.
// ---------------------------------------------------------------------------
// Seats are a real limit, enforced by the server: an invitation past the plan's
// allowance is refused, and a pending invite counts against the allowance the
// moment it is sent. `seats` mirrors that so the screen can show the ceiling
// before the user hits it.
//
// Presence is not tracked anywhere, so `online` is always false rather than a
// fabricated green dot.
// ---------------------------------------------------------------------------


export const useTeamStore = defineStore('team', {
  state: () => ({
    team: [],
    counts: {},
    seats: { used: 0, limit: null, remaining: null },
    loading: false,
    error: null,
    loaded: false,
  }),

  getters: {
    members: (s) => s.team.filter((m) => m.status === 'Active'),
    invitations: (s) => s.team.filter((m) => m.status === 'Invited'),
    seatsFull: (s) => s.seats.limit !== null && s.seats.remaining === 0,
  },

  actions: {
    async fetch({ force = false } = {}) {
      if (this.loaded && !force) return this.team

      this.loading = true
      this.error = null
      try {
        const data = await api.get('/team')
        this.team = data.team || []
        this.counts = data.counts || {}
        this.seats = data.seats || { used: 0, limit: null, remaining: null }
        this.loaded = true
        return this.team
      } catch (err) {
        this.error = err instanceof ApiError ? err.message : 'Could not load the team.'
        throw err
      } finally {
        this.loading = false
      }
    },

    /** `role` is the UI label; the API takes the slug. */
    async invite({ name, email, role }) {
      const res = await api.post('/team/invitations', {
        name: name.trim(),
        email: email.trim(),
        role: roleSlug(role),
      })
      await this.fetch({ force: true })
      return res.invitation ?? res
    },

    async resendInvite(id) {
      return api.post('/team/invitations/' + id + '/resend', {})
    },

    async revokeInvite(id) {
      await api.del('/team/invitations/' + id)
      this.team = this.team.filter((m) => m.id !== id)
      await this.fetch({ force: true })
    },

    async updateMemberRole(id, role) {
      const res = await api.patch('/team/members/' + id, { role: roleSlug(role) })
      const i = this.team.findIndex((m) => m.id === id)
      if (i !== -1) this.team[i] = res.member ?? { ...this.team[i], role, roleSlug: roleSlug(role) }
      return res.member ?? this.team[i]
    },

    async removeMember(id) {
      await api.del('/team/members/' + id)
      this.team = this.team.filter((m) => m.id !== id)
      await this.fetch({ force: true })
    },

    /** Accepting an invitation is public — the invitee has no account yet. */
    async acceptInvite({ token, name, password }) {
      return api.post('/team/invitations/accept', {
        token,
        ...(name ? { name } : {}),
        password,
      })
    },
  },
})

export { roleLabel, roleSlug }
