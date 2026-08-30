// ---------------------------------------------------------------------------
// Takeoff helpers.
// ---------------------------------------------------------------------------
// What used to live here as well: `detectMeasurements()`, which produced
// quantities from a template matched on the FILE NAME and scaled by a hash of
// the name and size. It never read a drawing. It is gone — the engine in the
// backend reads the actual file, and where it cannot, the app says so rather
// than substituting a plausible-looking number.
// ---------------------------------------------------------------------------

export const UNIT_FOR_TYPE = { Linear: 'm', Area: 'm²', Volume: 'm³', Count: 'no' }
export const COLOR_FOR_TYPE = { Linear: '#2DC875', Area: '#1CA5F6', Volume: '#FFA726', Count: '#E63946' }

/**
 * The numeric part of a measurement. The server sends `numeric` alongside the
 * formatted `value`; anything else is parsed out of the string.
 */
export function numericValue(measurement) {
  if (typeof measurement.numeric === 'number') return measurement.numeric
  const n = parseFloat(String(measurement.value).replace(/[^\d.\-]/g, ''))
  return Number.isFinite(n) ? n : 0
}
