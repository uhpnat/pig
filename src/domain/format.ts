export const TZ_DEFAULT = 'Asia/Ho_Chi_Minh'

export const vnd = (n: number) => `${Math.round(n).toLocaleString('vi-VN')}đ`
export const vndSigned = (n: number) => `+${vnd(n)}`
export const millions = (n: number) => `${(n / 1e6).toFixed(1).replace('.', ',')}tr`
export const pct = (n: number, digits = 1) => `${n.toFixed(digits).replace('.', ',')}%`
export const parseMoney = (v: string) => Number(v.replace(/\D/g, '')) || 0
export const formatMoneyInput = (n: number) => (n ? n.toLocaleString('vi-VN') : '')

/** yyyy-mm-dd in a timezone */
export function todayIn(tz = TZ_DEFAULT, now = new Date()): string {
  return now.toLocaleDateString('sv-SE', { timeZone: tz })
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function addMonths(date: string, months: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  const day = d.getUTCDate()
  d.setUTCDate(1)
  d.setUTCMonth(d.getUTCMonth() + months)
  const dim = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate()
  d.setUTCDate(Math.min(day, dim))
  return d.toISOString().slice(0, 10)
}

export function diffDays(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 864e5)
}

export function daysInMonth(date: string): number {
  const [y, m] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}

export function weekStart(date: string): string {
  const d = new Date(`${date}T00:00:00Z`)
  const dow = (d.getUTCDay() + 6) % 7 // Monday=0
  return addDays(date, -dow)
}

export function fmtDate(date: string): string {
  const [y, m, d] = date.split('-')
  return `${d}/${m}/${y}`
}

export function fmtLongDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('vi-VN', {
    timeZone: 'UTC',
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function fmtDateTime(iso: string, tz = TZ_DEFAULT): string {
  return new Date(iso).toLocaleString('vi-VN', { timeZone: tz, hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })
}

export function durationLabel(months: number): string {
  if (months % 12 === 0) return `${months / 12} năm`
  return `${months} tháng`
}

export const uid = (p = 'id') => `${p}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`

export const monthKeyOf = (d: string) => d.slice(0, 7)
