export function formatCurrency(amount: number, currency = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount)
}

/** Formats a plain "YYYY-MM-DD" date (no time component) without any UTC/local timezone shift. */
export function formatShortDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

/** Round to paise/cents and distribute the leftover so shares sum exactly to `total`. */
export function splitEqually(total: number, count: number): number[] {
  if (count <= 0) return []
  const base = Math.floor((total / count) * 100) / 100
  const shares = new Array(count).fill(base)
  const remainder = Math.round((total - base * count) * 100)
  for (let i = 0; i < remainder; i++) {
    shares[i] = Math.round((shares[i] + 0.01) * 100) / 100
  }
  return shares
}

export function splitByPercentage(total: number, percentages: number[]): number[] {
  const raw = percentages.map((p) => Math.round(total * (p / 100) * 100) / 100)
  const diff = Math.round((total - raw.reduce((a, b) => a + b, 0)) * 100) / 100
  if (raw.length > 0) raw[0] = Math.round((raw[0] + diff) * 100) / 100
  return raw
}
