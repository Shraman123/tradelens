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

## 5. Four fixes from clicking through the deployed app (Claude Code, 2026-09-12)

```
Four fixes from clicking through the deployed app. Do them all, then build, lint, test, commit and push.

1. BUG — empty ruled-out list. On the Review screen, "What we checked and ruled out (7)" expands to 7 empty bullets (seen on Vikram, check all four personas). Each row should render the human-readable detector label plus its rejection reason from not_reported in the analysis JSON — e.g. "Sizes up after a loss — the size difference was within normal variation". Map detector ids to the labels in habit_library.md, and turn the raw reason strings into plain English (a reader shouldn't see "p=0.34 >= 0.01" unless they expand further).

2. Vikram's closing line. "Keep trading as usual and check back next review" reads as "change nothing" to someone down ₹52,169. Replace with wording that says: nothing here is a habit yet; across 101 trades no pattern repeated often enough or cost enough to be worth changing; that doesn't mean the month went well, it means the loss isn't traced to one recurring behaviour we can prove from his orders. Keep "check back next review" as a separate, quieter line. If this text comes from the narration layer rather than the UI, change the prompt instead and regenerate — don't hardcode it.

3. Window wording. Vikram's headline says "this month" but the window is 1 Jul–31 Aug. Make all headline/summary copy say "in this window" or "over these 60 days". Check every persona.

4. Habit detail — the cost number and the rule.
   a. The large ₹ figure reads like a loss. Label it "What this cost you" above the number, with the counterfactual sentence underneath in smaller text.
   b. Make the rule concrete using numbers already in the evidence. For size_up_after_loss: "After a loss, your next entry stays at your usual size — about ₹6,600. If you want to size up, it has to be a separate decision made before the session, not after a loss." Substitute the persona's own median_entry_size_otherwise, rounded. Apply the same treatment to any other detector whose evidence supplies a concrete threshold.

Constraints: don't touch detectors.py, generate_personas.py or the analysis JSONs. Any number appearing in new copy must already exist in the analysis JSON. After the changes, re-run eval_narration.py (number tracing, advice filter, state fidelity) and paste the results. Append every prompt you write for the LLM to PROMPTS_LOG.md, including versions that fail the evals.
```

Findings and decisions made while implementing this, before touching any file:

- **Fix 1 was code, not the LLM.** `not_reported` is rendered directly by
  `ReviewScreen.tsx` from `analysis.json` — it was never sent to the
  narration LLM (`narrate.py`'s `trimmed_input` deliberately excludes it,
  see its own comment). So "map ids to habit_library.md's labels" and
  "humanize the reason" are both a `habitLabels.ts` change, not a prompt
  change. The bullets were never literally empty in the deployed build
  (verified against the live JS bundle before this prompt) — the real
  complaint, confirmed by the brief's own example, is that a reader
  shouldn't have to decode `p=0.34 >= 0.01`; that's what "empty" meant here.
  New: `humanizeReason()` in `habitLabels.ts`, pattern-matching every
  `reason` format `detectors.py` actually emits and rewording each into a
  plain sentence — never inventing a number, only dropping or rewording the
  ones already in the string. `HABIT_LABELS` itself now sources its wording
  from `habit_library.md` (previously it mirrored `detectors.py`'s own
  `label` field verbatim — a deliberate earlier choice, reversed here
  because this prompt explicitly asks for the other source). The
  "explained by X (confounded)" case looks up X's real, currently-displayed
  `label` from `analysis.habits` when possible, so the cross-reference
  never disagrees with the habit card it's pointing at.

