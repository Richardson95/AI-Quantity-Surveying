import { defineStore } from 'pinia'
import { api, ApiError, API_BASE } from '@/services/api'

// ---------------------------------------------------------------------------
// Uploaded drawings, plans and project documents.
// ---------------------------------------------------------------------------
// Files go to the server, which stores them under authenticated
// delivery and queues an analysis job for the formats the engine can actually
// read. Downloads and previews come back as short-lived signed URLs, so nothing
// is ever served from a permanent public link.
//
// A document is a real stored file, not a browser blob: it survives a cleared
// cache and is visible to the whole team.
// ---------------------------------------------------------------------------

export const ACCEPTED_TYPES =
  '.pdf,.dwg,.dxf,.rvt,.ifc,.png,.jpg,.jpeg,.xlsx,.xls,.csv,.docx,.doc'

export const MAX_FILE_MB = 25

const EXT_KIND = {
  pdf: 'Drawing', dwg: 'CAD', dxf: 'CAD', rvt: 'BIM', ifc: 'BIM',
  png: 'Image', jpg: 'Image', jpeg: 'Image',
  xlsx: 'Spreadsheet', xls: 'Spreadsheet', csv: 'Spreadsheet',
  docx: 'Document', doc: 'Document',
}

export function extOf(name) {
  const m = String(name).toLowerCase().match(/\.([a-z0-9]+)$/)
  return m ? m[1] : 'file'
}

export function kindOf(name) {
  return EXT_KIND[extOf(name)] || 'File'
}

export function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return '—'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB'
  return (bytes / 1024 / 1024).toFixed(1) + ' MB'
}

