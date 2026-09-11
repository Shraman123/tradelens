import { useState } from "react"
import type { PersonaData } from "../types"
import { rupees } from "../lib/format"

interface Props {
  persona: PersonaData
  onBack: () => void
}

/**
 * Screen 4. Only ever reached when analysis.habits is non-empty — the
 * Review screen doesn't render the entry CTA otherwise (Vikram/Sara have
 * nothing to commit to), and this returns null as a defensive fallback if
 * it's ever reached without a habit anyway.
 */
export function CommitScreen({ persona, onBack }: Props) {
  const { analysis, narration } = persona
  const habits = analysis.habits // already ranked; habits[0] is rank #1
  const [selectedId, setSelectedId] = useState(habits[0]?.id)
  const [confirmed, setConfirmed] = useState(false)

  if (habits.length === 0) return null

  const selected = habits.find((h) => h.id === selectedId) ?? habits[0]
  const selectedRule = narration.habits[selected.id]?.rule

  if (confirmed) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        <button type="button" onClick={onBack} className="text-sm text-neutral-400 hover:text-neutral-200">
          ← Back to review
        </button>
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5">
          <p className="text-[11px] uppercase tracking-wide text-amber-400/80">Committed for next month</p>
          <p className="mt-2 text-lg font-medium text-neutral-50">{selectedRule}</p>
          <p className="mt-3 text-sm text-neutral-400">
            Next month's review opens by checking whether you kept this rule.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <button type="button" onClick={onBack} className="text-sm text-neutral-400 hover:text-neutral-200">
        ← Back to review
      </button>

      <div>
        <h1 className="text-xl font-semibold text-neutral-50">Commit to one rule</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Pick the rule you'll follow for next month. One rule only — next month's review checks whether you kept it.
        </p>
      </div>

      <div className="space-y-2">
        {habits.map((h) => {
          const rule = narration.habits[h.id]?.rule
          const active = h.id === selectedId
          return (
            <button
              key={h.id}
              type="button"
              onClick={() => setSelectedId(h.id)}
              aria-pressed={active}
              className={`w-full rounded-xl border p-4 text-left transition-colors ${
                active
                  ? "border-amber-500/60 bg-amber-500/10"
                  : "border-neutral-800 bg-neutral-900 hover:border-neutral-700"
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                    active ? "border-amber-400" : "border-neutral-600"
                  }`}
                >
                  {active && <span className="h-2 w-2 rounded-full bg-amber-400" />}
                </span>
                <div>
                  <p className="text-xs text-neutral-500">
                    Habit #{h.rank} · {h.label}
                    {h.cost != null && <> · {rupees(h.cost)}</>}
                  </p>
                  <p className="mt-0.5 text-sm font-medium text-neutral-100">{rule}</p>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      <button
        type="button"
        onClick={() => setConfirmed(true)}
        className="w-full rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-neutral-950 transition-colors hover:bg-amber-400"
      >
        Commit to this rule
      </button>
    </div>
  )
}
