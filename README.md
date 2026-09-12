# TradeLens

A post-trade review prototype for intraday index-options buyers on Nubra.
Turns 60 days of order history into the 2-3 habits actually costing the
trader money, prices each one with a counterfactual computed from their own
trades, and asks them to commit to one process rule for next month.

Full design rationale: `habit_library.md` (detectors + gates) and
`eval_report.md` (why 60 days, why these thresholds, what broke along the
way). Every prompt used to build this, including ones that didn't work, is
in `PROMPTS_LOG.md`.

## Architecture

- **Code does the math.** `detectors.py` computes every number from raw order
  history. The app never recomputes or invents one.
- **The LLM does the words.** `narrate.py` turns a detector-output JSON into
  plain-language narration. It cannot state a number that isn't in the input,
  cannot give trading advice, and cannot phrase "watching" as a confirmed
  habit — enforced by prompt + code-level pre-formatting + an automated eval
  (`eval_narration.py`) + a runtime self-check that retries generation on
  failure (see `narrate.py`'s `narrate_persona`).
- **The deployed app is static.** Narrations are pre-generated and committed
  to `demo/*_narration.json`; the live site needs no API key. Regenerate with
  `python narrate.py` when you want fresh prose.

## Narration generation: model and settings used for the committed output

- Provider: **Groq** (free tier, no card) — `narrate.py --provider groq`
- Model: **`openai/gpt-oss-120b`**
- Temperature: **0.2**, max_tokens 3000
- An Anthropic path also exists (`--provider anthropic`, `claude-sonnet-5`)
  but wasn't used for the committed narrations (see `PROMPTS_LOG.md` — the
  Anthropic key on hand had no API credit; Groq was substituted).

## Live demo

**https://app-azure-zeta-42.vercel.app** — no login required.

## Run it

```
cd app
npm install
npm run dev        # http://localhost:5173
npm run build       # production build to app/dist
```

## Regenerate narrations

Requires an API key for whichever provider you use (`ANTHROPIC_API_KEY` or
`GROQ_API_KEY`, set in your shell, never committed):

```
python narrate.py                       # regenerate demo/<persona>_narration.json (all 4)
python narrate.py --persona sara_thin_data
python narrate.py --provider anthropic  # swap providers
```

After regenerating, copy the refreshed files into the app (until this is
wired into a build step — see "Known gaps" below):

```
copy demo\*_narration.json app\src\data\
```

## Run the evals

```
python run_evals.py heldout 2                 # detector layer ship-bar table (60-day window)
python eval_narration.py                       # narration layer: number tracing, advice filter, state fidelity, stability
python narrate.py --stability 5 --delay 20     # generate the 5x reruns eval_narration.py's stability check reads
                                                 # (--delay keeps Groq's free-tier 8000 TPM limit happy; omit for Anthropic)

cd app && npm test                              # TS/Python cross-check: the in-app raw-order viewer's position
                                                 # grouping (a duplicate of detectors.py's normalize()) reproduces
                                                 # every example_trade's entry_size_rs and net_pnl independently
```

## Assumptions baked into the synthetic data (not Nubra's actual numbers)

From `generate_personas.py` / `habit_library.md`:
- Lot size: 75 (NIFTY)
- Expiry day: Tuesday (weekly NIFTY options)
- Brokerage: ₹20/order, plus a simplified levy model (STT/exchange/GST
  approximated, not Nubra's real schedule)
- All trader data is synthetic with planted, known ground truth (see
  `eval_report.md`) — this proves the detectors recover what was planted, not
  how common these habits are among real Nubra users
- Evidence window: 60 days, review framed monthly (see `eval_report.md` for
  why 60 days beat 30 on detection power)
- Detector thresholds (p < 0.01, ≥20 trades, materiality bar) are judgment
  calls tuned on synthetic dev seeds — see `habit_library.md`'s gates table

## Screens

All five from the brief are built: Persona switcher (always visible) →
Review → Habit detail (evidence table + example trades + raw-order
drill-down) → Commit (one rule, top habit pre-selected) → Next-month
preview (explicitly mocked — see `NextMonthPreviewScreen.tsx`). Vikram and
Sara never reach Commit or the preview — there's nothing for them to commit
to, so the entry point simply isn't rendered, not disabled.

## Known gaps / next steps

- Narration regeneration copies into `app/src/data/` manually; a build step
  or symlink would remove that step.
- Deployed to Vercel: https://app-azure-zeta-42.vercel.app (connected to
  the `Shraman123/tradelens` GitHub repo, so pushes to `main` auto-deploy).
- ~~Narration stability~~ — closed. All four personas now have a genuine
  5/5 stability result on the v6 prompt (identical habit ids and numbers
  across every rerun), including Sara and Vikram, whose earlier v5 results
  were cut short by a free-tier daily quota. See `PROMPTS_LOG.md` section 6
  for the full run.
