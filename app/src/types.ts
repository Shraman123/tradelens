// Mirrors the shape detectors.py / export_demo.py write to demo/*_analysis.json,
// and the shape narrate.py writes to demo/*_narration.json.
// The app never recomputes any of this — it only ever renders it.

export type Confidence = "strong" | "moderate"
export type HabitKind = "costed" | "slice" | "flag_only"

/** Field set varies per detector id (see detectors.py); consumed generically. */
export type HabitEvidence = Record<string, number>

export interface ExampleTrade {
  trade_id: string
  date: string
  entry: string
  symbol: string
  entry_size_rs: number
  net_pnl: number
  averaged_down: boolean
}

export interface Habit {
  id: string
  rank?: number
  label: string
  kind: HabitKind
  confidence?: Confidence
  cost: number | null
  p_value?: number
  evidence: HabitEvidence
  counterfactual: string | null
  cost_note?: string
  n: number
  status?: "watching"
  example_trades?: ExampleTrade[]
}

export interface NotReported {
  id: string
  reason?: string
}

export interface ReviewMonthSummary {
  month: string
  closed_trades: number
  trading_days: number
  net_pnl: number
  charges: number
  win_rate: number
}

export interface Summary {
  closed_trades: number
  trading_days: number
  net_pnl: number
  gross_pnl: number
  charges: number
  win_rate: number
  ignored_orders: number
  window: string
  review_month?: ReviewMonthSummary
  materiality_bar?: number
}

export interface Analysis {
  persona: string
  summary: Summary
  insufficient_data: boolean
  message: string | null
  note: string | null
  habits: Habit[]
  also_noticed: Habit[]
  watching: Habit[]
  not_reported: NotReported[]
}

export interface NarrationEntry {
  why_it_matters?: string
  note?: string
  rule?: string
}

export interface Narration {
  persona: string
  headline: string
  habits: Record<string, NarrationEntry>
  watching: Record<string, NarrationEntry>
  also_noticed: Record<string, NarrationEntry>
  closing: string
}

export interface PersonaMeta {
  id: string
  name: string
  oneLiner: string
  demonstrates: string
}

export interface PersonaData extends PersonaMeta {
  analysis: Analysis
  narration: Narration
}
