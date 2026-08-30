import { defineStore } from 'pinia'
import { api, ApiError } from '@/services/api'

// ---------------------------------------------------------------------------
// Variations (change orders).
// ---------------------------------------------------------------------------
// The form collects a positive magnitude plus a direction; the record stores it
// SIGNED — negative for an omission, because an omission reduces the account.
//
// Deciding a variation is a distinct capability from raising one. The server
// enforces that (only an admin or project manager approves, and nobody decides
// their own), so a 403 here is the real answer, not a UI suggestion.
// ---------------------------------------------------------------------------


export const useVariationsStore = defineStore('variations', {
  state: () => ({
    variations: [],
    netApproved: 0,
    pending: 0,
    loading: false,
    error: null,
    loadedProjectId: null,
  }),

  getters: {
    // Net effect on the account: only approved variations count.
    approvedTotal: (s) => s.netApproved,
    pendingCount: (s) => s.pending,
    byStatus: (s) => (status) =>
      status === 'All' ? s.variations : s.variations.filter((v) => v.status === status),
  },

  actions: {
    async fetchForProject(projectId, { force = false } = {}) {
      if (!projectId) return this.variations
      if (this.loadedProjectId === projectId && !force) return this.variations

      this.loading = true
      this.error = null
      try {
        const data = await api.get('/projects/' + projectId + '/variations')
        this.variations = data.variations || []
        this.netApproved = data.netApproved || 0
        this.pending = data.pending || 0
        this.loadedProjectId = projectId
        return this.variations
      } catch (err) {
        this.error = err instanceof ApiError ? err.message : 'Could not load variations.'
        throw err
      } finally {
        this.loading = false
      }
    },

    /**
     * Raise a variation. `direction` is 'add' or 'omit'; `impact` is always the
     * positive magnitude, and the sign is applied from the direction.
     */
    async create({ title, description, impact, direction = 'add', revisionFrom, revisionTo }, projectId) {
      const magnitude = Math.abs(Number(impact) || 0)

      const res = await api.post('/projects/' + projectId + '/variations', {
        title,
        description: description || title,
        impact: magnitude,
        direction,
        ...(revisionFrom ? { revisionFrom } : {}),
        ...(revisionTo ? { revisionTo } : {}),
      })
      this.variations.unshift(res.variation)
      this.pending += 1
      return res.variation
    },

    /** Approve or reject. The server refuses a self-decision with a 403. */
    async decide(id, status, projectId) {
      const res = await api.patch('/variations/' + id, { status })
      const i = this.variations.findIndex((v) => v.id === id)
      if (i !== -1) this.variations[i] = res.variation
      // Approving moves money, so re-read the totals rather than recompute them.
      await this.fetchForProject(projectId, { force: true })
      return res.variation
    },

    async update(id, patch = {}) {
      const res = await api.patch('/variations/' + id, patch)
      const i = this.variations.findIndex((v) => v.id === id)
      if (i !== -1) this.variations[i] = res.variation
      return res.variation
    },

    async remove(id) {
      // An approved variation is part of the cost record; the server refuses to
      // delete one and asks for a reversing variation instead.
      await api.del('/variations/' + id)
      this.variations = this.variations.filter((v) => v.id !== id)
    },
  },
})
