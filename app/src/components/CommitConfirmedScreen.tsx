import type { PersonaData } from "../types"

interface Props {
  persona: PersonaData
  habitId: string
  onBack: () => void
  onPreview: () => void
}

export function CommitConfirmedScreen({ persona, habitId, onBack, onPreview }: Props) {
  const rule = persona.narration.habits[habitId]?.rule

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <button type="button" onClick={onBack} className="text-sm text-neutral-400 hover:text-neutral-200">
        ← Back to review
      </button>

      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5">
        <p className="text-[11px] uppercase tracking-wide text-amber-400/80">Committed for next month</p>
        <p className="mt-2 text-lg font-medium text-neutral-50">{rule}</p>
        <p className="mt-3 text-sm text-neutral-400">
          Next month's review opens by checking whether you kept this rule.
        </p>
      </div>

      <button
        type="button"
        onClick={onPreview}
        className="w-full rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 text-sm font-medium text-neutral-200 transition-colors hover:border-neutral-600"
      >
        See how next month's review would open →
      </button>
    </div>
  )
}
