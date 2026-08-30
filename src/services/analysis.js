// ---------------------------------------------------------------------------
// Drawing analysis — the single seam between the app and the analysis engine.
// ---------------------------------------------------------------------------
// The engine lives inside the BuildQ backend, so this talks to the same
// authenticated API as everything else (services/api.js). One backend, one base
// URL, one session.
//
// There is no longer a fallback. The old stand-in derived quantities from the
// file's NAME and SIZE without ever reading it, which meant the same drawing
// was worth ₦54.1M or ₦8.5M depending on what it was called. When the engine
// cannot answer — no API key, no credits, nothing analysed yet, a format it
// cannot read — that is reported as itself. An estimate is never dressed up as
// a measurement.
//
// Confidence crosses the wire as 0–1 on the engine endpoints and 0–100 on the
// app's own endpoints. Everything below normalises to 0–100, which is what the
// tables render.
// ---------------------------------------------------------------------------

import { api, ApiError } from '@/services/api'
import { normalizeUnit } from '@/utils/units'

/** Provenance for the badge. Only the engine can produce a measured figure. */
export const SOURCE_LABELS = {
  engine: { label: 'Analyzed', detail: 'Measured from your drawing by the analysis engine.' },
  none: {
    label: 'Not analyzed',
    detail: 'Nothing has been measured from this drawing yet.',
  },
}

// A percentage, whichever scale the server used. 0–1 becomes 0–100; a figure
// already in percent is left alone; a missing one stays missing.
function toPercent(c) {
  if (c === null || c === undefined) return null
  const n = Number(c)
  if (!Number.isFinite(n)) return null
  return n <= 1 ? Math.round(n * 100) : Math.round(n)
}

/** The message to show when a call could not produce measured quantities. */
function reason(err) {
  return err instanceof ApiError
    ? err.message
    : 'The analysis engine could not be reached. Nothing has been measured.'
}

/**
 * Build a Bill of Quantities from a project's drawings.
 *
 * @returns {{ items: Array, sources: string[], notes: Array,
 *             revision?: object, failed?: string }}
 */
export async function buildBoq(docs = [], { projectId, standard = 'NIQS', region = 'Lagos' } = {}) {
  const drawings = docs.filter((d) => ['Drawing', 'CAD', 'BIM', 'Image'].includes(d.kind))
  if (!drawings.length) {
    return {
      items: [],
      sources: [],
      notes: [{ type: 'warning', text: 'No drawings to bill from — upload one first.' }],
    }
  }

  try {
    // Generating stores a new revision server-side, so the bill has a history
    // and a variation can point at "Rev 2 → Rev 3" and mean something.
    await api.post(`/projects/${projectId}/boq/generate`, {
      documentIds: drawings.map((d) => d.id),
      standard,
      region,
    })

    // Read the stored revision back, so what the screen shows is what the
    // server holds — not a separate copy that can drift from it.
    const boq = await api.get(`/projects/${projectId}/boq`)
    const items = (boq.items || []).map((i) => ({
      id: i.id,
      code: i.code,
      desc: i.desc,
      section: i.section,
      unit: normalizeUnit(i.unit),
      qty: Number(i.qty) || 0,
      rate: Number(i.rate) || 0,
      confidence: toPercent(i.confidence),
      sources: i.sources || [],
    }))

    return {
      items,
      sources: [...new Set(items.flatMap((i) => i.sources))],
      notes: boq.notes || [],
      revision: boq.revision || null,
    }
  } catch (err) {
    const text = reason(err)
    return { items: [], sources: [], notes: [{ type: 'warning', text }], failed: text }
  }
}

/**
 * Detect measurements from a single plan for the takeoff screen.
 *
 * @returns {{ measurements: Array, warnings: string[], scale: string|null,
 *             failed?: string }}
 */
export async function detectFrom(doc) {
  if (!doc) return { measurements: [], warnings: [] }

  try {
    const payload = await api.post(`/documents/${doc.id}/detect`, {})
    const measurements = (payload.measurements || []).map((m) => ({
      id: m.id,
      name: m.name,
      type: m.type,
      value: m.value,
      numeric: Number(m.numeric ?? 0) || 0,
      unit: m.unit,
      color: m.color,
      auto: Boolean(m.auto),
      confidence: toPercent(m.confidence),
      source: m.source || doc.name,
    }))
    return {
      measurements,
      warnings: payload.warnings || [],
      scale: payload.scale ?? null,
    }
  } catch (err) {
    const text = reason(err)
    return { measurements: [], warnings: [text], scale: null, failed: text }
  }
}
