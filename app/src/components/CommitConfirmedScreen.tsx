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
      <button type="button" onClick={onBack} className="text-sm text-neutral-400 transition-colors hover:text-neutral-200">
        ← Back to review
      </button>

      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5">
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0 text-amber-400">
            <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.4" />
            <path d="M5 8.2 7.1 10.3 11.2 5.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className="text-[11px] uppercase tracking-wide text-amber-400/80">Committed for next month</p>
        </div>
        <p className="mt-2 text-lg font-medium tracking-tight text-neutral-50">{rule}</p>
        <p className="mt-3 text-sm text-neutral-400">
          Next month's review opens by checking whether you kept this rule.
        </p>
      </div>

      <button
        type="button"
        onClick={onPreview}
        className="group w-full rounded-2xl border border-neutral-700 bg-neutral-900 px-4 py-3 text-sm font-medium text-neutral-200 transition-colors hover:border-neutral-600"
      >
        See how next month's review would open
        <span className="ml-1 inline-block transition-transform group-hover:translate-x-0.5">→</span>
      </button>
    </div>
  )
}
