import { useState } from "react"
import { PERSONAS, getPersona } from "./data/personas"
import { PersonaSwitcher } from "./components/PersonaSwitcher"
import { ReviewScreen } from "./components/ReviewScreen"
import { HabitDetailScreen } from "./components/HabitDetailScreen"

type View = { screen: "review" } | { screen: "habitDetail"; habitId: string }

export default function App() {
  const [personaId, setPersonaId] = useState(PERSONAS[0].id)
  const [view, setView] = useState<View>({ screen: "review" })
  const persona = getPersona(personaId)

  // Switching persona always drops back to that persona's Review screen —
  // a habitId from one persona's detail view has no meaning for another.
  function selectPersona(id: string) {
    setPersonaId(id)
    setView({ screen: "review" })
  }

  return (
    <div className="min-h-screen bg-neutral-950 pb-16">
      <PersonaSwitcher personas={PERSONAS} selectedId={personaId} onSelect={selectPersona} />
      {view.screen === "review" ? (
        <ReviewScreen persona={persona} onOpenHabit={(habitId) => setView({ screen: "habitDetail", habitId })} />
      ) : (
        <HabitDetailScreen persona={persona} habitId={view.habitId} onBack={() => setView({ screen: "review" })} />
      )}
    </div>
  )
}
