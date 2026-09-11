// Mirrors the `label` strings detectors.py assigns each detector id.
// Needed because export_demo.py's `not_reported` entries carry only
// {id, reason} (see detectors.py / export_demo.py) — not the label — so the
// "what we checked and ruled out" list needs its own lookup to be readable.
// Not derived data, just a display convenience; detectors.py is the source
// of truth for the strings themselves and is left untouched.
export const HABIT_LABELS: Record<string, string> = {
  size_up_after_loss: "Sizes up on the trade after a loss",
  averaging_down: "Adds to losing positions (averaging down)",
  expiry_day_trading: "Loses on expiry-day (0DTE) trades",
  fast_reentry_after_loss: "Jumps back in within minutes of a loss",
  late_session_trading: "Late-session trades (after 2:30 PM) lose money",
  overtrading: "Trades from the 7th of the day onwards lose money",
  holds_losers_longer: "Holds losing trades much longer than winners",
}

export function habitLabel(id: string): string {
  return HABIT_LABELS[id] ?? id
}
