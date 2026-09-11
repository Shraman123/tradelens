import type { Analysis, Narration, OrderRow, PersonaData, PersonaMeta } from "../types"
import { parseOrdersCsv } from "../lib/orders"

import arjunAnalysis from "./arjun_revenge_sizer_analysis.json"
import arjunNarration from "./arjun_revenge_sizer_narration.json"
import arjunOrdersCsv from "./arjun_revenge_sizer_orders_jul-aug-2026.csv?raw"
import nehaAnalysis from "./neha_expiry_day_analysis.json"
import nehaNarration from "./neha_expiry_day_narration.json"
import nehaOrdersCsv from "./neha_expiry_day_orders_jul-aug-2026.csv?raw"
import vikramAnalysis from "./vikram_control_analysis.json"
import vikramNarration from "./vikram_control_narration.json"
import vikramOrdersCsv from "./vikram_control_orders_jul-aug-2026.csv?raw"
import saraAnalysis from "./sara_thin_data_analysis.json"
import saraNarration from "./sara_thin_data_narration.json"
import saraOrdersCsv from "./sara_thin_data_orders_jul-aug-2026.csv?raw"

// Metadata for the persona switcher — name, one-line description, and what
// state each demonstrates. Sourced from habit_library.md's eval-persona table
// and the build brief's four-states table; not derived from the JSON since
// the JSON has no notion of "what this is a demo of".
const META: PersonaMeta[] = [
  {
    id: "arjun_revenge_sizer",
    name: "Arjun",
    oneLiner: "Sizes up after a loss, and averages down on losing positions.",
    demonstrates: "Confirmed habit + a second pattern still only “watching”",
  },
  {
    id: "neha_expiry_day",
    name: "Neha",
    oneLiner: "Cheap expiry-day options are where most of the damage happens.",
    demonstrates: "One confirmed habit",
  },
  {
    id: "vikram_control",
    name: "Vikram",
    oneLiner: "Losing money, but no repeatable pattern in how he trades.",
    demonstrates: "Nothing found — the product says so, honestly",
  },
  {
    id: "sara_thin_data",
    name: "Sara",
    oneLiner: "Only a handful of trades so far this window.",
    demonstrates: "Not enough data to call anything a habit",
  },
]

const RAW: Record<string, { analysis: Analysis; narration: Narration; orders: OrderRow[] }> = {
  arjun_revenge_sizer: { analysis: arjunAnalysis as Analysis, narration: arjunNarration as Narration, orders: parseOrdersCsv(arjunOrdersCsv) },
  neha_expiry_day: { analysis: nehaAnalysis as Analysis, narration: nehaNarration as Narration, orders: parseOrdersCsv(nehaOrdersCsv) },
  vikram_control: { analysis: vikramAnalysis as Analysis, narration: vikramNarration as Narration, orders: parseOrdersCsv(vikramOrdersCsv) },
  sara_thin_data: { analysis: saraAnalysis as Analysis, narration: saraNarration as Narration, orders: parseOrdersCsv(saraOrdersCsv) },
}

export const PERSONAS: PersonaData[] = META.map((meta) => ({ ...meta, ...RAW[meta.id] }))

export function getPersona(id: string): PersonaData {
  const p = PERSONAS.find((p) => p.id === id)
  if (!p) throw new Error(`unknown persona: ${id}`)
  return p
}
