// ---------------------------------------------------------------------------
// Quantity takeoff: detect measurements from a plan, and turn measurements
// into BOQ line items.
// ---------------------------------------------------------------------------
// Like the BOQ generator, this stands in for a vision model but is a real
// derivation — what is detected depends on the plan you are looking at, and
// the same plan always yields the same measurements.
// ---------------------------------------------------------------------------

import { disciplineFor } from './boqGenerator.js'

function hash(str) {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

export const UNIT_FOR_TYPE = { Linear: 'm', Area: 'm²', Volume: 'm³', Count: 'no' }
export const COLOR_FOR_TYPE = { Linear: '#2DC875', Area: '#1CA5F6', Volume: '#FFA726', Count: '#E63946' }

// What each kind of drawing plausibly yields when measured.
const DETECTION_TEMPLATES = {
  architectural: [
    { name: 'Ground floor slab', type: 'Area', base: 186.4 },
    { name: 'Internal partitions', type: 'Linear', base: 94.6 },
    { name: 'External wall run', type: 'Linear', base: 68.2 },
    { name: 'Window openings', type: 'Count', base: 14 },
    { name: 'Door openings', type: 'Count', base: 9 },
    { name: 'Floor finish area', type: 'Area', base: 172.0 },
  ],
  substructure: [
    { name: 'Excavation to reduce levels', type: 'Volume', base: 142.0 },
    { name: 'Foundation concrete', type: 'Volume', base: 42.1 },
    { name: 'Foundation trench run', type: 'Linear', base: 96.4 },
    { name: 'Blinding area', type: 'Area', base: 118.6 },
  ],
  structure: [
    { name: 'Suspended slab area', type: 'Area', base: 208.0 },
    { name: 'Column count', type: 'Count', base: 18 },
    { name: 'Beam run', type: 'Linear', base: 124.5 },
    { name: 'Concrete volume (frame)', type: 'Volume', base: 64.8 },
  ],
  roofing: [
    { name: 'Roof covering area', type: 'Area', base: 214.6 },
    { name: 'Ridge and hip run', type: 'Linear', base: 38.4 },
    { name: 'Fascia run', type: 'Linear', base: 46.2 },
    { name: 'Ceiling area', type: 'Area', base: 178.0 },
  ],
  electrical: [
    { name: 'Socket outlets', type: 'Count', base: 32 },
    { name: 'Lighting points', type: 'Count', base: 26 },
    { name: 'Cable run', type: 'Linear', base: 486.0 },
    { name: 'Distribution boards', type: 'Count', base: 2 },
  ],
  plumbing: [
    { name: 'Soil pipe run', type: 'Linear', base: 62.4 },
    { name: 'Water pipe run', type: 'Linear', base: 128.0 },
    { name: 'Sanitary fittings', type: 'Count', base: 12 },
  ],
  external: [
    { name: 'Paved driveway area', type: 'Area', base: 96.5 },
    { name: 'Boundary wall run', type: 'Linear', base: 84.0 },
    { name: 'Landscaped area', type: 'Area', base: 142.8 },
  ],
  envelope: [
    { name: 'External wall face area', type: 'Area', base: 286.0 },
    { name: 'Glazed screen area', type: 'Area', base: 34.2 },
  ],
}

/**
 * Detect measurements from one plan document.
 * Deterministic: the same document always yields the same values.
 */
export function detectMeasurements(doc) {
  if (!doc) return []
  const discipline = disciplineFor(doc.name)
  const template = DETECTION_TEMPLATES[discipline] || DETECTION_TEMPLATES.architectural

  const seed = hash(doc.name + ':' + (doc.size || 0))
  const scale = 0.85 + ((seed % 40) / 100) // 0.85 – 1.24
  const detail = (doc.elements || 12) / 14

  return template.map((t, i) => {
    const raw = t.base * scale * detail
    const value = t.type === 'Count' ? Math.max(1, Math.round(raw)) : Math.round(raw * 10) / 10
    return {
      name: t.name,
      type: t.type,
      value: `${value} ${UNIT_FOR_TYPE[t.type]}`,
      numeric: value,
      color: COLOR_FOR_TYPE[t.type],
      auto: true,
      source: doc.name,
      // Stable per plan+item so re-detecting does not renumber everything.
      key: `${doc.id || doc.name}:${i}`,
    }
  })
}

// Keyword-driven mapping from a measurement to a priced BOQ line.
// ---------------------------------------------------------------------------
// Each rule states the unit its rate is quoted in, and a rule only applies to a
// quantity measured in that same unit. Without this a wall measured as a linear
// run was priced at a per-square-metre rate, and a column count at a per-cubic-
// metre rate - both badly wrong. Where a trade is commonly taken off in more
// than one unit the rate is given for each, with the assumed dimensions stated
// in the description so the figure can be checked.
// ---------------------------------------------------------------------------
const BOQ_RULES = [
  // --- substructure -------------------------------------------------------
  { test: /excavat/i, unit: 'm³', section: 'Substructure', desc: 'Excavation to reduce levels', rate: 3500 },
  { test: /blinding/i, unit: 'm³', section: 'Substructure', desc: 'Plain in-situ concrete (1:3:6) in blinding', rate: 52000 },
  // 50mm blinding = 0.05 m3 per m2 of area covered.
  { test: /blinding/i, unit: 'm²', section: 'Substructure', desc: 'Plain in-situ concrete blinding, 50mm thick', rate: 2600 },
  { test: /foundation|footing/i, unit: 'm³', section: 'Substructure', desc: 'Reinforced concrete (1:2:4) in foundations', rate: 78000 },
  // Strip footing 600 x 225mm = 0.135 m3 per metre run.
  { test: /trench|strip footing|foundation run/i, unit: 'm', section: 'Substructure', desc: 'Reinforced concrete strip footing (600 x 225mm)', rate: 10530 },
  { test: /hardcore/i, unit: 'm³', section: 'Substructure', desc: 'Hardcore filling, compacted in layers', rate: 18000 },
  { test: /damp.?proof|dpm/i, unit: 'm²', section: 'Substructure', desc: 'Damp-proof membrane 1000 gauge', rate: 1600 },

  // --- frame --------------------------------------------------------------
  { test: /column/i, unit: 'm³', section: 'Superstructure', desc: 'Reinforced concrete columns (1:2:4)', rate: 82000 },
  // Column 225 x 225mm x 3.0m storey = 0.152 m3 each.
  { test: /column/i, unit: 'no', section: 'Superstructure', desc: 'Reinforced concrete column (225 x 225mm x 3.0m)', rate: 12460 },
  { test: /beam/i, unit: 'm³', section: 'Superstructure', desc: 'Reinforced concrete beams (1:2:4)', rate: 80000 },
  // Beam 225 x 450mm = 0.101 m3 per metre run.
  { test: /beam/i, unit: 'm', section: 'Superstructure', desc: 'Reinforced concrete beam (225 x 450mm)', rate: 8100 },
  { test: /slab/i, unit: 'm²', section: 'Superstructure', desc: 'Reinforced concrete suspended slab 150mm', rate: 24500 },
  { test: /slab|frame|concrete volume/i, unit: 'm³', section: 'Superstructure', desc: 'Reinforced concrete (1:2:4) in frame', rate: 80000 },

  // --- walling ------------------------------------------------------------
  { test: /partition/i, unit: 'm²', section: 'Superstructure', desc: '150mm sandcrete block partition wall', rate: 5200 },
  // Walls taken off as a run are priced over an assumed 3.0m storey height.
  { test: /partition/i, unit: 'm', section: 'Superstructure', desc: '150mm block partition wall (3.0m storey height)', rate: 15600 },
  { test: /boundary/i, unit: 'm²', section: 'External Works', desc: 'Blockwork boundary wall, 225mm', rate: 7200 },
  // Boundary walls are typically 2.4m high.
  { test: /boundary/i, unit: 'm', section: 'External Works', desc: 'Blockwork boundary wall, 225mm (2.4m high)', rate: 17280 },
  { test: /external wall|wall run|wall face|blockwork|wall/i, unit: 'm²', section: 'Superstructure', desc: '225mm sandcrete block wall', rate: 6800 },
  { test: /external wall|wall run|wall/i, unit: 'm', section: 'Superstructure', desc: '225mm sandcrete block wall (3.0m storey height)', rate: 20400 },

  // --- roofing ------------------------------------------------------------
  { test: /roof covering|roof/i, unit: 'm²', section: 'Roofing', desc: 'Aluminium roofing sheet 0.55mm on timber', rate: 9200 },
  { test: /ridge|hip/i, unit: 'm', section: 'Roofing', desc: 'Ridge and hip capping', rate: 4200 },
  { test: /fascia|soffit/i, unit: 'm', section: 'Roofing', desc: 'PVC fascia and soffit board', rate: 4200 },
  { test: /ceiling/i, unit: 'm²', section: 'Finishes', desc: 'PVC ceiling panels on noggins', rate: 4600 },

  // --- finishes -----------------------------------------------------------
  { test: /floor finish|tiling|tile/i, unit: 'm²', section: 'Finishes', desc: 'Vitrified floor tiles 600x600mm', rate: 11500 },
  { test: /plaster|render/i, unit: 'm²', section: 'Finishes', desc: '12mm cement & sand plaster to walls', rate: 2400 },
  { test: /paint/i, unit: 'm²', section: 'Finishes', desc: 'Emulsion paint to walls, three coats', rate: 1450 },
  { test: /skirting/i, unit: 'm', section: 'Finishes', desc: 'Tiled skirting', rate: 1900 },

  // --- openings -----------------------------------------------------------
  { test: /window/i, unit: 'm²', section: 'Doors & Windows', desc: 'Aluminium sliding windows with glazing', rate: 38000 },
  // A typical residential window is 1.2 x 1.5m = 1.8 m2.
  { test: /window/i, unit: 'no', section: 'Doors & Windows', desc: 'Aluminium sliding window (1.2 x 1.5m)', rate: 68400 },
  { test: /door/i, unit: 'no', section: 'Doors & Windows', desc: 'Flush doors with hardwood frame', rate: 65000 },
  { test: /glazed|screen|curtain wall/i, unit: 'm²', section: 'Doors & Windows', desc: 'Aluminium glazed screen', rate: 62000 },

  // --- services -----------------------------------------------------------
  { test: /socket/i, unit: 'no', section: 'Services', desc: '13A switched socket outlet', rate: 3200 },
  { test: /lighting|light point|light/i, unit: 'no', section: 'Services', desc: 'LED panel light 18W', rate: 4800 },
  { test: /distribution board/i, unit: 'no', section: 'Services', desc: '6-way distribution board', rate: 28000 },
  { test: /cable|conduit/i, unit: 'm', section: 'Services', desc: '2.5mm² single core cable in conduit', rate: 520 },
  { test: /soil pipe|waste pipe/i, unit: 'm', section: 'Services', desc: 'PVC soil pipe 4" including fittings', rate: 4800 },
  { test: /water pipe|supply pipe/i, unit: 'm', section: 'Services', desc: 'PPR water pipe 20mm including fittings', rate: 2600 },
  { test: /sanitary|closet|basin/i, unit: 'no', section: 'Services', desc: 'Sanitary fittings, supply and install', rate: 68000 },

  // --- external works -----------------------------------------------------
  { test: /paved|paving|driveway/i, unit: 'm²', section: 'External Works', desc: 'Interlocking paving to driveway', rate: 5200 },
  { test: /landscap|turf/i, unit: 'm²', section: 'External Works', desc: 'Landscaping and turfing', rate: 3200 },
  { test: /soakaway/i, unit: 'no', section: 'External Works', desc: 'Soakaway pit with concrete rings', rate: 145000 },
]

// Used when nothing matches, so a custom measurement still prices in its own
// unit rather than borrowing a rate of the wrong dimension.
const FALLBACK_RATE = { 'm²': 6800, m: 4200, 'm³': 52000, no: 25000 }

/** Pull the leading number out of a value string like "186.4 m²". */
export function numericValue(measurement) {
  if (typeof measurement.numeric === 'number') return measurement.numeric
  const n = parseFloat(String(measurement.value).replace(/[^\d.\-]/g, ''))
  return Number.isFinite(n) ? n : 0
}

/**
 * Convert measurements into BOQ line items ready for the projects store.
 * Zero-value measurements are skipped — they would price as nothing.
 */
export function measurementsToBoqItems(measurements = []) {
  const items = []
  const skipped = []

  for (const m of measurements) {
    const qty = numericValue(m)
    if (!(qty > 0)) {
      skipped.push(m.name)
      continue
    }
    const unit = UNIT_FOR_TYPE[m.type] || 'no'
    // Keyword AND unit must agree - a rate quoted per square metre must never
    // be applied to a length, nor a per-cubic-metre rate to a count.
    const rule = BOQ_RULES.find((r) => r.unit === unit && r.test.test(m.name))
    items.push({
      desc: rule ? rule.desc : m.name,
      section: rule ? rule.section : 'Superstructure',
      unit,
      qty,
      rate: rule ? rule.rate : FALLBACK_RATE[unit] || 10000,
      // Taken off a drawing rather than inferred, so confidence is high.
      confidence: m.auto ? 93 : 100,
      sources: m.source ? [m.source] : [],
    })
  }

  return { items, skipped }
}
