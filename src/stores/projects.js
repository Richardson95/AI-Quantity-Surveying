import { defineStore } from 'pinia'
import { api, ApiError } from '@/services/api'
import { normalizeUnit } from '@/utils/units'

// ---------------------------------------------------------------------------
// Projects, their activity feed, and the bill of quantities.
// ---------------------------------------------------------------------------
// This store is a mirror of the server. Every action round-trips and the
// server's answer replaces what the browser holds, so two people on the same
// account see the same bill. Nothing starts populated — a project, its
// drawings and its bill exist only once someone creates them.
//
// The BOQ lives here rather than in a store of its own because four screens
// already read `store.boqItems`, and one source of truth beats a second copy.
// ---------------------------------------------------------------------------

export const SECTIONS = [
  'Substructure', 'Superstructure', 'Roofing',
  'Finishes', 'Doors & Windows', 'Services', 'External Works',
]

export const useProjectsStore = defineStore('projects', {
  state: () => ({
    projects: [],
    boqItems: [],
    activity: [],

    // Which drawings the current BOQ was generated from, and when.
    boqSources: [],
    boqGeneratedAt: null,
    // 'engine' | 'manual' — what the provenance badge reads.
    boqSource: null,
    boqRevision: null,
    boqNotes: [],
    boqSections: [],

    // The project every project-scoped screen works against.
    currentProjectId: null,

    loading: false,
    boqLoading: false,
    error: null,
    loaded: false,
  }),

  getters: {
    activeCount: (s) => s.projects.filter((p) => p.status === 'In Progress').length,
    totalBudget: (s) => s.projects.reduce((a, p) => a + (p.budget || 0), 0),
    boqTotal: (s) => s.boqItems.reduce((a, i) => a + i.qty * i.rate, 0),
    byId: (s) => (id) => s.projects.find((p) => p.id === id) || null,
    current: (s) => s.projects.find((p) => p.id === s.currentProjectId) || s.projects[0] || null,
  },

  actions: {
    // --- Projects ---------------------------------------------------------
    async fetchProjects({ force = false } = {}) {
      if (this.loaded && !force) return this.projects

      this.loading = true
      this.error = null
      try {
        const data = await api.get('/projects')
        this.projects = data.projects || []
        // Keep whatever was selected, if it survived the refresh.
        if (!this.projects.some((p) => p.id === this.currentProjectId)) {
          this.currentProjectId = this.projects[0]?.id ?? null
        }
        this.loaded = true
        return this.projects
      } catch (err) {
        this.error = err instanceof ApiError ? err.message : 'Could not load projects.'
        throw err
      } finally {
        this.loading = false
      }
    },

    /** Loads one project and makes it current. Returns null if it is gone. */
    async fetchProject(id) {
      try {
        const data = await api.get('/projects/' + id)
        const project = data.project
        const i = this.projects.findIndex((p) => p.id === project.id)
        if (i === -1) this.projects.unshift(project)
        else this.projects[i] = project
        this.currentProjectId = project.id
        return project
      } catch {
        return null
      }
    },

    /** Picks the project every project-scoped screen works against. */
    selectProject(id) {
      if (!id || id === this.currentProjectId) return this.current
      this.currentProjectId = id
      // A bill belongs to a project, so it cannot survive the switch.
      this.boqItems = []
      this.boqRevision = null
      this.boqSource = null
      this.boqNotes = []
      this.boqSections = []
      this.boqSources = []
      return this.current
    },

    /**
     * Makes sure a project is selected, loading the list if it has to.
     * Every project-scoped screen calls this on mount.
     */
    async ensureProject() {
      if (!this.loaded) await this.fetchProjects()
      return this.currentProjectId
    },

    async addProject(data = {}) {
      const res = await api.post('/projects', {
        name: data.name,
        client: data.client,
        ...(data.location ? { location: data.location } : {}),
        ...(data.type ? { type: data.type } : {}),
        ...(data.budget ? { budget: Math.round(Number(data.budget) || 0) } : {}),
      })
      this.projects.unshift(res.project)
      this.currentProjectId = res.project.id
      return res.project
    },

    async updateProject(id, patch = {}) {
      const local = this.byId(id)
      if (local) Object.assign(local, patch)

      const res = await api.patch('/projects/' + id, patch)
      const i = this.projects.findIndex((p) => p.id === id)
      if (i !== -1) this.projects[i] = res.project
      return res.project
    },

    async removeProject(id) {
      await api.del('/projects/' + id)
      this.projects = this.projects.filter((p) => p.id !== id)
      if (this.currentProjectId === id) {
        this.currentProjectId = this.projects[0]?.id ?? null
        this.boqItems = []
      }
    },

    // --- Activity ---------------------------------------------------------
    async fetchActivity(projectId = this.currentProjectId) {
      if (!projectId) return this.activity
      try {
        const data = await api.get('/projects/' + projectId + '/activity')
        this.activity = data.activity || []
      } catch {
        this.activity = []
      }
      return this.activity
    },

    async fetchSpend(projectId = this.currentProjectId) {
      if (!projectId) return null
      try {
        return await api.get('/projects/' + projectId + '/spend')
      } catch {
        return null
      }
    },

    // --- Bill of quantities -----------------------------------------------
    async fetchBoq(projectId = this.currentProjectId) {
      if (!projectId) return this.boqItems

      this.boqLoading = true
      try {
        const data = await api.get('/projects/' + projectId + '/boq')
        this.boqItems = data.items || []
        this.boqSections = data.sections || []
        this.boqNotes = data.notes || []
        this.boqSource = data.source ?? null
        this.boqRevision = data.revision ?? null
        this.boqSources = [...new Set(this.boqItems.flatMap((i) => i.sources || []))]
        this.boqGeneratedAt = data.revision?.createdAt ?? null
        return this.boqItems
      } catch (err) {
        this.error = err instanceof ApiError ? err.message : 'Could not load the bill.'
        throw err
      } finally {
        this.boqLoading = false
      }
    },

    async fetchBoqRevisions(projectId = this.currentProjectId) {
      if (!projectId) return []
      try {
        const data = await api.get('/projects/' + projectId + '/boq/revisions')
        return data.revisions || []
      } catch {
        return []
      }
    },

    /**
     * Replaces the whole BOQ with items derived from the drawings. Generating
     * already stored a revision server-side, so this only mirrors the result.
     */
    replaceBoqItems(items, meta = {}) {
      this.boqItems = items
      this.boqSources = items.length ? [...new Set(items.flatMap((i) => i.sources || []))] : []
      this.boqGeneratedAt = items.length ? new Date().toISOString() : null
      if (meta.source) this.boqSource = meta.source
      if (meta.notes) this.boqNotes = meta.notes
      if (meta.revision !== undefined) this.boqRevision = meta.revision
    },

    /**
     * Add one bill line.
     *
     * Takes the whole item, not just a section: the server validates
     * description, unit and quantity together, so there is no such thing as a
     * blank placeholder row it would accept.
     */
    async addBoqItem(data = {}, projectId = this.currentProjectId) {
      const section = SECTIONS.includes(data.section) ? data.section : 'Substructure'

      const res = await api.post('/projects/' + projectId + '/boq/items', {
        desc: data.desc,
        section,
        unit: normalizeUnit(data.unit) || data.unit,
        qty: Number(data.qty),
        rate: Math.round(Number(data.rate) || 0),
        ...(data.sources ? { sources: data.sources } : {}),
      })
      // Adding renumbers the whole bill, so re-read rather than push one row.
      await this.fetchBoq(projectId)
      if (res.notes) this.boqNotes = [...this.boqNotes, ...res.notes]
      return res.item
    },

    async updateBoqItem(id, patch = {}) {
      const item = this.boqItems.find((i) => i.id === id)
      const clean = { ...patch }
      if (clean.qty != null) clean.qty = Math.max(0, Number(clean.qty) || 0)
      if (clean.rate != null) clean.rate = Math.max(0, Number(clean.rate) || 0)
      // "m2", "SQM" and "nr" all mean something specific — store them as one.
      if (clean.unit != null) clean.unit = normalizeUnit(clean.unit)

      // Applied locally first so the table does not lag behind the keystroke.
      if (item) Object.assign(item, clean)

      // `confidence` and `sources` are the server's to set, never the client's.
      const { confidence, sources, ...body } = clean
      if (!Object.keys(body).length) return item
      if (body.rate != null) body.rate = Math.round(body.rate)

      const res = await api.patch('/boq/items/' + id, body)
      const i = this.boqItems.findIndex((x) => x.id === id)
      if (i !== -1) this.boqItems[i] = res.item
      if (res.notes) this.boqNotes = [...this.boqNotes, ...res.notes]
      return res.item
    },

    async removeBoqItem(item) {
      const i = this.boqItems.findIndex((x) => x.id === item.id)
      if (i !== -1) this.boqItems.splice(i, 1)
      await api.del('/boq/items/' + item.id)
      // Deleting renumbers the rest of the bill.
      await this.fetchBoq()
    },

    /** Pulls takeoff measurements into the bill as a new revision. */
    async importMeasurements(measurementIds = [], projectId = this.currentProjectId) {
      const res = await api.post('/projects/' + projectId + '/boq/import', {
        ...(measurementIds.length ? { measurementIds } : {}),
      })
      await this.fetchBoq(projectId)
      return res
    },

    /** The server-rendered CSV, so the export matches the stored bill exactly. */
    async exportBoq(projectId = this.currentProjectId) {
      return api.download('/projects/' + projectId + '/boq/export?format=csv')
    },
  },
})
