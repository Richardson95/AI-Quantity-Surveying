import { defineStore } from 'pinia'
import { normalizeUnit } from '@/utils/units'

// ---------------------------------------------------------------------------
// Cost data the user supplies themselves.
// ---------------------------------------------------------------------------
// The AI estimate is one opinion. Firms almost always have their own priced
// schedules — a subcontractor quote, a historic BOQ, a supplier price list —
// and need to price against those instead of, or alongside, the model. This
// store holds cost lines imported from a CSV so they can be compared with the
// AI figure and pushed into the rate analysis.
// ---------------------------------------------------------------------------

const COSTS_KEY = 'buildq.costs'

// Header aliases, so a file does not have to match one exact layout.
const FIELD_ALIASES = {
  item: ['item', 'description', 'desc', 'work item', 'particulars', 'name'],
  unit: ['unit', 'uom', 'units'],
  rate: ['rate', 'price', 'unit rate', 'unit price', 'cost', 'amount/unit'],
  qty: ['qty', 'quantity', 'quantities', 'no', 'number'],
  section: ['section', 'category', 'element', 'trade', 'group'],
}

/** Split one CSV line, honouring quoted fields containing commas. */
export function splitCsvLine(line) {
  const out = []
  let cur = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++ }
      else if (c === '"') quoted = false
      else cur += c
    } else if (c === '"') {
      quoted = true
    } else if (c === ',' || c === ';' || c === '\t') {
      out.push(cur.trim())
      cur = ''
    } else {
      cur += c
    }
  }
  out.push(cur.trim())
  return out
}

function toNumber(v) {
  // Tolerate "₦1,250.00", "1 250", "(500)" and similar.
  const s = String(v || '').replace(/[^\d.\-]/g, '')
  const n = Number(s)
  return Number.isFinite(n) ? n : 0
}

/**
 * Parse a cost CSV into structured lines.
 * Returns { rows, errors, mapped } — `mapped` reports which columns were used.
 */
export function parseCostCsv(text) {
  const lines = String(text).split(/\r?\n/).filter((l) => l.trim())
  if (!lines.length) return { rows: [], errors: ['The file is empty.'], mapped: {} }

  const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase().trim())
  const mapped = {}
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    const idx = header.findIndex((h) => aliases.includes(h))
    if (idx !== -1) mapped[field] = idx
  }

  // Without a header we fall back to positional columns: item, unit, rate, qty.
  const hasHeader = mapped.item !== undefined || mapped.rate !== undefined
  const body = hasHeader ? lines.slice(1) : lines
  const cols = hasHeader ? mapped : { item: 0, unit: 1, rate: 2, qty: 3 }

  const rows = []
  const errors = []

  body.forEach((line, n) => {
    const cells = splitCsvLine(line)
    const item = (cells[cols.item] || '').trim()
    if (!item) return

    const rate = toNumber(cells[cols.rate])
    if (!(rate > 0)) {
      errors.push(`Row ${n + (hasHeader ? 2 : 1)}: "${item}" has no usable rate — skipped.`)
      return
    }

    rows.push({
      item,
      // Imported files use every spelling under the sun; store one.
      unit: normalizeUnit(cells[cols.unit]) || 'no',
      rate,
      qty: cols.qty !== undefined ? toNumber(cells[cols.qty]) : 0,
      section: cols.section !== undefined ? (cells[cols.section] || '').trim() : '',
    })
  })

  if (!rows.length && !errors.length) errors.push('No priced rows were found in that file.')
  return { rows, errors, mapped: cols }
}

function load() {
  try {
    const raw = localStorage.getItem(COSTS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

let seq = Date.now()

export const useCostsStore = defineStore('costs', {
  state: () => ({
    lines: load(),
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
    importRows(rows, source) {
      const added = rows.map((r) => ({
        id: 'CST-' + (++seq).toString(36).toUpperCase(),
        ...r,
        source,
        uploadedAt: new Date().toISOString(),
      }))
      this.lines = [...added, ...this.lines]
      this._persist()
      return added.length
    },
    update(id, patch) {
      const line = this.lines.find((l) => l.id === id)
      if (!line) return
      if (patch.rate != null) patch.rate = Math.max(0, Number(patch.rate) || 0)
      if (patch.qty != null) patch.qty = Math.max(0, Number(patch.qty) || 0)
      if (patch.unit != null) patch.unit = normalizeUnit(patch.unit)
      Object.assign(line, patch)
      this._persist()
    },
    remove(id) {
      this.lines = this.lines.filter((l) => l.id !== id)
      this._persist()
    },
    removeSource(source) {
      this.lines = this.lines.filter((l) => l.source !== source)
      this._persist()
    },
    clear() {
      this.lines = []
      this._persist()
    },
    _persist() {
      try {
        localStorage.setItem(COSTS_KEY, JSON.stringify(this.lines))
      } catch {
        /* storage unavailable — session-only is acceptable */
      }
    },
  },
})
