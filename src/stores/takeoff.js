import { defineStore } from 'pinia'
import { api, ApiError } from '@/services/api'
import { detectFrom } from '@/services/analysis'

// ---------------------------------------------------------------------------
// Quantity takeoff — the measurements read off a drawing, or entered by hand.
// ---------------------------------------------------------------------------
// A measurement is a raw dimension, not a work item. Two things follow from
// that and are enforced here as well as on the server:
//
//   • A figure a person typed carries NO confidence. There is nothing for a
//     machine to have been confident about.
//   • Editing a detected figure clears its confidence, because it is no longer
//     the engine's number.
//
// The list starts empty. Nothing is measured until the engine reads a drawing
// or a surveyor types a figure in.
// ---------------------------------------------------------------------------

const UNIT_FOR_TYPE = { Linear: 'm', Area: 'm²', Volume: 'm³', Count: 'no' }
const COLOR_FOR_TYPE = { Linear: '#2DC875', Area: '#1CA5F6', Volume: '#FFA726', Count: '#E63946' }


export const unitForType = (type) => UNIT_FOR_TYPE[type] || 'no'
export const colorForType = (type) => COLOR_FOR_TYPE[type] || '#1CA5F6'

export const useTakeoffStore = defineStore('takeoff', {
  state: () => ({
    measurements: [],
    loading: false,
    detecting: false,
    error: null,
    // Set once the engine has actually read a drawing.
    source: null,
    warnings: [],
    detectedScale: null,
    loadedProjectId: null,
  }),

  getters: {
    count: (s) => s.measurements.length,
    // Only a measurement with a value above zero can be priced.
    syncable: (s) => s.measurements.filter((m) => Number(m.numeric ?? 0) > 0).length,
    forDocument: (s) => (documentId) => s.measurements.filter((m) => m.documentId === documentId),
  },

  actions: {
    async fetchForProject(projectId, { force = false } = {}) {
      if (!projectId) return this.measurements
      if (this.loadedProjectId === projectId && !force) return this.measurements

      this.loading = true
      this.error = null
      try {
        const data = await api.get('/projects/' + projectId + '/measurements')
        this.measurements = data.measurements || []
        this.loadedProjectId = projectId
        return this.measurements
      } catch (err) {
        this.error = err instanceof ApiError ? err.message : 'Could not load measurements.'
        throw err
      } finally {
        this.loading = false
      }
    },

    /**
     * Reads one drawing and replaces the figures previously detected from it.
     * Anything measured by hand survives, so a re-run never discards work.
     */
    async detect(doc, projectId) {
      if (this.detecting || !doc) return null
      this.detecting = true
      this.warnings = []

      try {
        const result = await detectFrom(doc)
        this.source = result.failed ? null : 'engine'
        this.warnings = result.warnings || []
        this.detectedScale = result.scale ?? null

        // The server already stored what it read; re-read so the screen shows
        // exactly what was persisted rather than a parallel copy.
        await this.fetchForProject(projectId, { force: true })
        return result
      } finally {
        this.detecting = false
      }
    },

    /** A measurement a person typed. It carries no confidence, by design. */
    async add({ name, type, value }, { documentId, projectId } = {}) {
      const unit = unitForType(type)
      const numeric = Number(value) || 0

      if (!documentId) {
        throw new ApiError(0, {
          code: 'no_document',
          message: 'Open a drawing first — a measurement is recorded against one.',
        })
      }

      const res = await api.post('/documents/' + documentId + '/measurements', {
        name,
        type,
        value: numeric,
        unit,
        color: colorForType(type),
      })
      this.measurements.push(res.measurement)
      return res.measurement
    },

    async update(id, patch = {}) {
      const row = this.measurements.find((m) => m.id === id)
      const body = {}
      if (patch.name !== undefined) body.name = patch.name
      if (patch.type !== undefined) body.type = patch.type
      if (patch.value !== undefined) body.value = Number(patch.value) || 0
      if (patch.color !== undefined) body.color = patch.color
      if (!Object.keys(body).length) return row

      const res = await api.patch('/measurements/' + id, body)
      const i = this.measurements.findIndex((m) => m.id === id)
      if (i !== -1) this.measurements[i] = res.measurement
      return res.measurement
    },

    async remove(m) {
      const i = this.measurements.findIndex((x) => x.id === m.id)
      if (i !== -1) this.measurements.splice(i, 1)
      try {
        await api.del('/measurements/' + m.id)
      } catch {
        /* already gone server-side */
      }
    },

    reset() {
      this.measurements = []
      this.loadedProjectId = null
      this.warnings = []
    },
  },
})
