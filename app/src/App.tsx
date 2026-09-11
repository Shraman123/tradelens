import { useState } from "react"
import { PERSONAS, getPersona } from "./data/personas"
import { PersonaSwitcher } from "./components/PersonaSwitcher"
import { ReviewScreen } from "./components/ReviewScreen"

export default function App() {
  const [personaId, setPersonaId] = useState(PERSONAS[0].id)
  const persona = getPersona(personaId)

  return (
    <div className="min-h-screen bg-neutral-950 pb-16">
      <PersonaSwitcher personas={PERSONAS} selectedId={personaId} onSelect={setPersonaId} />
      <ReviewScreen persona={persona} />
    </div>
  )
}
