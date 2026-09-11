// Formatting for numbers the APP renders directly from analysis.json (the
// three headline numbers, habit cost, the evidence table). This is separate
// from — and mirrors — the Indian-grouping/percent logic narrate.py applies
// before numbers reach the narration LLM: the UI needs the same formatting
// for the numbers it renders straight from the JSON, without going through
// narration prose at all.

/** Indian digit grouping: 105732 -> "1,05,732". */
export function inr(n: number): string {
  const sign = n < 0 ? "-" : ""
  const s = Math.round(Math.abs(n)).toString()
  if (s.length <= 3) return sign + s
  const last3 = s.slice(-3)
  let rest = s.slice(0, -3)
  const parts: string[] = []
  while (rest.length > 2) {
    parts.unshift(rest.slice(-2))
    rest = rest.slice(0, -2)
  }
  if (rest) parts.unshift(rest)
  return sign + parts.join(",") + "," + last3
}

export function rupees(n: number): string {
  return `₹${inr(n)}`
}

/** For a stat tile: a plain signed amount, "-₹95,192" — no phrase, no color
 * coding (the brief reserves the one accent colour for a habit's cost, not
 * for a generic red/green ticker treatment of every number on the page). */
export function rupeesPlain(n: number): string {
  const sign = n < 0 ? "-" : ""
  return `${sign}₹${inr(Math.abs(n))}`
}

/** For a signed rupee figure (net P&L style): "a loss of ₹95,192" / "a gain of ₹4,200". */
export function rupeesSigned(n: number): string {
  const v = Math.round(n)
  if (v < 0) return `a loss of ${rupees(-v)}`
  if (v > 0) return `a gain of ${rupees(v)}`
  return "₹0"
}

/** A 0-1 rate as a whole-number percent: 0.337 -> "34%". */
export function pct(n: number): string {
  return `${Math.round(n * 100)}%`
}

/** A signed rate/return, compact for a table cell: -0.277 -> "-28%". */
export function pctSigned(n: number): string {
  const v = Math.round(n * 100)
  return v > 0 ? `+${v}%` : `${v}%`
}

export function ratio(n: number): string {
  return `${n.toFixed(2)}x`
}

export function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00")
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}

/** summary.window is "2026-07-01 to 2026-08-31" -> "1 Jul – 31 Aug 2026". */
export function formatWindow(window: string): string {
  const [start, end] = window.split(" to ")
  if (!start || !end) return window
  const s = new Date(start + "T00:00:00")
  const e = new Date(end + "T00:00:00")
  const sameYear = s.getFullYear() === e.getFullYear()
  const startLabel = s.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: sameYear ? undefined : "numeric" })
  const endLabel = e.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
  return `${startLabel} – ${endLabel}`
}
