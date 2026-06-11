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
