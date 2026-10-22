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

/**
 * Per-item provenance. A bill is not simply measured or not: some lines come
 * off the geometry, some off a schedule printed on the sheet, and some are a
 * stated assumption standing in for work the drawing never detailed. A roof
 * carcass that is assumed and says so is worth more than a roof carcass that is
 * missing, so the table has to be able to tell the reader which it is looking
 * at.
 */
export const BASIS_LABELS = {
  read: {
    label: 'Read',
    detail: 'A dimension, schedule row or annotated area taken off your drawing.',
    tone: 'bg-success/10 text-success',
  },
  counted: {
    label: 'Counted',
    detail: 'Counted from symbols on the sheet.',
    tone: 'bg-success/10 text-success',
  },
  derived: {
    label: 'Derived',
    detail: 'Computed from a measured quantity plus an assumption. Check the rule below it.',
    tone: 'bg-primary/10 text-primary-dark',
  },
  assumed: {
    label: 'Assumed',
    detail: 'The drawings do not show this work. The quantity rests on a standard rule — check it.',
    tone: 'bg-warning/15 text-warning',
  },
  manual: {
    label: 'Entered',
    detail: 'Typed in by hand. Nothing was measured.',
    tone: 'bg-brand-border-light text-brand-muted',
  },
}

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

// Generation outlives the ~26 s the Netlify proxy will hold a request open, so
// the server answers 202 with a run and this waits on the run instead. The cap
// is generous: a large set of drawings can take minutes, and the server itself
// declares a run lost after ten.
const RUN_POLL_MS = 3000
const RUN_MAX_WAIT_MS = 11 * 60 * 1000

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// A gateway hiccup on one poll says nothing about the run; anything else does.
function isTransient(err) {
  if (!(err instanceof ApiError)) return true // fetch itself failed — a dropped connection
  return err.status === 502 || err.status === 503 || err.status === 504
}

async function waitForRun(projectId, run) {
  const deadline = Date.now() + RUN_MAX_WAIT_MS
  let current = run
  let misses = 0

  while (current.status === 'running') {
    if (Date.now() > deadline) {
      throw new ApiError(504, {
        message: 'Generation is taking unusually long. It may still finish — reload this page in a few minutes.',
      })
    }
    await sleep(RUN_POLL_MS)
    try {
      const res = await api.get(`/projects/${projectId}/boq/generations/${current.id}`)
      current = res.generation
      misses = 0
    } catch (err) {
      if (!isTransient(err) || ++misses > 5) throw err
    }
  }

  if (current.status === 'failed') {
    throw new ApiError(503, { message: current.error || 'Generation failed. Nothing was billed.' })
  }
  return current
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
    const started = await api.post(`/projects/${projectId}/boq/generate`, {
      documentIds: drawings.map((d) => d.id),
      standard,
      region,
    })
    // An older server finishes inside the POST and sends no run to wait on.
    if (started?.generation) await waitForRun(projectId, started.generation)

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
      // How the figure was arrived at, and — for an assumption — the rule it
      // followed. An older server that sends neither leaves both null, and the
      // table falls back to showing confidence alone.
      basis: BASIS_LABELS[i.basis] ? i.basis : null,
      assumption: i.assumption || null,
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
