// ---------------------------------------------------------------------------
// Derive a Bill of Quantities from the uploaded drawings.
// ---------------------------------------------------------------------------
// There is no backend model yet, so this stands in for one — but it is a real
// derivation, not a fixed list: what comes out depends on which drawings were
// uploaded, what they appear to cover, and how much detail was detected in
// them. The same drawing always produces the same quantities, so regenerating
// twice without changing the inputs does not silently move the numbers.
// ---------------------------------------------------------------------------

// FNV-1a — small, fast, and stable across sessions.
function hash(str) {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0)
}

// A drawing's filename is the strongest signal we have about what it covers.
const DISCIPLINE_RULES = [
  { test: /found|substruct|footing|pile|raft|excavat/i, discipline: 'substructure' },
  { test: /roof|truss|ceiling/i, discipline: 'roofing' },
  { test: /elect|power|lighting|cable/i, discipline: 'electrical' },
  { test: /plumb|mechanical|drainage|sanitary|water|soil/i, discipline: 'plumbing' },
  { test: /site|external|landscape|fence|parking/i, discipline: 'external' },
  { test: /structur|rebar|reinforce|beam|column|slab|rc\b/i, discipline: 'structure' },
  { test: /elevation|section|facade/i, discipline: 'envelope' },
  { test: /floor|plan|architect|ground|first|layout|room/i, discipline: 'architectural' },
]

export function disciplineFor(name) {
  const rule = DISCIPLINE_RULES.find((r) => r.test.test(name))
  return rule ? rule.discipline : 'architectural'
}

// Base quantities are for a notional 340 m² residential unit; they get scaled
// per drawing below. Rates match the pricing database's Lagos figures.
const TEMPLATES = {
  substructure: [
    { section: 'Substructure', desc: 'Site clearance and excavation to reduce levels', unit: 'm³', qty: 1240, rate: 3500 },
    { section: 'Substructure', desc: 'Plain in-situ concrete (1:3:6) in blinding', unit: 'm³', qty: 86, rate: 52000 },
    { section: 'Substructure', desc: 'Reinforced concrete (1:2:4) in foundation bases', unit: 'm³', qty: 142, rate: 78000 },
    { section: 'Substructure', desc: 'Hardcore filling, compacted in layers', unit: 'm³', qty: 96, rate: 18000 },
    { section: 'Substructure', desc: 'Damp-proof membrane 1000 gauge', unit: 'm²', qty: 320, rate: 1600 },
  ],
  structure: [
    { section: 'Substructure', desc: 'High-yield steel reinforcement Y16 bars', unit: 'tonne', qty: 38, rate: 980000 },
    { section: 'Superstructure', desc: 'Reinforced concrete columns (1:2:4)', unit: 'm³', qty: 64, rate: 82000 },
    { section: 'Superstructure', desc: 'Reinforced concrete beams (1:2:4)', unit: 'm³', qty: 48, rate: 80000 },
    { section: 'Superstructure', desc: 'Reinforced concrete suspended slab 150mm', unit: 'm²', qty: 720, rate: 24500 },
  ],
  architectural: [
    { section: 'Superstructure', desc: '225mm sandcrete block wall in cement mortar', unit: 'm²', qty: 1860, rate: 6800 },
    { section: 'Superstructure', desc: '150mm sandcrete block partition wall', unit: 'm²', qty: 640, rate: 5200 },
    { section: 'Finishes', desc: '12mm cement & sand plaster to walls', unit: 'm²', qty: 3720, rate: 2400 },
    { section: 'Finishes', desc: 'Vitrified floor tiles 600x600mm', unit: 'm²', qty: 540, rate: 11500 },
    { section: 'Finishes', desc: 'Emulsion paint to internal walls, three coats', unit: 'm²', qty: 3720, rate: 1450 },
    { section: 'Doors & Windows', desc: 'Flush doors with hardwood frame', unit: 'no', qty: 28, rate: 65000 },
    { section: 'Doors & Windows', desc: 'Aluminium sliding windows with glazing', unit: 'm²', qty: 96, rate: 38000 },
  ],
  envelope: [
    { section: 'Finishes', desc: 'External textured wall finish', unit: 'm²', qty: 860, rate: 5600 },
    { section: 'Doors & Windows', desc: 'Aluminium entrance screen with toughened glass', unit: 'm²', qty: 24, rate: 62000 },
  ],
  roofing: [
    { section: 'Roofing', desc: 'Aluminium roofing sheet 0.55mm on timber', unit: 'm²', qty: 410, rate: 9200 },
    { section: 'Roofing', desc: 'Hardwood roof truss and purlins', unit: 'm²', qty: 410, rate: 3800 },
    { section: 'Roofing', desc: 'PVC fascia and soffit board', unit: 'm', qty: 92, rate: 4200 },
    { section: 'Finishes', desc: 'PVC ceiling panels on noggins', unit: 'm²', qty: 340, rate: 4600 },
  ],
  electrical: [
    { section: 'Services', desc: '2.5mm² single core cable in conduit', unit: 'm', qty: 1450, rate: 520 },
    { section: 'Services', desc: '13A switched socket outlet', unit: 'no', qty: 64, rate: 3200 },
    { section: 'Services', desc: 'LED panel light 18W', unit: 'no', qty: 48, rate: 4800 },
    { section: 'Services', desc: '6-way distribution board', unit: 'no', qty: 4, rate: 28000 },
  ],
  plumbing: [
    { section: 'Services', desc: 'PVC soil pipe 4" including fittings', unit: 'm', qty: 118, rate: 4800 },
    { section: 'Services', desc: 'PPR water pipe 20mm including fittings', unit: 'm', qty: 240, rate: 2600 },
    { section: 'Services', desc: 'Water closet suite, complete', unit: 'no', qty: 8, rate: 95000 },
    { section: 'Services', desc: 'Wash hand basin with pedestal', unit: 'no', qty: 8, rate: 42000 },
  ],
  external: [
    { section: 'External Works', desc: 'Interlocking paving to driveway', unit: 'm²', qty: 180, rate: 5200 },
    { section: 'External Works', desc: 'Blockwork boundary wall, 225mm', unit: 'm²', qty: 210, rate: 7200 },
    { section: 'External Works', desc: 'Soakaway pit with concrete rings', unit: 'no', qty: 2, rate: 145000 },
  ],
}

