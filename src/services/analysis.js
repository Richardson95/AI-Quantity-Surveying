// ---------------------------------------------------------------------------
// Drawing analysis — the single seam between the app and the analysis engine.
// ---------------------------------------------------------------------------
// Nothing else in the app talks to the analysis engine directly. Today there
// is no engine, so these functions fall back to a local stand-in that derives
// figures from the file's NAME and SIZE — it never reads the drawing. Every
// result therefore reports where it came from, and the UI labels it honestly.
//
// When the backend exists, set VITE_ANALYSIS_API_URL and nothing else in the
// app needs to change.
//
// ---------------------------------------------------------------------------
// CONTRACT THE BACKEND MUST IMPLEMENT
// ---------------------------------------------------------------------------
//
// POST {VITE_ANALYSIS_API_URL}/analyze
//   Request  (multipart/form-data)
//     file      the drawing (PDF, DWG, DXF, RVT, IFC, PNG, JPG)
//     projectId string
//   Response 200 (application/json)
//     {
//       "documentId": "DOC-123",
//       "scale": "1:100",                  // detected, or null
//       "pages": 3,
//       "elements": [                      // what was recognised on the drawing
//         { "type": "wall",   "count": 24, "length": 148.2, "unit": "m"  },
//         { "type": "slab",   "count": 2,  "area":   186.4, "unit": "m²" },
//         { "type": "column", "count": 18 },
//         { "type": "door",   "count": 9  },
//         { "type": "window", "count": 14 }
//       ],
//       "measurements": [                  // ready for the takeoff screen
//         { "name": "Ground floor slab", "type": "Area", "value": 186.4, "unit": "m²", "confidence": 0.94 }
//       ],
//       "warnings": ["Scale bar unreadable on sheet 2"]
//     }
//
// POST {VITE_ANALYSIS_API_URL}/boq
//   Request  (application/json)
//     { "projectId": "PRJ-1042", "documentIds": ["DOC-123", "DOC-124"],
//       "standard": "NIQS", "region": "Lagos" }
//   Response 200 (application/json)
//     {
//       "items": [
//         { "code": "B2.1",
//           "desc": "Reinforced concrete (1:2:4) in suspended slab, 150mm thick",
//           "section": "Superstructure",
//           "unit": "m³",                  // canonical units — see utils/units.js
//           "qty": 27.96,
//           "rate": 80000,
//           "confidence": 0.93,            // 0-1; omit if not measured
//           "sources": ["Ground Floor Plan.pdf"] }
//       ],
//       "notes": [ { "type": "warning", "text": "No roofing drawing supplied" } ]
//     }
//
// Measurement rules the engine must follow (see utils/units.js):
//   in-situ concrete  m³      formwork      m²      reinforcement  tonne
//   blockwork         m²      finishes      m²      earthworks     m³
//   pipes and cables  m       fittings      no      site clearance m²
// ---------------------------------------------------------------------------

import { generateBoq, reviewBoq } from '@/utils/boqGenerator'
import { detectMeasurements } from '@/utils/takeoff'
import { normalizeUnit } from '@/utils/units'

export const ANALYSIS_API = import.meta.env.VITE_ANALYSIS_API_URL || ''

/** True once a real analysis engine is configured. */
export function hasAnalysisEngine() {
  return Boolean(ANALYSIS_API)
}

/** Human-readable provenance, used for badges and disclaimers in the UI. */
export const SOURCE_LABELS = {
  engine: { label: 'Analyzed', detail: 'Measured from your drawing by the analysis engine.' },
  'stand-in': {
    label: 'Template estimate',
    detail:
      'Figures come from a template matched to the file name — the drawing itself has not been read. Connect the analysis engine for measured quantities.',
  },
}

async function postJson(path, body) {
  const res = await fetch(`${ANALYSIS_API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Analysis engine returned ${res.status}`)
  return res.json()
}

/**
 * Build a Bill of Quantities from uploaded drawings.
 * Always resolves; falls back to the stand-in if the engine is unreachable.
 *
 * @returns {{ source: 'engine'|'stand-in', items: Array, sources: string[],
 *             notes: Array, degraded?: string }}
 */
export async function buildBoq(docs = [], { projectId, standard = 'NIQS', region = 'Lagos' } = {}) {
  const drawings = docs.filter((d) => ['Drawing', 'CAD', 'BIM', 'Image'].includes(d.kind))
  if (!drawings.length) return { source: 'stand-in', items: [], sources: [], notes: [] }

  if (hasAnalysisEngine()) {
    try {
      const payload = await postJson('/boq', {
        projectId,
        documentIds: drawings.map((d) => d.id),
        standard,
        region,
      })
      const items = (payload.items || []).map((i, n) => ({
        id: n + 1,
        code: i.code,
        desc: i.desc,
        section: i.section,
        unit: normalizeUnit(i.unit),
        qty: Number(i.qty) || 0,
        rate: Number(i.rate) || 0,
        // Engine reports 0-1; the table shows whole percentages.
        confidence: i.confidence != null ? Math.round(i.confidence * 100) : null,
        sources: i.sources || [],
      }))
      return {
        source: 'engine',
        items,
        sources: [...new Set(items.flatMap((i) => i.sources))],
        notes: payload.notes || [],
      }
    } catch (err) {
      // Never block the user on an engine outage — fall back and say so.
      const local = generateBoq(drawings)
      return {
        source: 'stand-in',
        items: local.items,
        sources: local.sources,
        notes: reviewBoq(local.items, drawings),
        degraded: err.message,
      }
    }
  }

  const local = generateBoq(drawings)
  return {
    source: 'stand-in',
    items: local.items,
    sources: local.sources,
    notes: reviewBoq(local.items, drawings),
  }
}

/**
 * Detect measurements from a single plan for the takeoff screen.
 * @returns {{ source: 'engine'|'stand-in', measurements: Array, warnings: string[] }}
 */
export async function detectFrom(doc) {
  if (!doc) return { source: 'stand-in', measurements: [], warnings: [] }

  if (hasAnalysisEngine()) {
    try {
      const payload = await postJson('/analyze', { documentId: doc.id })
      const measurements = (payload.measurements || []).map((m) => ({
        name: m.name,
        type: m.type,
        value: `${m.value} ${normalizeUnit(m.unit)}`,
        numeric: Number(m.value) || 0,
        auto: true,
        source: doc.name,
      }))
      return { source: 'engine', measurements, warnings: payload.warnings || [] }
    } catch (err) {
      return {
        source: 'stand-in',
        measurements: detectMeasurements(doc),
        warnings: [],
        degraded: err.message,
      }
    }
  }

  return { source: 'stand-in', measurements: detectMeasurements(doc), warnings: [] }
}
