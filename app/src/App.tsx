import { useState } from "react"
import { PERSONAS, getPersona } from "./data/personas"
import { PersonaSwitcher } from "./components/PersonaSwitcher"
import { ReviewScreen } from "./components/ReviewScreen"
import { HabitDetailScreen } from "./components/HabitDetailScreen"
import { CommitScreen } from "./components/CommitScreen"
import { CommitConfirmedScreen } from "./components/CommitConfirmedScreen"
import { NextMonthPreviewScreen } from "./components/NextMonthPreviewScreen"

type View =
  | { screen: "review" }
  | { screen: "habitDetail"; habitId: string }
  | { screen: "commit" }
  | { screen: "commitConfirmed"; habitId: string }
  | { screen: "nextMonthPreview"; habitId: string }

export default function App() {
  const [personaId, setPersonaId] = useState(PERSONAS[0].id)
  const [view, setView] = useState<View>({ screen: "review" })
  const persona = getPersona(personaId)

  // Switching persona always drops back to that persona's Review screen —
  // a habitId (or a commit-in-progress) from one persona has no meaning
  // for another, and Vikram/Sara have no Commit screen to land on anyway.
  function selectPersona(id: string) {
    setPersonaId(id)
    setView({ screen: "review" })
  }

  // Keys the fade-in below so it replays on every navigation (persona
  // switch, opening a habit, committing) without a routing library.
  const viewKey = `${personaId}:${view.screen}:${"habitId" in view ? view.habitId : ""}`

  return (
    <div className="min-h-screen bg-neutral-950 pb-16">
      <a
        href="#main"
        className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:top-2 focus-visible:left-2 focus-visible:z-50 focus-visible:rounded-md focus-visible:bg-amber-500 focus-visible:px-3 focus-visible:py-1.5 focus-visible:text-sm focus-visible:font-medium focus-visible:text-neutral-950"
      >
        Skip to content
      </a>

      <div className="mx-auto max-w-3xl px-4 pt-5 pb-1">
        <div className="flex items-center gap-2">
          <svg width="20" height="20" viewBox="0 0 32 32" aria-hidden="true" className="shrink-0">
            <rect width="32" height="32" rx="8" fill="#171a1f" />
            <path
              d="M6.5 21.5 12.5 14.5 17.5 18.5 25.5 8.5"
              fill="none"
              stroke="#f5a623"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="25.5" cy="8.5" r="2.1" fill="#f5a623" />
          </svg>
          <span className="text-[15px] font-semibold tracking-tight text-neutral-100">TradeLens</span>
        </div>
      </div>

      <PersonaSwitcher personas={PERSONAS} selectedId={personaId} onSelect={selectPersona} />

      <main id="main" key={viewKey} className="animate-screen-in">
        {view.screen === "review" && (
          <ReviewScreen
            persona={persona}
            onOpenHabit={(habitId) => setView({ screen: "habitDetail", habitId })}
            onCommit={() => setView({ screen: "commit" })}
          />
        )}

        {view.screen === "habitDetail" && (
          <HabitDetailScreen persona={persona} habitId={view.habitId} onBack={() => setView({ screen: "review" })} />
        )}

        {view.screen === "commit" && (
          <CommitScreen
            persona={persona}
            onBack={() => setView({ screen: "review" })}
            onConfirm={(habitId) => setView({ screen: "commitConfirmed", habitId })}
          />
        )}

        {view.screen === "commitConfirmed" && (
          <CommitConfirmedScreen
            persona={persona}
            habitId={view.habitId}
            onBack={() => setView({ screen: "review" })}
            onPreview={() => setView({ screen: "nextMonthPreview", habitId: view.habitId })}
          />
        )}

        {view.screen === "nextMonthPreview" && (
          <NextMonthPreviewScreen persona={persona} habitId={view.habitId} onBack={() => setView({ screen: "review" })} />
        )}
      </main>
    </div>
  )
}
