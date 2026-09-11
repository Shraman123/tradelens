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

  return (
    <div className="min-h-screen bg-neutral-950 pb-16">
      <PersonaSwitcher personas={PERSONAS} selectedId={personaId} onSelect={selectPersona} />

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
    </div>
  )
}