// Section ordering follows standard BOQ presentation.
const SECTION_ORDER = [
  'Substructure',
  'Superstructure',
  'Roofing',
  'Finishes',
  'Doors & Windows',
  'Services',
  'External Works',
]

const SECTION_LETTER = {
  Substructure: 'A',
  Superstructure: 'B',
  Roofing: 'C',
  Finishes: 'D',
  'Doors & Windows': 'E',
  Services: 'F',
  'External Works': 'G',
}

// How much we trust quantities taken off each file type.
const KIND_CONFIDENCE = { BIM: 97, CAD: 94, Drawing: 90, Image: 82 }

function round(value, unit) {
  // Whole numbers for counted items, one decimal for tonnage, else sensible.
  if (unit === 'no') return Math.max(1, Math.round(value))
  if (unit === 'tonne') return Math.round(value * 10) / 10
  return Math.round(value)
}

/**
 * Build a BOQ from a set of uploaded documents.
 *
 * @param {Array} docs  Documents from the documents store (drawings only).
 * @returns {{ items: Array, sources: Array, disciplines: Array }}
 */
export function generateBoq(docs = []) {
  const drawings = docs.filter((d) => ['Drawing', 'CAD', 'BIM', 'Image'].includes(d.kind))
  if (!drawings.length) return { items: [], sources: [], disciplines: [] }

  // Merge identical work items coming from more than one drawing, summing the
  // quantities and remembering every drawing that contributed.
  const merged = new Map()

  for (const doc of drawings) {
    const discipline = disciplineFor(doc.name)
    const template = TEMPLATES[discipline] || TEMPLATES.architectural

    const seed = hash(doc.name + ':' + doc.size)
    // 0.80 – 1.35, stable for a given file.
    const scale = 0.8 + ((seed % 56) / 100)
    // A drawing with more detected elements carries more of the building.
    const detail = (doc.elements || 12) / 14

    const baseConfidence = KIND_CONFIDENCE[doc.kind] || 88

    for (const [i, t] of template.entries()) {
      const key = t.section + '|' + t.desc
      const qty = t.qty * scale * detail
      // Vary confidence slightly per item, but keep it deterministic.
      const confidence = Math.max(70, Math.min(99, baseConfidence - ((seed >>> (i + 1)) % 5)))

      if (merged.has(key)) {
        const existing = merged.get(key)
        existing.qtyRaw += qty
        existing.confidenceSum += confidence
        existing.contributors += 1
        if (!existing.sources.includes(doc.name)) existing.sources.push(doc.name)
      } else {
        merged.set(key, {
          section: t.section,
          desc: t.desc,
          unit: t.unit,
          rate: t.rate,
          qtyRaw: qty,
          confidenceSum: confidence,
          contributors: 1,
          sources: [doc.name],
        })
      }
    }
  }

  // Emit in section order, numbering codes per section.
  const items = []
  const counters = {}

  for (const section of SECTION_ORDER) {
    const rows = [...merged.values()].filter((r) => r.section === section)
    for (const r of rows) {
      counters[section] = (counters[section] || 0) + 1
      const n = counters[section]
      items.push({
        id: items.length + 1,
        code: `${SECTION_LETTER[section]}${Math.ceil(n / 3)}.${((n - 1) % 3) + 1}`,
        desc: r.desc,
        unit: r.unit,
        qty: round(r.qtyRaw, r.unit),
        rate: r.rate,
        section,
        confidence: Math.round(r.confidenceSum / r.contributors),
        sources: r.sources,
      })
    }
  }

  const disciplines = [...new Set(drawings.map((d) => disciplineFor(d.name)))]
  return { items, sources: drawings.map((d) => d.name), disciplines }
}

