import type { OrderRow } from "../types"

/** order_id,timestamp,symbol,side,qty,price,status — no quoted/escaped
 * fields anywhere in this data (symbol has spaces but never commas), so a
 * plain split is safe; no CSV library needed for this shape. */
export function parseOrdersCsv(text: string): OrderRow[] {
  const lines = text.trim().split("\n")
  const header = lines[0].split(",")
  return lines.slice(1).map((line) => {
    const cells = line.split(",")
    const row = Object.fromEntries(header.map((h, i) => [h, cells[i]])) as unknown as OrderRow
    row.qty = Number(row.qty)
    row.price = Number(row.price)
    return row
  })
}

/**
 * Replicates detectors.py's normalize(): orders for one symbol are grouped,
 * in timestamp order, into flat-to-flat runs (running net qty: +qty on BUY,
 * -qty on SELL, a run ends the instant net returns to 0) — that run IS one
 * closed position. This finds the specific run whose first leg matches an
 * example_trade's (date, entry time), i.e. the exact raw orders behind one
 * priced trade. Display-only: it never feeds a number back into the app,
 * it only shows the underlying orders for a cost detectors.py already
 * computed — the "link to view each raw order" the brief asks for, done as
 * an in-app viewer since a static site can't deep-link into a CSV download.
 */
export function legsForTrade(orders: OrderRow[], symbol: string, date: string, entryHHMM: string): OrderRow[] {
  const rows = orders
    .filter((o) => o.symbol === symbol && o.status === "COMPLETE")
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))

  let net = 0
  let run: OrderRow[] = []
  for (const r of rows) {
    run.push(r)
    net += r.side === "BUY" ? r.qty : -r.qty
    if (net === 0) {
      const [d, t] = run[0].timestamp.split(" ")
      if (d === date && t.slice(0, 5) === entryHHMM) return run
      run = []
    }
  }
  return []
}
