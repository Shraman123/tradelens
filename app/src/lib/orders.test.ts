import { describe, it, expect } from "vitest"
import { PERSONAS } from "../data/personas"
import { legsForTrade } from "./orders"
import type { OrderRow } from "../types"

// Charges model, copied for verification only from generate_personas.py
// (BROKERAGE_PER_ORDER, SELL_SIDE_LEVY, TURNOVER_LEVY, position_charges) and
// the P&L definition in detectors.py's _position(). This is the ONE place
// the app does arithmetic instead of only displaying it — legsForTrade's
// position grouping duplicates detectors.py's normalize(), and a duplicate
// can silently drift from the original. This test is the guard: it runs the
// TS grouping over all four real CSVs and asserts every single example_trade
// in every shipped analysis.json reproduces its own entry_size_rs and
// net_pnl, computed independently from the raw orders the TS found. If
// normalize() and this ever disagree, this test fails — not a demo user
// staring at a drill-down that doesn't add up to the card above it.
function chargesFor(legs: OrderRow[]) {
  const buys = legs.filter((l) => l.side === "BUY")
  const sells = legs.filter((l) => l.side === "SELL")
  const buyTurnover = buys.reduce((s, l) => s + l.qty * l.price, 0)
  const sellTurnover = sells.reduce((s, l) => s + l.qty * l.price, 0)
  const charges = 20 * legs.length + 0.001 * sellTurnover + 0.0005 * (buyTurnover + sellTurnover)
  const entrySize = buys[0].qty * buys[0].price
  const netPnl = sellTurnover - buyTurnover - charges
  return { entrySize, netPnl }
}

describe("legsForTrade reproduces detectors.py's normalize() output", () => {
  for (const persona of PERSONAS) {
    const trades = persona.analysis.habits.flatMap((h) => h.example_trades ?? [])
    if (trades.length === 0) continue

    describe(persona.id, () => {
      for (const trade of trades) {
        it(`${trade.trade_id} (${trade.symbol} @ ${trade.date} ${trade.entry})`, () => {
          const legs = legsForTrade(persona.orders, trade.symbol, trade.date, trade.entry)
          expect(legs.length, "no matching raw orders found for this example_trade").toBeGreaterThan(0)

          const { entrySize, netPnl } = chargesFor(legs)
          expect(Math.round(entrySize)).toBe(trade.entry_size_rs)
          expect(Math.round(netPnl)).toBe(trade.net_pnl)
        })
      }
    })
  }
})