- **Fix 3's "60 days" isn't literally true for every persona** — checked
  before writing the prompt: Arjun/Neha/Vikram's window is 62 days
  (2026-07-01 to 2026-08-31), Sara's is 59 (thin-data, truncated to her
  actual history). Hardcoding "60 days" into the prompt would be wrong for
  every one of the four, and would fail Sara's number-tracing (59 vs 60 is
  right at the ±1 tolerance edge; 62 vs 60 is not). Used "this window" with
  no day-count instead — the exact span is already shown verbatim on
  screen (`ReviewScreen`'s "Review · based on 1 Jul – 31 Aug 2026" line),
  so the narration doesn't need to also state a number here.

- **Fix 2's "nothing here is a habit yet" can't be used verbatim** — it
  contains the literal word "habit", which rule 8 (was rule 7 in v5) and
  `eval_narration.py`'s `check_state_fidelity` both specifically forbid for
  a no-habit narration (a hard-won rule from v3's failure, see section 3
  above). Kept the requested *meaning* — this is a real, sufficiently-sized
  check that came up empty, not a shrug — without the banned word.

- **Fix 2's "across 101 trades" needs a number in the closing**, which v5's
  rule 4 banned outright, no exceptions. Rather than hardcode "101" (wrong
  for every other persona and impossible to keep in sync if the data ever
  changes) or drop the number entirely (losing the "this was a real check"
  weight the brief specifically wants), v6 carves out one narrow exception:
  the closing may state `summary.review_month.closed_trades` verbatim, and
  only in the "nothing found" case. `eval_narration.py`'s
  `check_number_tracing` was updated to encode exactly this exception
  (a set-difference against `{closed_trades}` for the closing field only,
  gated on the same `nothing_found` condition the prompt uses) rather than
  loosened generally — every other field, and every other persona state,
  stays as strictly number-free as v5 enforced.

- **Fix 4b: checked every detector's evidence for a fix-4b-shaped number**,
  not just `size_up_after_loss`. `median_entry_size_otherwise` *is* "your
  usual size" — the exact quantity `size_up_after_loss`'s rule refers to,
  so naming it is a direct substitution, not an inference. None of the
  other six rules refer to a quantity their own evidence contains: the
  fast-reentry window (5 min), the late-session cutoff (2:30pm) and the
  overtrading threshold (trade #7) are all detection *parameters* baked
  into `detectors.py`, not `evidence` fields — naming them in the rule text
  would mean inventing a number that isn't in the analysis JSON, which the
  brief's own constraint forbids. `averaging_down` and `holds_losers_longer`
  don't have an evidence field that maps to their rule's prescribed action
  (deciding size before entry; writing an exit level) the way "usual size"
  maps to `size_up_after_loss`'s rule. So only `size_up_after_loss` got the
  concrete-number treatment (`narrate.py`'s new `RULE_BUILDERS`); the other
  six keep their static `RULE_TEMPLATES` string, unchanged from v5.
  Verified against Arjun's real evidence (`median_entry_size_otherwise:
  6578`) before shipping: `_round_100(6578) = 6600` → "about ₹6,600",
  matching the brief's own example exactly.

## 6. Narration system prompt v6

(Note: an earlier, hypothetical "v6" was discussed and explicitly deferred
in section 4 above — a stability-related prompt reinforcement that never
shipped because the measured malformed-output rate didn't warrant it. This
is the first `narration_system.md` actually named v6; that discussion is
unrelated to this one.)

Full prompt saved as `prompts/narration_system.md` (current). Changes from
v5, all covered above: rule 4 gets one narrow numeric exception (nothing-
found closing may state the trade count), a new rule 5 bans "this month" /
"the month" for the evidence window in favour of "this window", and the
"closing depends on whether habits is empty" section is split into its two
genuinely different empty-habits cases (insufficient-data vs. nothing-
found), with the nothing-found case now specifying a two-sentence closing
(explain what "nothing found" means at the trader's scale, including the
one permitted number → separate, quieter "check back" coda) instead of one.

**Regeneration hit one real self-check failure**, caught by the pipeline
exactly as designed (not a prompt-wording failure — no v6.1 needed):
`arjun_revenge_sizer`'s first two attempts both failed with
`check_number_tracing: orphan numbers: [6600.0]`. Cause: `narrate.py`'s new
`_rule_size_up_after_loss` (fix 4b, section 5 above) rounds
`median_entry_size_otherwise` to the nearest ₹100 for the "about ₹6,600"
phrasing — a deliberate, requested rounding — but `eval_narration.py`'s
`all_numbers()` had no notion of "nearest-hundred rounding" as an allowed
reformatting the way it already allowed a rate rounded to a percent. Fixed
`all_numbers()` to also add the nearest-hundred form of any value ≥100 to
its allowed set (mirrors the existing rate→percent special case exactly);
re-ran and it passed on the first attempt, 0 retries. This is a case where
the *eval* needed a fix for a legitimate new code-side number
transformation, not the prompt or the generated prose — logged here since
it happened during this prompt's regeneration and blocked it until fixed.

**Final regeneration, one Groq call per persona (all passed self-checks on
the first attempt except the one arjun retry above), then
`eval_narration.py` run for number tracing / advice filter / state
fidelity as asked:**

```
arjun_revenge_sizer: PASS
  number_tracing   [ok] ok
  advice_filter    [ok] ok
  state_fidelity   [ok] ok

neha_expiry_day: PASS
  number_tracing   [ok] ok
  advice_filter    [ok] ok
  state_fidelity   [ok] ok

sara_thin_data: PASS
  number_tracing   [ok] ok
  advice_filter    [ok] ok
  state_fidelity   [ok] ok

vikram_control: PASS
  number_tracing   [ok] ok
  advice_filter    [ok] ok
  state_fidelity   [ok] ok

ALL PASS
```

Stability was not re-run for v6 in the same session as the fixes above
(only number tracing / advice filter / state fidelity were asked for
then) — the pre-v6 stability run files were deleted rather than left in
place, since comparing them to each other would validate v5's wording, not
v6's, and a stale pass would have been more misleading than an honest "not
run."

**Run separately, on request** (`python narrate.py --stability 5 --delay 20`,
20 Groq calls): 19/20 succeeded first pass; `neha_expiry_day` run 3 hit the
8000 TPM free-tier limit after exhausting its own retries (a capacity
question, not a content one) and was regenerated individually to complete
the set. One self-check retry fired along the way — `neha_expiry_day` run 1
first came back with "a loss of ₹9,449" where the evidence says ₹449, the
same digit-insertion flake recorded in section 4 above; the runtime
self-check (not a human) caught it and regenerated automatically, so the
saved run1 file is the corrected version, not the flaky one.

Result: **all four personas now have a full, genuine 5/5** — identical
habit/watching ids and identical numbers across every rerun. This is
better than any stability result this project has previously recorded:
the v5-era numbers this section used to cite were 5/5 for arjun and neha
but only a partial 3/5 (vikram) and 1/5 (sara), both cut short by a
free-tier daily quota, not a content issue. `eval_narration.py`:

```
arjun_revenge_sizer: PASS
  number_tracing   [ok] ok
  advice_filter    [ok] ok
  state_fidelity   [ok] ok
  stability        [ok] 5 runs, identical ids and numbers

neha_expiry_day: PASS
  number_tracing   [ok] ok
  advice_filter    [ok] ok
  state_fidelity   [ok] ok
  stability        [ok] 5 runs, identical ids and numbers

sara_thin_data: PASS
  number_tracing   [ok] ok
  advice_filter    [ok] ok
  state_fidelity   [ok] ok
  stability        [ok] 5 runs, identical ids and numbers

vikram_control: PASS
  number_tracing   [ok] ok
  advice_filter    [ok] ok
  state_fidelity   [ok] ok
  stability        [ok] 5 runs, identical ids and numbers

ALL PASS
```

Vikram's actual regenerated output (the one this whole prompt was about):

> **headline:** "No repeated pattern met the cost or frequency thresholds
> in this window."
> **closing:** "Across the 101 trades in this window, no single behaviour
> repeated enough or incurred enough cost to be confirmed, so the lack of a
> finding does not mean the period was successful. Check back at the next
> review to see if any new patterns emerge."

Arjun's regenerated rule (fix 4b), copied verbatim by the model from
`fixed_rule` as instructed:

> "After a loss, your next entry stays at your usual size — about ₹6,600.
> If you want to size up, it has to be a separate decision made before the
> session, not after a loss."
