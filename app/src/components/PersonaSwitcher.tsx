import type { PersonaData } from "../types"

interface Props {
  personas: PersonaData[]
  selectedId: string
  onSelect: (id: string) => void
}

/**
 * The demo device: a reviewer clicks from persona to persona and watches the
 * product refuse to invent a problem for Vikram/Sara. Always visible (sticky)
 * so switching never requires scrolling back up.
 */
export function PersonaSwitcher({ personas, selectedId, onSelect }: Props) {
  return (
    <div className="sticky top-0 z-10 border-b border-neutral-800 bg-neutral-950/95 backdrop-blur">
      <div className="mx-auto max-w-3xl px-4 py-3">
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-neutral-500">
          Demo persona
        </p>
        <div className="scrollbar-thin -mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1.5">
          {personas.map((p) => {
            const active = p.id === selectedId
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelect(p.id)}
                aria-pressed={active}
                className={`w-56 shrink-0 snap-start rounded-xl border px-3 py-2.5 text-left transition-all duration-150 ${
                  active
                    ? "border-amber-500/60 bg-amber-500/10 shadow-[0_0_0_1px_rgba(245,166,35,0.15)]"
                    : "border-neutral-800 bg-neutral-900 hover:-translate-y-0.5 hover:border-neutral-700 hover:bg-neutral-900/80 hover:shadow-lg hover:shadow-black/20"
                }`}
              >
                <div className="text-sm font-medium text-neutral-100">{p.name}</div>
                <div className="mt-0.5 line-clamp-2 text-xs text-neutral-400">{p.oneLiner}</div>
                <div className={`mt-1.5 text-[11px] ${active ? "text-amber-400" : "text-neutral-500"}`}>
                  {p.demonstrates}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
