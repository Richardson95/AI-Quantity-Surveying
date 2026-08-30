import { defineStore } from 'pinia'
import { api, ApiError } from '@/services/api'

// ---------------------------------------------------------------------------
// Generated reports, workspace analytics and notifications.
// ---------------------------------------------------------------------------
// The analytics screen used to show three fixed figures — 72% win rate, 18.4%
// margin, 98.2% estimate accuracy. Two of those cannot be computed from
// anything the system records, so the server returns them as null with a reason
// and this store carries the reason through. A KPI with no data behind it is
// shown as unavailable, not as a number.
// ---------------------------------------------------------------------------


export const useReportsStore = defineStore('reports', {
  state: () => ({
    reports: [],
    kpis: null,
    // Why a KPI has no value, keyed by KPI name. Shown instead of a number.
    unavailable: {},
    tenders: [],
    tenderNotes: [],
    notifications: [],
    unread: 0,
    loading: false,
    generating: false,
    error: null,
    loaded: false,
  }),

  getters: {
    types: (s) => ['All', ...new Set(s.reports.map((r) => r.type))],
    hasUnread: (s) => s.unread > 0,
  },

  actions: {
    async fetch({ force = false } = {}) {
      if (this.loaded && !force) return this.reports

      this.loading = true
      this.error = null
      try {
        const data = await api.get('/reports')
        this.reports = data.reports || []
        this.loaded = true
        return this.reports
      } catch (err) {
        this.error = err instanceof ApiError ? err.message : 'Could not load reports.'
        throw err
      } finally {
        this.loading = false
      }
    },

    async fetchKpis() {
      try {
        const data = await api.get('/analytics/kpis')
        this.kpis = data.kpis || null
        this.unavailable = data.unavailable || {}
        return this.kpis
      } catch {
        return null
      }
    },

    async fetchTenders() {
      try {
        const data = await api.get('/analytics/tenders')
        this.tenders = data.tenders || []
        this.tenderNotes = data.notes || []
      } catch {
        this.tenders = []
      }
      return this.tenders
    },

    /** Builds a real file from real data. Only 'boq' and 'cost-summary' exist. */
    async generate(projectId, type = 'boq') {
      this.generating = true
      try {
        const res = await api.post('/reports/generate', { projectId, type })
        this.reports.unshift(res.report)
        return res.report
      } finally {
        this.generating = false
      }
    },

    /** A short-lived signed URL for the stored file. */
    async downloadUrl(reportId) {
      try {
        const data = await api.get('/reports/' + reportId + '/download')
        return data
      } catch {
        return null
      }
    },

    // --- Notifications ----------------------------------------------------
    async fetchNotifications() {
      try {
        const data = await api.get('/notifications')
        this.notifications = data.notifications || []
        this.unread = data.unread || 0
      } catch {
        this.notifications = []
        this.unread = 0
      }
      return this.notifications
    },

    async markRead(id) {
      const n = this.notifications.find((x) => x.id === id)
      if (n && !n.read) {
        n.read = true
        this.unread = Math.max(0, this.unread - 1)
      }
      try {
        await api.post('/notifications/' + id + '/read', {})
      } catch {
        /* the badge is not worth failing a click over */
      }
    },

    async markAllRead() {
      this.notifications.forEach((n) => { n.read = true })
      this.unread = 0
      try {
        await api.post('/notifications/read-all', {})
      } catch {
        /* as above */
      }
    },
  },
})
