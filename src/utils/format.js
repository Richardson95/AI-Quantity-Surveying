export function formatMoney(value, currency = '₦') {
  if (value == null) return '—'
  const abs = Math.abs(value)
  let out
  if (abs >= 1_000_000_000) out = (value / 1_000_000_000).toFixed(2) + 'B'
  else if (abs >= 1_000_000) out = (value / 1_000_000).toFixed(1) + 'M'
  else if (abs >= 1_000) out = (value / 1_000).toFixed(0) + 'K'
  else out = value.toFixed(0)
  return currency + out
}

export function formatFull(value, currency = '₦') {
  if (value == null) return '—'
  return currency + value.toLocaleString('en-NG')
}

export function formatNumber(value) {
  return Number(value).toLocaleString('en-NG')
}

/**
 * "12 min ago" from a timestamp. Anything unparseable is passed straight
 * through rather than rendered as "Invalid Date".
 */
export function timeAgo(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)

  const mins = Math.round((Date.now() - d.getTime()) / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins} min ago`
  if (mins < 1440) return `${Math.round(mins / 60)} hr ago`
  if (mins < 2880) return 'Yesterday'
  if (mins < 10080) return `${Math.round(mins / 1440)} days ago`
  return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })
}
