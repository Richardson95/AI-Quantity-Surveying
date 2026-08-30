import { defineStore } from 'pinia'
import { api, ApiError } from '@/services/api'
import { normalizeUnit } from '@/utils/units'

// ---------------------------------------------------------------------------
// Cost data the user supplies themselves.
// ---------------------------------------------------------------------------
// The AI estimate is one opinion. Firms almost always have their own priced
// schedules — a subcontractor quote, a historic BOQ, a supplier price list —
// and need to price against those instead of, or alongside, the model. This
// store holds cost lines imported from a CSV so they can be compared with the
// AI figure and pushed into the rate analysis.
//
// The CSV is parsed server-side and the lines belong to a project, so they
// survive a cleared browser and are visible to the whole team. Nothing is
// seeded — every line here was uploaded by the firm itself.
// ---------------------------------------------------------------------------

export const useCostsStore = defineStore('costs', {
  state: () => ({
    lines: [],
    loading: false,
    error: null,
    loadedProjectId: null,
  }),
  getters: {
    count: (s) => s.lines.length,
    sources: (s) => [...new Set(s.lines.map((l) => l.source))],
    // Only lines that carry a quantity can contribute to a total.
    pricedTotal: (s) => s.lines.reduce((a, l) => a + (l.qty > 0 ? l.qty * l.rate : 0), 0),
    pricedCount: (s) => s.lines.filter((l) => l.qty > 0).length,
    bySection: (s) => {
      const map = {}
      for (const l of s.lines) {
        const key = l.section || 'Uncategorised'
        map[key] = (map[key] || 0) + (l.qty > 0 ? l.qty * l.rate : 0)
      }
      return map
    },
  },
  actions: {
    async fetchForProject(projectId, { force = false } = {}) {
      if (!projectId) return this.lines
      if (this.loadedProjectId === projectId && !force) return this.lines

      this.loading = true
      this.error = null
      try {
        const data = await api.get('/projects/' + projectId + '/costs')
        this.lines = data.costs || []
        this.loadedProjectId = projectId
        return this.lines
      } catch (err) {
        this.error = err instanceof ApiError ? err.message : 'Could not load your cost data.'
        throw err
      } finally {
        this.loading = false
      }
    },

    /**
     * Upload one CSV. The server parses it and reports every row it could not
     * read, so nothing is silently dropped.
     */
    async importFile(file, projectId) {
      const res = await api.upload('/projects/' + projectId + '/costs/import', file)
      await this.fetchForProject(projectId, { force: true })
      return res
    },

    async update(id, patch) {
      const line = this.lines.find((l) => l.id === id)
      const clean = { ...patch }
      if (clean.rate != null) clean.rate = Math.max(0, Number(clean.rate) || 0)
      if (clean.qty != null) clean.qty = Math.max(0, Number(clean.qty) || 0)
      if (clean.unit != null) clean.unit = normalizeUnit(clean.unit)

      // Applied locally first so the cell does not lag behind the keystroke.
      if (line) Object.assign(line, clean)
      if (clean.rate != null) clean.rate = Math.round(clean.rate)
      const res = await api.patch('/costs/' + id, clean)
      const i = this.lines.findIndex((l) => l.id === id)
      if (i !== -1) this.lines[i] = res.cost
      return res.cost
    },

    async remove(id) {
      this.lines = this.lines.filter((l) => l.id !== id)
      try {
        await api.del('/costs/' + id)
      } catch {
        /* already gone server-side */
      }
    },

    async removeSource(source, projectId = this.loadedProjectId) {
      this.lines = this.lines.filter((l) => l.source !== source)
      await api.del('/projects/' + projectId + '/costs?source=' + encodeURIComponent(source))
    },

    async clear(projectId = this.loadedProjectId) {
      this.lines = []
      await api.del('/projects/' + projectId + '/costs')
    },

  },
})
