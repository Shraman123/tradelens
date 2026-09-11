import type { Habit, NotReported, PersonaData, Summary } from "../types"
import { habitLabel } from "../data/habitLabels"
import { pct, rupees, rupeesPlain, formatWindow } from "../lib/format"

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2.5">
      <p className="text-[11px] uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-0.5 text-lg font-semibold text-neutral-100">{value}</p>
    </div>
  )
}

function StatRow({ summary }: { summary: Summary }) {
  const rm = summary.review_month
  if (!rm) return null
  return (
    <div className="grid grid-cols-3 gap-2">
      <Stat label="Net P&L" value={rupeesPlain(rm.net_pnl)} />
      <Stat label="Trades" value={String(rm.closed_trades)} />
      <Stat label="Win rate" value={pct(rm.win_rate)} />
    </div>
  )
}

function HabitCard({
  habit, note, rule, onOpen,
}: { habit: Habit; note?: string; rule?: string; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-xl border border-neutral-800 bg-neutral-900 p-4 text-left transition-colors hover:border-neutral-700"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
            Habit #{habit.rank}
          </span>
          <h3 className="mt-0.5 text-base font-medium text-neutral-100">{habit.label}</h3>
        </div>
        {habit.confidence && (
          <span className="shrink-0 rounded-full border border-neutral-700 px-2 py-0.5 text-[11px] text-neutral-400">
            {habit.confidence} confidence
          </span>
        )}
      </div>
      {habit.cost != null && <p className="mt-3 text-2xl font-semibold text-amber-400">{rupees(habit.cost)}</p>}
      {note && <p className="mt-2 text-sm leading-relaxed text-neutral-300">{note}</p>}
      {rule && (
        <div className="mt-4 rounded-lg bg-neutral-800/60 px-3 py-2">
          <p className="text-[11px] uppercase tracking-wide text-neutral-500">Rule for next month</p>
          <p className="mt-0.5 text-sm text-neutral-100">{rule}</p>
        </div>
      )}
      <p className="mt-3 text-xs font-medium text-amber-400/80">View evidence & example trades →</p>
    </button>
  )
}

function LightItem({
  kicker, habit, note, footnote,
}: { kicker: string; habit: Habit; note?: string; footnote?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-neutral-700 bg-neutral-900/50 p-4">
      <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">{kicker}</span>
      <h4 className="mt-0.5 text-sm font-medium text-neutral-200">{habit.label}</h4>
      {note && <p className="mt-1.5 text-sm text-neutral-400">{note}</p>}
      {footnote && <p className="mt-1.5 text-xs text-neutral-600">{footnote}</p>}
    </div>
  )
}

function NotReportedList({ items }: { items: NotReported[] }) {
  if (!items.length) return null
  return (
    <details className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
      <summary className="cursor-pointer text-sm font-medium text-neutral-300">
        What we checked and ruled out ({items.length})
      </summary>
      <ul className="mt-3 space-y-2 border-t border-neutral-800 pt-3">
        {items.map((item) => (
          <li key={item.id} className="text-sm text-neutral-400">
            <span className="text-neutral-300">{habitLabel(item.id)}</span>
            {item.reason && <span> — {item.reason}</span>}
          </li>
        ))}
      </ul>
    </details>
  )
}

interface Props {
  persona: PersonaData
  onOpenHabit: (id: string) => void
  onCommit: () => void
}

export function ReviewScreen({ persona, onOpenHabit, onCommit }: Props) {
  const { analysis, narration } = persona
  const hasHabits = analysis.habits.length > 0

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <div>
        <p className="text-xs text-neutral-500">Review · based on {formatWindow(analysis.summary.window)}</p>
        <h1 className="mt-1 text-xl font-semibold text-neutral-50">{narration.headline}</h1>
        {analysis.insufficient_data && analysis.message && (
          <p className="mt-2 text-sm text-neutral-400">{analysis.message}</p>
        )}
      </div>

      <StatRow summary={analysis.summary} />

      {hasHabits && (
        <div className="space-y-3">
          {analysis.habits.map((h) => (
            <HabitCard
              key={h.id}
              habit={h}
              note={narration.habits[h.id]?.why_it_matters}
              rule={narration.habits[h.id]?.rule}
              onOpen={() => onOpenHabit(h.id)}
            />
          ))}
        </div>
      )}

      {analysis.watching.length > 0 && (
        <div className="space-y-3">
          {analysis.watching.map((h) => (
            <LightItem key={h.id} kicker="Watching" habit={h} note={narration.watching[h.id]?.note} />
          ))}
        </div>
      )}

      {analysis.also_noticed.length > 0 && (
        <div className="space-y-3">
          {analysis.also_noticed.map((h) => (
            <LightItem
              key={h.id}
              kicker="Also noticed"
              habit={h}
              note={narration.also_noticed[h.id]?.note}
              footnote={h.cost_note}
            />
          ))}
        </div>
      )}

      <NotReportedList items={analysis.not_reported} />

      <p className="border-t border-neutral-800 pt-4 text-sm text-neutral-400">{narration.closing}</p>

      {/* No habits -> nothing to commit to. Vikram/Sara never see this CTA,
          not a disabled version of it — there is no Commit screen for them. */}
      {hasHabits && (
        <button
          type="button"
          onClick={onCommit}
          className="w-full rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-400 transition-colors hover:bg-amber-500/20"
        >
          Commit to a rule for next month
        </button>
      )}
    </div>
  )
}
