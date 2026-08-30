import { defineStore } from 'pinia'
import { api, ApiError } from '@/services/api'
import { normalizeUnit } from '@/utils/units'

// ---------------------------------------------------------------------------
// The pricing database — material, labour and equipment rates.
// ---------------------------------------------------------------------------
// Two scopes exist server-side: curated GLOBAL market rates that every account
// reads, and the firm's OWN schedule which only it can edit. The API refuses to
// edit or delete a global rate, so `scope` is what the screen must key its
// affordances off — not a guess.
//
// `change` is the % movement against an earlier recorded price. It is 0 with
// `hasHistory: false` when there is no earlier reading at all, which is not the
// same as "flat" — the screen must be able to tell those apart.
//
// The library starts EMPTY. It used to ship 21 seeded rates flagged isDemo;
// those were placeholder figures, not surveyed prices, and they have been
// removed. A firm enters or imports its own.
// ---------------------------------------------------------------------------

export const RATE_CATEGORIES = ['Materials', 'Labour', 'Equipment']


export const useRatesStore = defineStore('rates', {
  state: () => ({
    rates: [],
    regions: [],
    total: 0,
    page: 1,
    pages: 1,
    loading: false,
    error: null,
    loaded: false,
    region: 'Lagos',
  }),

  getters: {
    // A curated global rate belongs to everyone; only an own rate is editable.
    editable: () => (rate) => rate.scope !== 'global',
    byCategory: (s) => (cat) => (cat === 'All' ? s.rates : s.rates.filter((r) => r.cat === cat)),
  },

  actions: {
    async fetch({ region, cat, q, scope, page = 1, limit = 200, force = false } = {}) {
      if (this.loaded && !force && !region && !cat && !q && !scope) return this.rates

      this.loading = true
      this.error = null
      try {
        const params = new URLSearchParams()
        if (region) params.set('region', region)
        if (cat && cat !== 'All') params.set('cat', cat)
        if (q) params.set('q', q)
        if (scope && scope !== 'all') params.set('scope', scope)
        params.set('page', String(page))
        params.set('limit', String(limit))

        const data = await api.get('/rates?' + params.toString())
        this.rates = data.rates || []
        this.total = data.total || 0
        this.page = data.page || 1
        this.pages = data.pages || 1
        this.loaded = true
        if (region) this.region = region
        return this.rates
      } catch (err) {
        this.error = err instanceof ApiError ? err.message : 'Could not load the rate library.'
        throw err
      } finally {
        this.loading = false
      }
    },

    async fetchRegions() {
      try {
        const data = await api.get('/regions')
        this.regions = data.regions || []
      } catch {
        this.regions = []
      }
      return this.regions
    },

    /** A new rate always lands in the firm's own schedule, never the global one. */
    async create({ name, cat, unit, rate, region = this.region, source }) {
      const clean = {
        name: String(name).trim(),
        cat: RATE_CATEGORIES.includes(cat) ? cat : 'Materials',
        unit: normalizeUnit(unit) || 'no',
        rate: Math.round(Number(rate) || 0),
        region,
      }

      const res = await api.post('/rates', { ...clean, ...(source ? { source } : {}) })
      this.rates.unshift(res.rate)
      return res.rate
    },

    async update(id, patch = {}) {
      const local = this.rates.find((r) => r.id === id)
      const body = {}
      if (patch.name !== undefined) body.name = String(patch.name).trim()
      if (patch.cat !== undefined) body.cat = patch.cat
      if (patch.unit !== undefined) body.unit = normalizeUnit(patch.unit) || patch.unit
      if (patch.rate !== undefined) body.rate = Math.round(Number(patch.rate) || 0)
      if (patch.region !== undefined) body.region = patch.region
      if (!Object.keys(body).length) return local

      const res = await api.patch('/rates/' + id, body)
      const i = this.rates.findIndex((r) => r.id === id)
      if (i !== -1) this.rates[i] = res.rate
      return res.rate
    },

    async remove(id) {
      await api.del('/rates/' + id)
      this.rates = this.rates.filter((r) => r.id !== id)
    },

    /** Every recorded price for one rate, plus the movement since the earliest. */
    async history(id) {
      try {
        return await api.get('/rates/' + id + '/history')
      } catch {
        return { rate: null, history: [] }
      }
    },

    /**
     * CSV import. The server reports every row it could not read rather than
     * quietly dropping it, so the caller can show what was rejected and why.
     */
    async importCsv(file) {
      const res = await api.upload('/rates/import', file)
      await this.fetch({ force: true })
      return res
    },
  },
})
