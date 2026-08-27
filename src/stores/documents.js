import { defineStore } from 'pinia'

// ---------------------------------------------------------------------------
// Uploaded drawings, plans and project documents.
// ---------------------------------------------------------------------------
// Files are read in the browser (no backend yet). Metadata always persists;
// the file body is only persisted when it is small enough to sit comfortably
// in localStorage, so a big DWG still works for the session but does not blow
// the storage quota. Anything without a stored body still downloads a
// generated placeholder rather than failing silently.
// ---------------------------------------------------------------------------

const DOCS_KEY = 'buildq.documents'

// Per-file cap for persisting the actual bytes, and an overall budget.
const PERSIST_FILE_LIMIT = 1_200_000 // ~1.2 MB of base64
const PERSIST_TOTAL_LIMIT = 3_500_000

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

function load() {
  try {
    const raw = localStorage.getItem(DOCS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

// Read a File into a data URL so it can be previewed and re-downloaded.
function readAsDataUrl(file) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => resolve(null)
    reader.readAsDataURL(file)
  })
}

let seq = Date.now()

export const useDocumentsStore = defineStore('documents', {
  state: () => ({
    docs: load(),
  }),
  getters: {
    // `scope` is a project id, or 'library' for files not tied to a project.
    forScope: (s) => (scope) => s.docs.filter((d) => d.scope === scope),
    drawingsFor: (s) => (scope) =>
      s.docs.filter((d) => d.scope === scope && ['Drawing', 'CAD', 'BIM', 'Image'].includes(d.kind)),
    byId: (s) => (id) => s.docs.find((d) => d.id === id),
    totalFor: (s) => (scope) => s.docs.filter((d) => d.scope === scope).length,
  },
  actions: {
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

      const dataUrl = file.size <= PERSIST_FILE_LIMIT ? await readAsDataUrl(file) : null

      const doc = {
        id: 'DOC-' + (++seq).toString(36).toUpperCase(),
        name: file.name,
        ext,
        kind: kindOf(file.name),
        size: file.size,
        sizeLabel: formatBytes(file.size),
        mime: file.type || 'application/octet-stream',
        scope,
        uploadedBy,
        uploadedAt: new Date().toISOString(),
        // Analysis is simulated; the flag is what the UI badges read from.
        status: 'Analyzing',
        dataUrl,
      }

      this.docs.unshift(doc)
      this._persist()

      // Mark it analyzed shortly after, the way the drawing viewer expects.
      setTimeout(() => this.markAnalyzed(doc.id), 1600)

      return { ok: true, doc }
    },

    async addFiles(fileList, opts = {}) {
      const added = []
      const errors = []
      for (const file of Array.from(fileList || [])) {
        const res = await this.addFile(file, opts)
        if (res.ok) added.push(res.doc)
        else errors.push(res.error)
      }
      return { added, errors }
    },

    markAnalyzed(id) {
      const doc = this.docs.find((d) => d.id === id)
      if (!doc) return
      doc.status = 'Ready'
      // Element counts are illustrative, but tied to the actual file so the
      // number is at least stable per document instead of changing on render.
      doc.elements = 8 + (doc.name.length % 14)
      this._persist()
    },

    rename(id, name) {
      const doc = this.docs.find((d) => d.id === id)
      if (!doc || !String(name).trim()) return
      doc.name = String(name).trim()
      doc.ext = extOf(doc.name)
      doc.kind = kindOf(doc.name)
      this._persist()
    },

    remove(id) {
      this.docs = this.docs.filter((d) => d.id !== id)
      this._persist()
    },

    clearScope(scope) {
      this.docs = this.docs.filter((d) => d.scope !== scope)
      this._persist()
    },

    _persist() {
      try {
        // Keep bodies only while they fit the budget, newest first.
        let budget = PERSIST_TOTAL_LIMIT
        const slim = this.docs.map((d) => {
          const body = d.dataUrl || ''
          if (body && body.length <= budget) {
            budget -= body.length
            return d
          }
          return { ...d, dataUrl: null }
        })
        localStorage.setItem(DOCS_KEY, JSON.stringify(slim))
      } catch {
        /* quota or privacy mode — session-only is an acceptable fallback */
      }
    },
  },
})