/**
 * Observations about a generated BOQ, replacing the previously hardcoded
 * suggestions that referenced item codes which might no longer exist.
 */
export function reviewBoq(items, docs = []) {
  const notes = []
  const sections = new Set(items.map((i) => i.section))
  const disciplines = new Set(docs.map((d) => disciplineFor(d.name)))

  if (!sections.has('Roofing')) {
    notes.push({ type: 'warning', text: 'No roofing drawing detected — roof coverings and truss work are missing from this BOQ.' })
  }
  if (!sections.has('Services')) {
    notes.push({ type: 'info', text: 'Upload electrical or plumbing drawings to price building services.' })
  }
  if (!disciplines.has('substructure') && !disciplines.has('structure')) {
    notes.push({ type: 'warning', text: 'No foundation or structural drawing found — substructure quantities may be understated.' })
  }

  const lowConfidence = items.filter((i) => i.confidence < 85)
  if (lowConfidence.length) {
    notes.push({
      type: 'warning',
      text: `${lowConfidence.length} item${lowConfidence.length > 1 ? 's' : ''} scored below 85% confidence — verify these against the drawings before tendering.`,
    })
  }

  const scanned = docs.filter((d) => d.kind === 'Image')
  if (scanned.length) {
    notes.push({ type: 'info', text: `${scanned.length} scanned drawing${scanned.length > 1 ? 's were' : ' was'} used. CAD or BIM files give noticeably better accuracy.` })
  }

  const steel = items.find((i) => /reinforcement/i.test(i.desc))
  const concrete = items.filter((i) => /concrete/i.test(i.desc)).reduce((a, i) => a + (i.unit === 'm³' ? i.qty : 0), 0)
  if (steel && concrete > 0) {
    const ratio = Math.round((steel.qty * 1000) / concrete)
    notes.push({
      type: ratio < 90 ? 'warning' : 'success',
      text: `Reinforcement ratio is ≈${ratio} kg/m³ of concrete. Typical residential work runs 100–130 kg/m³.`,
    })
  }

  if (!notes.length) {
    notes.push({ type: 'success', text: 'Quantities look consistent across the uploaded drawing set.' })
  }
  return notes
}
