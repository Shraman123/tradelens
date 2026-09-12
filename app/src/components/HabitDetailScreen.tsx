import { useState } from "react"
import type { ExampleTrade, OrderRow, PersonaData } from "../types"
import { legsForTrade } from "../lib/orders"
import { rupees, rupeesPlain, formatDate } from "../lib/format"
import { evidenceRows } from "../data/evidenceFields"

function OrderLegs({ trade, orders }: { trade: ExampleTrade; orders: OrderRow[] }) {
  const [open, setOpen] = useState(false)
  const legs = open ? legsForTrade(orders, trade.symbol, trade.date, trade.entry) : []

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="text-xs font-medium text-amber-400 underline decoration-amber-400/40 underline-offset-2 hover:text-amber-300"
      >
        {open ? "Hide raw orders" : "View raw orders"}
      </button>
      {open && (
        <div className="mt-2 overflow-x-auto rounded-lg border border-neutral-800">
          {legs.length === 0 ? (
            <p className="px-2 py-2 text-xs text-neutral-600">No matching raw orders found.</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-neutral-800 text-neutral-500">
                  <th className="px-2 py-1.5 text-left font-medium">Time</th>
                  <th className="px-2 py-1.5 text-left font-medium">Side</th>
                  <th className="px-2 py-1.5 text-right font-medium">Qty</th>
                  <th className="px-2 py-1.5 text-right font-medium">Price</th>
                </tr>
              </thead>
              <tbody>
                {legs.map((l) => (
                  <tr key={l.order_id} className="border-b border-neutral-900 last:border-0">
                    <td className="tabular-nums px-2 py-1.5 text-neutral-400">{l.timestamp.slice(11, 16)}</td>
                    <td className="px-2 py-1.5 text-neutral-300">{l.side}</td>
                    <td className="tabular-nums px-2 py-1.5 text-right text-neutral-300">{l.qty}</td>
                    <td className="tabular-nums px-2 py-1.5 text-right text-neutral-300">₹{l.price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}

function ExampleTradeRow({ trade, orders }: { trade: ExampleTrade; orders: OrderRow[] }) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-3 transition-colors hover:border-neutral-700">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-neutral-200">{trade.symbol}</p>
          <p className="text-xs text-neutral-500">
            {formatDate(trade.date)} · {trade.entry}
          </p>
        </div>
        <p className="tabular-nums shrink-0 text-sm font-medium text-neutral-300">{rupeesPlain(trade.net_pnl)}</p>
      </div>
      <OrderLegs trade={trade} orders={orders} />
    </div>
  )
}

interface Props {
  persona: PersonaData
  habitId: string
  onBack: () => void
}

/**
 * Screen 3: evidence table, the counterfactual + cost, the rule, and the
 * five example trades with a drill-down into their raw orders. Only reached
 * from a ranked (confirmed) habit — watching/also_noticed entries carry no
 * `example_trades` in the JSON (export_demo.py only attaches examples() to
 * res["habits"]), so they stay lightweight notes on the Review screen and
 * never link here.
 */
export function HabitDetailScreen({ persona, habitId, onBack }: Props) {
  const habit = persona.analysis.habits.find((h) => h.id === habitId)
  const narr = persona.narration.habits[habitId]
  if (!habit) return null

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <button type="button" onClick={onBack} className="text-sm text-neutral-400 transition-colors hover:text-neutral-200">
        ← Back to review
      </button>

      <div>
        <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">Habit #{habit.rank}</span>
        <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-neutral-50">{habit.label}</h1>
        {habit.confidence && (
          <span className="mt-2 inline-block rounded-full border border-neutral-700 bg-neutral-900 px-2 py-0.5 text-[11px] text-neutral-400">
            {habit.confidence} confidence
          </span>
        )}
      </div>

      {habit.cost != null && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
          <p className="text-[11px] uppercase tracking-wide text-amber-400/80">What this cost you</p>
          <p className="tabular-nums mt-1 text-2xl font-semibold tracking-tight text-amber-400">{rupees(habit.cost)}</p>
          {habit.counterfactual && <p className="mt-2 text-xs text-neutral-500">{habit.counterfactual}</p>}
        </div>
      )}

      <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
        <p className="mb-3 text-[11px] uppercase tracking-wide text-neutral-500">Evidence</p>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
          {evidenceRows(habit.evidence).map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-3 border-b border-neutral-800/60 py-1.5 sm:border-0 sm:py-0">
              <dt className="text-sm text-neutral-400">{row.label}</dt>
              <dd className="tabular-nums text-sm font-medium text-neutral-100">{row.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {narr?.rule && (
        <div className="rounded-lg bg-neutral-800/60 px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-neutral-500">Rule for next month</p>
          <p className="mt-0.5 text-sm text-neutral-100">{narr.rule}</p>
        </div>
      )}

      {habit.example_trades && habit.example_trades.length > 0 && (
        <div>
          <p className="mb-2 text-[11px] uppercase tracking-wide text-neutral-500">Example trades</p>
          <div className="space-y-2">
            {habit.example_trades.map((t) => (
              <ExampleTradeRow key={t.trade_id} trade={t} orders={persona.orders} />
            ))}
          </div>
        </div>
      )}

      <p className="border-t border-neutral-800 pt-4 text-xs text-neutral-500">
        {persona.analysis.note ?? "Habit costs overlap and are never added together."}
      </p>
    </div>
  )
}
