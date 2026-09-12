// Labels and reason text for the Review screen's "what we checked and ruled
// out" list (see NotReportedList in ReviewScreen.tsx). This is the ONLY
// consumer of this file — a confirmed habit's own card uses detectors.py's
// `label` field directly (see HabitCard/LightItem), not this mapping.
//
// Sourced from habit_library.md's "What the trader sees" column, trimmed to
// third person to match the rest of the screen's voice (habit_library.md
// itself writes these in second person, e.g. "You size up on the trade
// right after a loss.", since that's the design-rationale doc's own voice
// for describing a habit to the trader; the UI has never used "you" in a
// label anywhere else). Not detectors.py's `label` string, which exists for
// a different purpose (see detectors.py's d_size_up_after_loss etc.) and
// happens to already read fine on a confirmed habit's own card.
export const HABIT_LABELS: Record<string, string> = {
  size_up_after_loss: "Sizes up on the trade right after a loss",
  averaging_down: "Adds to positions that are already losing",
  expiry_day_trading: "Expiry-day trades are where the money goes",
  fast_reentry_after_loss: "Jumps back in within minutes of a loss",
  late_session_trading: "Late-session trades lose money",
  overtrading: "Trades after the 6th of the day lose money",
  holds_losers_longer: "Holds losers much longer than winners",
}

export function habitLabel(id: string): string {
  return HABIT_LABELS[id] ?? id
}

// detectors.py's `not_reported[].reason` is a short, code-facing string
// (e.g. "p=0.045 >= 0.01 (could be noise)", "size ratio 1.00 < 1.3") meant
// for someone reading detectors.py's own eval output, not a trader reading
// the app. This turns each of the fixed formats detectors.py emits (see
// detectors.py's `reason=` assignments) into a plain-English sentence.
//
// Nothing here is invented: every number detectors.py put in the string is
// still the source of truth (this function only drops or rewords it, never
// substitutes a different one), and an unrecognised format falls back to
// showing the raw string rather than hiding information.
//
// `labelFor` resolves the *other* habit named in an "explained by X
// (confounded)" reason — passed in by the caller so it can look up that
// habit's real, currently-displayed `label` (from analysis.habits) instead
// of guessing; falls back to `habitLabel` if that habit isn't in view.
export function humanizeReason(reason: string, labelFor: (id: string) => string = habitLabel): string {
  let m: RegExpMatchArray | null

  if (/^p=[\d.]+ >= [\d.]+ \(could be noise\)$/.test(reason)) {
    return "happened sometimes, but not consistently enough across your trades to call it a pattern"
  }

  if (/^size ratio [\d.]+ < [\d.]+$/.test(reason)) {
    return "the size difference was within normal variation"
  }

  if (/^hold ratio [\d.]+ < [\d.]+$/.test(reason)) {
    return "how long you held winners versus losers wasn't meaningfully different"
  }

  if ((m = reason.match(/^slice n=(\d+) < \d+$/))) {
    const n = Number(m[1])
    return n === 0
      ? "didn't happen this window"
      : `only ${n} trade${n === 1 ? "" : "s"} fit this check — too few to tell either way`
  }

  if ((m = reason.match(/^only (\d+) averaged-down positions$/))) {
    const n = Number(m[1])
    return n === 0
      ? "didn't happen this window"
      : `only ${n} instance${n === 1 ? "" : "s"} — too few to tell either way`
  }

  if ((m = reason.match(/^explained by (\w+) \(confounded\)$/))) {
    return `already showing up as part of “${labelFor(m[1])}” above — not a separate pattern`
  }

  if (reason === "not enough after-loss trades" || reason === "not enough winners/losers") {
    return "too few trades in this situation to tell either way"
  }

  if (/^cost Rs[\d.]+ < materiality bar Rs[\d.]+$/.test(reason)) {
    return "too small an amount to be worth calling out"
  }

  return reason
}
