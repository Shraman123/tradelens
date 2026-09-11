// Human-readable label + formatter per evidence field name. Mirrors
// detectors.py's evidence dict keys exactly (d_size_up_after_loss,
// d_averaging_down, _slice_habit, d_disposition) — a display-only lookup,
// same spirit as habitLabels.ts and narrate.py's own EVIDENCE_FORMATTERS
// (that one produces prose fragments for the LLM; this one produces compact
// table-cell values for the app's own evidence table).
import { rupees, rupeesPlain, pct, pctSigned, ratio } from "../lib/format"

type Formatter = (v: number) => string

interface FieldSpec {
  label: string
  format: Formatter
}

const FIELDS: Record<string, FieldSpec> = {
  after_loss_trades: { label: "After-loss trades", format: (v) => String(v) },
  median_entry_size_after_loss: { label: "Median entry size after a loss", format: rupees },
  median_entry_size_otherwise: { label: "Median entry size otherwise", format: rupees },
  size_ratio: { label: "Size ratio", format: ratio },
  after_loss_net: { label: "Net P&L on after-loss trades", format: rupeesPlain },
  after_loss_win_rate: { label: "Win rate after a loss", format: pct },
  other_win_rate: { label: "Win rate otherwise", format: pct },

  averaged_positions: { label: "Positions averaged down", format: (v) => String(v) },
  added_leg_loss_rate: { label: "Added-leg loss rate", format: pct },
  added_leg_avg_return: { label: "Added-leg average return", format: pctSigned },
  other_trades_avg_return: { label: "Other trades' average return", format: pctSigned },
  net_on_these_positions: { label: "Net P&L on these positions", format: rupeesPlain },

  slice_trades: { label: "Trades in this slice", format: (v) => String(v) },
  slice_net: { label: "Net P&L on this slice", format: rupeesPlain },
  slice_avg: { label: "Average P&L per trade", format: rupeesPlain },
  slice_win_rate: { label: "Win rate", format: pct },
  slice_avg_return: { label: "Average return", format: pctSigned },
  rest_trades: { label: "Other trades", format: (v) => String(v) },
  rest_avg: { label: "Average P&L per trade, other trades", format: rupeesPlain },
  rest_win_rate: { label: "Win rate, other trades", format: pct },
  rest_avg_return: { label: "Average return, other trades", format: pctSigned },

  median_hold_losers_min: { label: "Median hold, losers", format: (v) => `${v} min` },
  median_hold_winners_min: { label: "Median hold, winners", format: (v) => `${v} min` },
  hold_ratio: { label: "Hold ratio", format: ratio },
}

export function evidenceRows(evidence: Record<string, number>): { label: string; value: string }[] {
  return Object.entries(evidence).map(([key, v]) => {
    const spec = FIELDS[key]
    return spec ? { label: spec.label, value: spec.format(v) } : { label: key, value: String(v) }
  })
}
