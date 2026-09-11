# TradeLens — Prompt Log

Every prompt given to Claude Code in this repo, in order, including ones that didn't work. Prompts to the narration LLM (in `prompts/`) are logged here too as they're written.

---

## 1. Initial build brief (Claude Code, 2026-09-11)

```
# Claude Code prompt — build the TradeLens prototype

Unzip `tradelens_detectors_and_evals.zip`, open Claude Code inside the `tradelens/` folder, and paste everything below the line as your first message. Paste it into your prompt log too; the assignment asks for every prompt you used.

---

You are building **TradeLens**, a clickable prototype for a product-management take-home. Read this whole brief, then read `habit_library.md`, `eval_report.md`, `detectors.py` and everything in `demo/` before writing any code. Then give me a short plan and wait for my go-ahead.

## What the product is

A post-trade review for intraday index-options buyers on Nubra, an Indian broker. It turns 60 days of order history into the two or three habits that are costing the trader money, proves each one with the trader's own trades, prices the habit with a counterfactual, and gets the trader to commit to one process rule for next month.

Product principle: **insight over information**. This is not a dashboard, not a journal, not a chatbot. If a screen shows a metric that doesn't change what the trader should do next, cut it.

Core architecture, which is non-negotiable:

- **Code does the math.** `detectors.py` has already been run; its outputs are the `demo/*_analysis.json` files. The app never recomputes or invents a number.
- **The LLM does the words.** It turns one analysis JSON into plain-language narration. It may not state any number, count or percentage that is not present in the JSON.
- **Process advice only.** Rules are about size, timing, trade count and stops. Never suggest an instrument, strike, direction or "buy/sell" anything. Nubra is a SEBI-registered broker; this is a hard line.

## The four output states (all must be clickable)

`demo/` has four personas, and each shows a different state. Do not pick flattering data; use the files as they are.

| Persona | State | What the screen must do |
|---|---|---|
| `arjun_revenge_sizer` | Confirmed habit + one "watching" pattern | Show habit #1 with evidence and cost; show averaging-down as *watching*, clearly not a habit |
| `neha_expiry_day` | One confirmed habit | Show it; the "not reported" list explains what was ruled out and why |
| `vikram_control` | Nothing found | Say plainly he's losing money but no repeated pattern was found; no fake habit, no filler |
| `sara_thin_data` | Not enough data | Say how many trades she has and the minimum; no habits |

The persona switcher is the demo device: a reviewer clicks from Arjun to Vikram and watches the product refuse to invent a problem.

## Screens

1. **Persona switcher** (top of the app, always visible). Name, one-line description, and what state they demonstrate.
2. **Review.** Review month (August 2026) in three numbers: net P&L, trades, win rate. Evidence window stated explicitly ("based on 1 Jul–31 Aug"). Then the habits, ranked, each as a card: label, cost, confidence, one-sentence "why it matters", one process rule. Then "Watching" (if any), then "Also noticed" (uncosted flags), then a collapsed "What we checked and ruled out" list from `not_reported`.
3. **Habit detail.** The evidence table from `evidence`, the counterfactual sentence, the five `example_trades` with a link to view each raw order in the CSV, and the rule. State that habit costs overlap and are never added together.
4. **Commit.** The trader picks one rule (the top habit's is pre-selected, others available) and confirms it. One rule only.
5. **Next month preview.** A mocked version of next month's review opening with "You broke this rule 3 times in 21 days" so the reviewer sees the loop, not just the report. Label it clearly as a preview of the loop, not real data.

Empty and thin-data states are screens, not error toasts. Design them as carefully as the happy path.

## Narration layer

Write `narrate.py` and `prompts/narration_system.md`. The script sends each analysis JSON to Claude and writes `demo/<persona>_narration.json` with: a headline, one paragraph per habit ("why it matters"), one rule per habit, and a short closing. Commit the generated narrations so the deployed app is static and fully clickable with no API key. Keep a "regenerate" command in the README.

The system prompt must enforce:
- every number in the output appears verbatim (or as the same value rounded) in the input JSON;
- no instrument, strike, direction or market prediction;
- "watching" items are described as something to keep an eye on, never as a habit;
- "not enough data" and "nothing found" are stated honestly, with no consolation habits invented;
- plain English, no jargon a first-year trader wouldn't know, no moralising.

Then write `eval_narration.py` that checks all of that automatically:
- **Number tracing:** extract every number from the narration and assert it exists in the JSON. Fail on any orphan number.
- **Advice filter:** fail on any instrument/strike/direction words (build a word list: CE, PE, call, put, buy, sell, short, long, strike, Nifty, Bank Nifty, expect, will rise, will fall, target).
- **State fidelity:** for Vikram and Sara the narration must contain no habit language; for Arjun the watching item must not use "habit"/"pattern you have".
- **Stability:** run narration 5 times per persona and assert the set of habits named and every number are identical each run.

Run it and report results. If any check fails, fix the prompt, not the checker, and keep the failed prompt version in `prompts/` with a note on why it failed. I need a full record of every prompt that didn't work.

## Stack and deployment

- Single-page React app with Vite, TypeScript, Tailwind. No backend; load the JSON files statically.
- Deploy to Vercel (or equivalent free static host) with a public URL. The assignment requires a link a reviewer can open without login.
- Mobile-first: most Nubra users are on a phone. Must also look right on desktop.
- Dark UI, restrained, feels like a broker's app and not a college project. One accent colour for "cost". Currency formatted as ₹1,05,732 (Indian grouping). No emojis in the UI.
- No charts unless a chart is the evidence itself. A comparison of two numbers is two numbers, not a bar chart.

## How I want you to work

- Plan first, then build screen by screen. After each screen, stop and show me what changed.
- Do not change anything in `detectors.py`, `generate_personas.py` or the JSON files. If you think a number or label in the data is wrong, tell me; don't patch it.
- Keep `PROMPTS_LOG.md` at the repo root and append every prompt I give you and every prompt you write for the LLM, including ones that didn't work.
- Write a short `README.md`: what it is, how to run, how to regenerate narrations, how to run both eval scripts, and a list of every assumption (lot size, expiry day, charges model, synthetic data).
- Ask me before adding any feature not listed here. The bar is "clickable and honest", not "complete".

Start by reading the files and giving me the plan.
```

---

## 2. Go-ahead prompts (Claude Code)

- `yes` — approved installing Node/Git/Python via winget and starting on the narration layer.
- On being asked how to handle the missing `ANTHROPIC_API_KEY`, chose "you provide a key" (real API calls, not self-authored narration) over the fallback option.
- `no billing bro cab i use free ai keys any groq or deepseek` — after the Anthropic key came back with insufficient credit, asked to switch to a free provider. Result: added a `--provider` switch to `narrate.py` (`anthropic` / `groq`), defaulting to Groq (genuinely free, no card; DeepSeek is prepaid like Anthropic so was ruled out). See narrate.py's `call_groq`.

## 3. Narration system prompt iterations (the LLM-facing prompt, not a Claude Code prompt)

Each version is saved in full under `prompts/`. Summary of what changed and why (the "why" for each failure has its own `*_FAILED.notes.md` next to the saved version):

| Version | File | Result |
|---|---|---|
| v1 | `narration_system_v1_FAILED.md` | **Failed** (caught by manual read, not by `eval_narration.py`'s 4 checks): sent the model raw `evidence` floats and told it not to invent numbers, but never said how to format the numbers it was allowed to use. It pasted JSON floats verbatim ("cost you 105732.0", "win rate of 0.281") — traceable, but not plain English, and not something a broker app should show a user. Also: Sara's (insufficient-data) closing used the word "habit" while honestly explaining there wasn't one yet, failing the state-fidelity check as specified. |
| v2 | `narration_system_v2_FAILED.md` | **Failed** (`state_fidelity`, Arjun): fixed v1's two failures by having `narrate.py` pre-format every number into its exact display string (₹ Indian grouping, %, ratios) and telling the model those are text to copy, not numbers to interpret. But rule 3's own example text said "not yet a confirmed habit" — the model echoed that phrase almost verbatim, word "habit" included. Self-inflicted: I demonstrated the exact word I was telling it to avoid. |
| v3 | `narration_system_v3_FAILED.md` | **Failed** (caught by manual read, not automated): fixed v2 by explicitly banning the literal word "habit" in watching notes, even negated. All 4 automated checks passed for all 4 personas — but Vikram's (nothing-found) closing read "Pick one rule to focus on for next month," and Vikram has zero qualified habits. The closing instruction was unconditional ("nudging toward picking one rule") when it should only apply when a habit exists to pick. |
| v4 | `narration_system.md` (current) | **Passed.** Closing instruction made conditional on `habits` being non-empty; when empty, forbids "pick/choose/focus on/apply a rule" language and asks for an honest, encouraging line instead. All 4 personas pass all 4 `eval_narration.py` checks (number tracing, advice filter, state fidelity; stability run separately, see eval_report.md). |

| v5 | `narration_system.md` (current) | **Passed** number tracing / advice filter / state fidelity for all 4 personas. First 5x stability run (real `python narrate.py --stability 5`, 20 Groq calls) still in progress at time of writing — see `eval_report.md` for the final numbers once complete. |

v4's 5x stability run (also real, 20 Groq calls) found genuine content-selection variance, not random noise: `why_it_matters` cited a different subset of a habit's evidence fields each run (nothing invented, just inconsistent which facts appeared), a `watching` note sometimes stated a cost figure and sometimes didn't, and Sara's insufficient-data headline sometimes restated the trade count and sometimes didn't — v4 left all three optional. v5's fix: for a habit, `why_it_matters` must cite the cost *and every* evidence field, every time (completeness, not curation); `watching`/`also_noticed` notes must never contain a number, full stop; headline/closing must never contain a number, full stop (the UI shows exact figures directly). Removing the optionality is what removing the instability required — an LLM asked to freely choose what to include will choose differently run to run by construction. Full detail in `prompts/narration_system_v4_FAILED.notes.md`.

Provider/model used throughout: Groq, `openai/gpt-oss-120b`, temperature 0.2.

## 4. Reliability incident during the v5 stability run (2026-09-11)

Mid-batch (run 5/5 for `neha_expiry_day`, ~9 calls into a 20-call stability
run), Groq returned a 200 OK whose message content wasn't valid JSON.
`narrate.py` only retried HTTP-level failures at the time, not a
malformed-*content* response inside a successful HTTP call, so it crashed
the whole batch instead of retrying that one call.

**Fix, two parts:**
1. Moved JSON parsing inside the retry loop in `_post` (a bad-content
   response now retries like any other transient failure), and separately
   added a self-check pass in `narrate_persona` — after generating, validate
   the output against the same `check_number_tracing` / `check_advice_filter`
   / `check_state_fidelity` functions `eval_narration.py` uses, and
   regenerate (up to 2 extra attempts) if any fail. This is also what caught
   and would auto-retry the digit-insertion bug below.
2. Added `STATS` counters in `narrate.py` (top-level calls, malformed-JSON
   retries, network/HTTP retries, self-check retries) so future runs report
   a real malformed-output rate instead of a guess. **Caveat:** this specific
   incident predates the counter, so its exact rate isn't recorded — only
   that it happened once in roughly 60-70 calls across all runs so far
   (rough, not measured). The existing prompt already said "Return only a
   JSON object, no prose outside it" at the top of the Output Format
   section, so this reads as an infrequent model-reliability flake on the
   free tier, not a demonstrated prompt-content gap — I'm holding off on a
   v6 prompt reinforcement ("no markdown fences", repeated JSON-only
   instruction) unless a future run's *measured* rate (via the new counters)
   comes in meaningfully above a few percent. Rerunning stability with the
   fix in place succeeded 20/20.

Separately, that same crashed run's completed portion surfaced a genuine
content bug (not a crash): one of the 5 `neha_expiry_day` runs said "a loss
of ₹9,449" for a field where every other run correctly said "₹449" — same
`rest_avg` evidence value (-449.0), a digit inserted by the model despite
the value being handed to it as a pre-formatted, copy-verbatim string. This
is exactly what the new self-check retry (point 1 above) is meant to catch
automatically going forward, and it's now covered in `eval_narration.py`'s
own number-tracing logic being applied per-generation, not only at the end.
</content>
