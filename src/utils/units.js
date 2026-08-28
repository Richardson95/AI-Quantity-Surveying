// ---------------------------------------------------------------------------
// Units of measurement.
// ---------------------------------------------------------------------------
// One canonical spelling per unit, plus the aliases people actually type, so a
// rate imported as "M2", "sq.m" or "SQM" is stored as m². Every unit declares
// its dimension, which lets the app refuse to price a length at an area rate.
// ---------------------------------------------------------------------------

// dimension: what the unit measures. Rates may only be applied to a quantity
// of the same dimension.
export const UNITS = {
  // Linear
  m: { label: 'metre', dimension: 'length' },
  km: { label: 'kilometre', dimension: 'length' },
  mm: { label: 'millimetre', dimension: 'length' },

  // Area / volume
  'm²': { label: 'square metre', dimension: 'area' },
  'm³': { label: 'cubic metre', dimension: 'volume' },

  // Discrete
  no: { label: 'number', dimension: 'count' },
  pair: { label: 'pair', dimension: 'count' },
  set: { label: 'set', dimension: 'count' },

  // Mass
  kg: { label: 'kilogramme', dimension: 'mass' },
  tonne: { label: 'tonne', dimension: 'mass' },

  // Volume (liquid)
  L: { label: 'litre', dimension: 'capacity' },

  // Time / plant hire
  hr: { label: 'hour', dimension: 'time' },
  day: { label: 'day', dimension: 'time' },
  week: { label: 'week', dimension: 'time' },
  month: { label: 'month', dimension: 'time' },

  // Trade packaging — counted, but named the way suppliers sell them
  bag: { label: 'bag', dimension: 'pack' },
  bucket: { label: 'bucket', dimension: 'pack' },
  tin: { label: 'tin', dimension: 'pack' },
  roll: { label: 'roll', dimension: 'pack' },
  pack: { label: 'pack', dimension: 'pack' },
  sheet: { label: 'sheet', dimension: 'pack' },
  length: { label: 'length', dimension: 'pack' },
  trip: { label: 'trip', dimension: 'pack' },
  load: { label: 'load', dimension: 'pack' },
  trailer: { label: 'trailer', dimension: 'pack' },

  // Lump sums
  item: { label: 'item', dimension: 'lump' },
  sum: { label: 'sum', dimension: 'lump' },
}

// Everything on the left normalises to the canonical unit on the right.
const ALIASES = {
  // length
  metre: 'm', metres: 'm', meter: 'm', meters: 'm', lm: 'm', 'l.m': 'm', rm: 'm', m1: 'm',
  millimetre: 'mm', millimeter: 'mm',
  kilometre: 'km', kilometer: 'km',

  // area
  m2: 'm²', 'm^2': 'm²', sqm: 'm²', 'sq.m': 'm²', 'sq m': 'm²', sqmt: 'm²',
  'square metre': 'm²', 'square meter': 'm²', sm: 'm²', '㎡': 'm²',

  // volume
  m3: 'm³', 'm^3': 'm³', cum: 'm³', 'cu.m': 'm³', 'cu m': 'm³', cbm: 'm³',
  'cubic metre': 'm³', 'cubic meter': 'm³', '㎥': 'm³',

  // count
  nr: 'no', 'no.': 'no', num: 'no', number: 'no', pcs: 'no', pc: 'no', piece: 'no',
  pieces: 'no', ea: 'no', each: 'no', unit: 'no', units: 'no', qty: 'no',
  prs: 'pair', pairs: 'pair', sets: 'set',

  // mass
  kilo: 'kg', kilos: 'kg', kgs: 'kg', kilogram: 'kg', kilogramme: 'kg',
  t: 'tonne', ton: 'tonne', tons: 'tonne', tonnes: 'tonne', mt: 'tonne',

  // capacity
  l: 'L', ltr: 'L', litre: 'L', litres: 'L', liter: 'L', liters: 'L',

  // time
  hour: 'hr', hours: 'hr', hrs: 'hr', days: 'day', wk: 'week', weeks: 'week',
  mth: 'month', months: 'month',

  // packaging
  bags: 'bag', buckets: 'bucket', tins: 'tin', rolls: 'roll', packs: 'pack',
  packet: 'pack', sheets: 'sheet', lengths: 'length', trips: 'trip', loads: 'load',

  // lump
  ls: 'sum', 'lump sum': 'sum', items: 'item',
}

/**
 * Normalise whatever the user typed into a canonical unit.
 * Unknown units are returned trimmed rather than discarded — a QS may have a
 * legitimate unit we have not listed, and silently dropping it would be worse.
 */
export function normalizeUnit(raw) {
  const s = String(raw ?? '').trim()
  if (!s) return ''

  // Exact canonical match first (case-sensitive: m² and L matter).
  if (UNITS[s]) return s

  const lower = s.toLowerCase().replace(/\s+/g, ' ')
  if (UNITS[lower]) return lower
  if (ALIASES[lower]) return ALIASES[lower]

  // Try again without punctuation, so "sq.m." and "no.." still resolve.
  const stripped = lower.replace(/[.\s]+$/g, '').replace(/[.]/g, '')
  if (UNITS[stripped]) return stripped
  if (ALIASES[stripped]) return ALIASES[stripped]

  // Superscript digits typed as plain numbers, e.g. "m 2".
  const collapsed = stripped.replace(/\s/g, '')
  if (ALIASES[collapsed]) return ALIASES[collapsed]

  return s
}

export function isKnownUnit(unit) {
  return Object.prototype.hasOwnProperty.call(UNITS, normalizeUnit(unit))
}

export function dimensionOf(unit) {
  const u = UNITS[normalizeUnit(unit)]
  return u ? u.dimension : 'unknown'
}

/** True when a rate quoted per `rateUnit` may be applied to `qtyUnit`. */
export function unitsCompatible(qtyUnit, rateUnit) {
  const a = normalizeUnit(qtyUnit)
  const b = normalizeUnit(rateUnit)
  if (a === b) return true
  const da = dimensionOf(a)
  const db = dimensionOf(b)
  // Unknown units cannot be checked, so allow rather than block the user.
  if (da === 'unknown' || db === 'unknown') return true
  return da === db
}

/** Units offered in pickers, grouped so the common ones come first. */
export const COMMON_UNITS = ['m', 'm²', 'm³', 'no', 'kg', 'tonne', 'L', 'bag', 'sheet', 'length', 'set', 'pair', 'roll', 'bucket', 'tin', 'pack', 'trip', 'load', 'day', 'hr', 'week', 'item', 'sum']

export function unitLabel(unit) {
  const u = UNITS[normalizeUnit(unit)]
  return u ? `${normalizeUnit(unit)} — ${u.label}` : unit
}