export const useDocumentsStore = defineStore('documents', {
  state: () => ({
    docs: [],
    // Which scopes have been fetched, so a screen switch does not re-request.
    loadedScopes: [],
    loading: false,
    error: null,
    // jobId -> setTimeout handle, so polling can be cancelled on teardown.
    watching: {},
  }),

  getters: {
    // `scope` is a project id, or 'library' for files not tied to a project.
    forScope: (s) => (scope) => s.docs.filter((d) => d.scope === scope),
    drawingsFor: (s) => (scope) =>
      s.docs.filter((d) => d.scope === scope && ['Drawing', 'CAD', 'BIM', 'Image'].includes(d.kind)),
    byId: (s) => (id) => s.docs.find((d) => d.id === id),
    totalFor: (s) => (scope) => s.docs.filter((d) => d.scope === scope).length,
    analysing: (s) => s.docs.filter((d) => d.status === 'Analyzing').length,
  },

  actions: {
    /** Loads one project's documents. Safe to call on every mount. */
    async fetchForScope(scope, { force = false } = {}) {
      if (!scope || scope === 'library') return this.forScope(scope)
      if (this.loadedScopes.includes(scope) && !force) return this.forScope(scope)

      this.loading = true
      this.error = null
      try {
        const data = await api.get('/projects/' + scope + '/documents')
        const incoming = (data.documents || []).map((d) => ({ ...d, scope }))
        // Replace only this scope's rows, so another project's stay put.
        this.docs = [...this.docs.filter((d) => d.scope !== scope), ...incoming]
        if (!this.loadedScopes.includes(scope)) this.loadedScopes.push(scope)
        // Anything still being read gets followed through to a result.
        for (const d of incoming) {
          if (d.status === 'Analyzing') this.watchDocument(d.id)
        }
        return this.forScope(scope)
      } catch (err) {
        this.error = err instanceof ApiError ? err.message : 'Could not load documents.'
        throw err
      } finally {
        this.loading = false
      }
    },

    /**
     * Validate and store one browser File.
     * Returns { ok, doc, error } so the caller can report per-file problems.
     */
    async addFile(file, { scope = 'library', uploadedBy = 'You' } = {}) {
      if (!file) return { ok: false, error: 'No file provided' }

      const ext = extOf(file.name)
      const allowed = ACCEPTED_TYPES.split(',').map((t) => t.replace('.', ''))
      if (!allowed.includes(ext)) {
        return { ok: false, error: `${file.name}: .${ext} files aren't supported` }
      }
      if (file.size > MAX_FILE_MB * 1024 * 1024) {
        return { ok: false, error: `${file.name} is larger than ${MAX_FILE_MB} MB` }
      }
      if (this.docs.some((d) => d.scope === scope && d.name === file.name && d.size === file.size)) {
        return { ok: false, error: `${file.name} has already been uploaded here` }
      }

      if (!scope || scope === 'library') {
        return { ok: false, error: 'Choose a project before uploading.' }
      }

      try {
        const res = await api.upload('/projects/' + scope + '/documents', file)
        const doc = { ...res.document, scope }
        this.docs.unshift(doc)
        // The server says plainly when it cannot read a format, rather than
        // guessing quantities from the file name.
        if (res.analysisJobId) this.watchJob(res.analysisJobId, doc.id)
        return { ok: true, doc, notice: res.notice || null, analysable: res.analysable }
      } catch (err) {
        return {
          ok: false,
          error:
            err instanceof ApiError
              ? `${file.name}: ${err.message}`
              : `${file.name} could not be uploaded`,
        }
      }
    },

    async addFiles(fileList, opts = {}) {
      const added = []
      const errors = []
      const notices = []
      for (const file of Array.from(fileList || [])) {
        const res = await this.addFile(file, opts)
        if (res.ok) {
          added.push(res.doc)
          if (res.notice) notices.push(res.notice)
        } else {
          errors.push(res.error)
        }
      }
      return { added, errors, notices }
    },

    // --- Analysis job polling ---------------------------------------------
    /**
     * Follows one analysis job to a result. The worker runs server-side, so
     * this only asks; it never decides that a drawing was understood.
     */
    watchJob(jobId, documentId, { attempt = 0 } = {}) {
      if (this.watching[jobId]) return

      // Whatever happens, the row must not be left spinning on "Analyzing"
      // forever. Stopping the poll means asking the server what the document's
      // status actually is — a stuck spinner reads as "still working" when the
      // truth may be "could not read this drawing".
      const stop = async () => {
        delete this.watching[jobId]
        await this.refreshDocument(documentId)
      }

      let consecutiveErrors = 0

      const tick = async () => {
        try {
          const job = await api.get('/analyze/' + jobId)
          consecutiveErrors = 0
          if (job.status === 'succeeded' || job.status === 'failed') {
            await stop()
            return
          }
        } catch {
          // A dropped request or a rate-limit reply is not a verdict on the
          // job. Keep asking; only a run of failures means give up.
          consecutiveErrors += 1
          if (consecutiveErrors >= 5) {
            await stop()
            return
          }
        }
        // Back off gently, and give up rather than polling a stuck job forever.
        attempt += 1
        if (attempt > 40) {
          await stop()
          return
        }
        this.watching[jobId] = setTimeout(tick, Math.min(2000 + attempt * 500, 8000))
      }

      this.watching[jobId] = setTimeout(tick, 2000)
    },

    /** Watches whatever job is currently attached to a document. */
    async watchDocument(documentId) {
      try {
        const data = await api.get('/documents/' + documentId)
        if (data.analysis && ['queued', 'running'].includes(data.analysis.status)) {
          this.watchJob(data.analysis.id, documentId)
        } else {
          this._merge(documentId, data.document, {
            analysisError: data.analysis?.error || null,
          })
        }
      } catch {
        /* the document may have been deleted underneath us */
      }
    },

    async refreshDocument(documentId) {
      try {
        const data = await api.get('/documents/' + documentId)
        this._merge(documentId, data.document, { analysisError: data.analysis?.error || null })
        return data
      } catch {
        return null
      }
    },

    /** Stops every outstanding poll. Screens call this on unmount. */
    stopWatching() {
      for (const id of Object.keys(this.watching)) clearTimeout(this.watching[id])
      this.watching = {}
    },

    // --- Reading a stored file --------------------------------------------
    /**
     * A short-lived signed URL for the original bytes. Returns null when the
     * server could not produce one.
     */
    async downloadUrl(doc) {
      if (!doc) return null
      try {
        const data = await api.get('/documents/' + doc.id + '/download')
        return data.url || null
      } catch {
        return null
      }
    },

    /**
     * A preview URL, or null with a reason. There is no server-side renderer
     * for CAD and BIM formats, so this reports that rather than returning a
     * link that would break.
     */
    async previewUrl(doc) {
      if (!doc) return { url: null, notice: 'Nothing to preview.' }
      try {
        const res = await api.get('/documents/' + doc.id + '/preview')
        // The server streams the bytes itself now, and returns a path relative
        // to the API root rather than a Cloudinary link — that link came back
        // as an attachment, so browsers downloaded it instead of showing it.
        if (res.url && res.relative) return { ...res, url: API_BASE + res.url }
        return res
      } catch {
        return { url: null, notice: 'That preview could not be produced.' }
      }
    },

    async rename(id, name) {
      const clean = String(name || '').trim()
      if (!clean) return
      const res = await api.patch('/documents/' + id, { name: clean })
      this._merge(id, res.document)
    },

    async remove(id) {
      try {
        await api.del('/documents/' + id)
      } catch {
        /* already gone server-side — dropping it locally is still correct */
      }
      this.docs = this.docs.filter((d) => d.id !== id)
    },

    /** Replaces one row in place, keeping the scope the list is grouped by. */
    _merge(id, incoming, extra = {}) {
      if (!incoming) return
      const i = this.docs.findIndex((d) => d.id === id)
      if (i === -1) return
      this.docs[i] = { ...incoming, ...extra, scope: this.docs[i].scope }
    },

  },
})
