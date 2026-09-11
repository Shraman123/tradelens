import type { PersonaData } from "../types"

interface Props {
  persona: PersonaData
  habitId: string
  onBack: () => void
}

function nextMonthLabel(reviewMonth: string | undefined): string {
  if (!reviewMonth) return "Next month"
  const [y, m] = reviewMonth.split("-").map(Number)
  const d = new Date(y, m, 1) // m is already "next month" (0-indexed Date + 1-indexed input)
  return d.toLocaleDateString("en-IN", { month: "long", year: "numeric" })
}

/**
 * Screen 5. Explicitly mocked, per the brief — this is a demo of the LOOP
 * (does the product check back on the rule?), not a second real review.
 * No detector ran, no order history was analyzed; "3 times in 21 days" is
 * fixed illustrative text, not a number pulled from any JSON. The label
 * saying so stays visible the whole time this screen is on screen, not just
 * on first glance.
 */
export function NextMonthPreviewScreen({ persona, habitId, onBack }: Props) {
  const rule = persona.narration.habits[habitId]?.rule
  const month = nextMonthLabel(persona.analysis.summary.review_month?.month)

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <button type="button" onClick={onBack} className="text-sm text-neutral-400 hover:text-neutral-200">
        ← Back to review
      </button>

      <div className="rounded-lg border border-dashed border-neutral-700 bg-neutral-900/50 px-3 py-2">
        <p className="text-xs font-medium text-neutral-400">
          Mock preview — illustrates the loop, not a real generated review. No order history for {month} exists yet.
        </p>
      </div>

      <div>
        <p className="text-xs text-neutral-500">{month} review (preview)</p>
        <h1 className="mt-1 text-xl font-semibold text-neutral-50">You broke this rule 3 times in 21 trading days.</h1>
        <p className="mt-3 text-sm text-neutral-400">The rule you committed to last review:</p>
        <p className="mt-1 text-sm font-medium text-neutral-200">{rule}</p>
      </div>

      <p className="border-t border-neutral-800 pt-4 text-sm text-neutral-400">
        This is the point of a review that comes back — not just pricing a habit once, but checking whether the rule
        actually held. A real {month} review would run the same detectors on your real order history for that month.
      </p>
    </div>
  )
}
