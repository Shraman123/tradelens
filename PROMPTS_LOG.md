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

## 7. Two copy fixes on the "nothing found" screen (Claude Code, 2026-09-12)

```
Two copy fixes on the "nothing found" screen. (1) Four ruled-out rows repeat the identical phrase "happened sometimes, but not consistently enough…". Vary the phrasing so the actual reasons read differently (failed significance vs confounded vs too few). (2) In the closing line, "so the lack of a finding does not mean the period was successful" doesn't follow logically from the first clause — split it into two sentences. Don't change any numbers. Re-run eval_narration.py after.
```

**Fix (1) was code, not the LLM** — same as fix 1 in section 5: the
`p=X >= 0.01 (could be noise)` reason format was always mapped to one fixed
sentence in `habitLabels.ts`'s `humanizeReason()`, regardless of how large
X actually was. Vikram's four "not statistically reliable" rows have p =
0.764, 0.727, 0.263, 0.352 — genuinely different degrees of "not a
pattern" (0.764/0.727 are indistinguishable from pure chance; 0.263/0.352
are more borderline) — but all four got the identical phrase. Fixed by
tiering the phrase on the p-value already in the string (5 tiers: <0.05,
<0.1, <0.3, <0.6, ≥0.6), still never displaying the number itself. This is
not "make up 4 different reasons" — two of Vikram's four (0.764, 0.727)
are close enough that giving them the same tier, and therefore the same
sentence, is the honest answer; forcing a 4th distinct phrase onto two
p-values that are genuinely almost equal would have been the opposite
mistake (fabricating a distinction the data doesn't support). Result:
3 distinct phrases across Vikram's 4 significance-based rows instead of 1.

**Fix (2) is narration content** (v6 → v7, `prompts/narration_system.md`).
v6's closing guidance asked for "no single behaviour repeated... **so** the
lack of a finding does not mean the period was successful" as one
acceptable shape — technically two ideas, but v6 never said they couldn't
be joined with "so", and the model took that opening. The bug: "nothing
was confirmed" doesn't *cause* or *prove* "the window wasn't fine" — they
are two separate facts (a technical finding, and a caution against
misreading it), not premise-and-conclusion. v7 makes this explicit: the
closing is now three sentences, not two, with a standing instruction that
sentences 1 and 2 must never be joined by "so"/"therefore"/"which
means"/"meaning" because one doesn't logically follow from the other.
Regenerated (all four personas, since the prompt file is shared); Vikram's
new closing:

> "Across the 101 trades in this window, no single behavior repeated often
> enough or incurred enough cost to be confirmed. That does not mean the
> window was successful; the loss shown elsewhere is not linked to a
> recurring, provable behavior. We'll review the data again in the next
> cycle."

No numbers were changed anywhere in either fix, per the brief — the trade
count (101) is the same value from the same source (`summary.review_month.
closed_trades`) as before; only the sentence structure and the ruled-out
phrasing logic changed.

`eval_narration.py` (number tracing / advice filter / state fidelity, as
asked — stale v6 stability run files deleted rather than left in place,
same reasoning as section 6):

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

**Fresh v7 stability check, run separately on request**
(`python narrate.py --stability 5 --delay 20`, 20 Groq calls): 20/20
succeeded first pass — no rate limits, no self-check retries, cleaner than
either prior stability run (v6's had one rate-limit failure and one
self-check retry; earlier v5-era runs never got all four to 5/5 at all).
`eval_narration.py`:

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

v7 is now the second consecutive prompt version to reach a genuine 5/5 for
all four personas (v6 did too, section 6) — the varied ruled-out phrasing
(tiered by p-value, not free-form) and the three-sentence closing
structure are both deterministic-enough templates that they didn't
introduce new instability.

## 8. Live-app read-through catches a redundant-phrase bug (2026-09-12)

```
check the live app
```

(User pasted the actual rendered page text for all four personas from the
live URL.) Reading the real output surfaced a bug none of the automated
checks caught: Arjun's `why_it_matters` read "Those after‑loss trades
produced a loss of a loss of ₹1,95,375" — a duplicated phrase. Cause:
`after_loss_net` is pre-formatted by `narrate.py`'s `_rupees_signed` into
a complete phrase, `"a loss of ₹1,95,375"`, not a bare number — the model
wrote its own "produced a loss of" immediately in front of it anyway,
producing the doubled phrase. `check_number_tracing` couldn't have caught
this: the digit (195375) is correct and present either way; the defect is
purely grammatical, not numeric.

Two other things checked and confirmed correct, not bugs, while reading
the pasted text closely:
- Sara's screen shows "Trades: 9" in the stat row but "18 closed trades"
  in the insufficient-data message — these are two different, intentional
  counts (`summary.review_month` = August only, 9 trades; the full
  59-day evidence window = 18 trades), per the original brief's own
  design ("Review month... in three numbers... Evidence window stated
  explicitly"). Confirmed against `sara_thin_data_analysis.json` before
  concluding this, not assumed.
- The pasted text shows "What we checked and ruled out (N)" with no
  bullets under it for any persona — expected, not a regression: `<details>`
  content isn't included in a plain select-all/copy of the rendered page
  unless it's expanded first, so this says nothing about whether fix 1
  (section 5) is still rendering. Already verified separately via bundle
  inspection.

**Fix, matching this project's own established pattern** (a bug that
slips past the eval suite gets a permanent new check, not just a one-off
prompt patch — see the ₹9,449 digit-insertion incident, section 4):
1. `prompts/narration_system.md` v7 -> v8: rule 1 now explicitly names this
   failure mode ("Do not write 'produced a loss of a loss of ₹1,95,375' —
   a real failure this rule exists to prevent") and tells the model either
   to drop the pre-formatted value in as its own clause or introduce it
   with neutral wording ("at", "totalling", "amounting to") that doesn't
   repeat "loss"/"gain".
2. New `check_redundant_framing` in `eval_narration.py` — a regex for
   "a loss/gain of" immediately followed by another "a loss/gain of" —
   added as a 5th check to `eval_narration.py`'s per-persona report AND to
   `narrate.py`'s `SELF_CHECKS` (so a future occurrence is caught and
   retried automatically at generation time, not just flagged after the
   fact). Verified against the actual bug before regenerating: correctly
   fails on Arjun's pre-fix text (`redundant framing found: ['a loss of a
   loss of']`) and passes clean on the other three (no false positives).

Regenerated all four personas against v8 (arjun and neha succeeded first
call; vikram and sara hit the Groq TPM rate limit and were retried
individually). Arjun's fixed text, first attempt, 0 self-check retries —
the prompt guardrail worked without needing the runtime retry:

> "The cost of this behaviour is ₹1,05,732. It occurred in 96 trades, with
> a median entry size after a loss of ₹12,562 versus ₹6,578 otherwise,
> giving a size ratio of 1.91x. The after‑loss win rate was 28% compared
> with 39% otherwise, and those trades were a loss of ₹1,95,375."

`eval_narration.py` (now 4 non-stability checks per persona):

```
arjun_revenge_sizer: PASS
  number_tracing    [ok] ok
  advice_filter     [ok] ok
  state_fidelity    [ok] ok
  redundant_framing [ok] ok

neha_expiry_day: PASS
  number_tracing    [ok] ok
  advice_filter     [ok] ok
  state_fidelity    [ok] ok
  redundant_framing [ok] ok

sara_thin_data: PASS
  number_tracing    [ok] ok
  advice_filter     [ok] ok
  state_fidelity    [ok] ok
  redundant_framing [ok] ok

vikram_control: PASS
  number_tracing    [ok] ok
  advice_filter     [ok] ok
  state_fidelity    [ok] ok
  redundant_framing [ok] ok

ALL PASS
```

Stale v7 stability run files deleted (same reasoning as sections 6-7 —
they validate v7's wording, not v8's). Not re-run in this pass; ask for a
fresh one the same way as before if wanted.

## 9. v8 stability check: daily quota blocks a full run (2026-09-12)

```
Run the 5x stability check against v8 for all four personas and give me the results.
```

Attempted `python narrate.py --stability 5 --delay 20` (20 Groq calls).
Got through arjun's full 5 and one of neha's before hitting Groq's *daily*
token quota (200,000 TPD) — a harder wall than the per-minute limit hit
earlier in this project, not something a short retry clears. The day's
earlier v6 and v7 stability batches plus several individual regenerations
had already used most of the day's budget before this attempt started.

**What completed, exactly:**
- **arjun_revenge_sizer: 5/5**, identical habit ids and identical numbers
  across all five runs.
- **neha_expiry_day: 1/5.** That single run's first attempt tripped the
  new `check_redundant_framing` self-check from section 8 — Groq
  regenerated "a loss of a loss of" again, on a live call, and
  `narrate_persona`'s runtime retry caught it and produced a corrected
  version before the run was ever saved. This is direct evidence the v8
  guardrail works against a real recurrence, not just the original
  instance — but one run is not a stability result (nothing to compare it
  against), so it isn't counted as a stability pass.
- **vikram_control: 0/5. sara_thin_data: 0/5.** The daily quota was
  exhausted before either got a single successful call in this batch.

```
Option 3 [accept partial evidence for now]. Update EVALS.md to state the v8 stability position honestly: Arjun 5/5 identical ids and numbers; Neha 1/5 completed, with that run tripping the redundant-framing self-check and regenerating automatically before save; Vikram and Sara not re-run against v8 due to Groq daily quota, with their earlier v6 runs and the structural argument (no numbers in prose) noted. Make sure eval_narration.py reports "no stability runs found" as SKIP, not PASS. Add the "a loss of a loss" bug to the iteration log, including that automated checks missed it and a human read caught it. Commit and push. Then stop — no more test runs tonight.
```

**A real bug found while doing this**, separate from the narration
content itself: `eval_narration.py`'s `main()` coerced
`check_stability`'s `None` ("no stability runs found") into `True` before
storing it in the results dict, so the per-check print loop's own
`"skip" if ok is None else ...` branch was dead code for stability
specifically — a persona with zero stability runs printed
`stability [ok] no stability runs found`, visually indistinguishable from
a genuine pass unless you read the message text closely. Fixed by storing
the raw tri-state result instead of coercing it; Vikram and Sara now
correctly print `[skip]`. This never affected overall PASS/FAIL (the
`persona_ok` calculation already excluded `None` from consideration and
separately checked for a real `False`), only what was displayed — but
"displayed as ok" and "is ok" need to actually agree, and they didn't.

`eval_report.md` and `README.md` updated to state this exact position —
Arjun's real 5/5, Neha's single data point (not a stability claim),
Vikram/Sara's honest gap plus the v6 result and structural argument that
still stand independently of it — rather than a summary number that
overstates what actually ran tonight.

No further Groq calls made after this, per the instruction to stop for
the night.

## 10. ONE_PAGER.md and the submission PDF (2026-09-12)

```
Add a new section to ONE_PAGER.md called "What I'd validate first", placed after "What testing changed" and before "Scope". Keep the whole one-pager under 700 words — cut from other sections if needed.

The section must state plainly that this product rests on assumptions I have not tested with real traders, then list the three riskiest ones, each with how I'd test it and what result would kill or change the product:

1. Desirability — that a trader who loses money wants a diagnosis rather than avoiding the review entirely. Test: does the review get opened after a losing month, or only after a winning one?
2. Behaviour change — that naming one habit and getting a commitment actually reduces that habit next month. Test: habit recurrence rate for committed vs non-committed users.
3. Trust — that a trader accepts a behavioural verdict from his own broker, given the broker earns on his volume.

Then add a short "How I'd measure success" paragraph: the metric is habit recurrence next month, not opens or session time; the counter-metric is churn, because if diagnosed traders leave rather than improve the thesis is wrong; and note the noise problem, that a trader can fix a real habit and still have a worse month.

Write it in the same plain voice as the rest of the document. Do not invent user quotes, interviews, or research findings. Commit and push, then rebuild TradeLens_Submission.pdf.
```

`ONE_PAGER.md` and `TradeLens_Submission.pdf` didn't exist anywhere in
this repo, its git history, or elsewhere on the filesystem checked before
this prompt — asked rather than guessed at content or a build pipeline
that might exist somewhere out of view. The user pasted the exact
`ONE_PAGER.md` content to save verbatim (744 words) and asked for a new
pandoc-based PDF pipeline; that baseline was committed first, separately,
per the user's own instruction, before this section was added.

**The 700-word budget was tight from the start**: the baseline alone was
744 words, over budget before adding anything. The two new sections,
written as economically as possible while still covering every required
element (the assumptions statement, three risks each with a test and a
kill/change signal, and the metric/counter-metric/noise paragraph),
needed real cuts elsewhere — not light copy-editing but removing whole
clauses and one full sentence (the "duplicated phrase" anecdote in "What
testing changed", now that "What I'd validate first" carries a similar
epistemic-honesty note). Two supporting SEBI statistics (the 92%-of-losses
and 59%-same-day-expiry figures) were also cut from "The problem" as the
least load-bearing facts, keeping the core argument (87.7% lose, 90%
repeat) intact. Final: 699 words by `wc -w` — confirmed directly against
the assembled file, not estimated from section subtotals (which
undercounted by not including the "## " heading tokens themselves).

No user quotes, interviews, or research findings were invented — the
three "Test:" lines are proposed methods for validating the stated
assumptions, matching the section's own framing ("what I'd validate
first"), not claimed results.

**PDF pipeline**: pandoc (installed via winget — a LaTeX distribution was
too heavy, and wkhtmltopdf's installer needed UAC elevation this
sandboxed shell couldn't grant) converts the markdown to an HTML
fragment; a new `scripts/build_pdf.js` wraps it in print-styled HTML
(plain typography, the app's own amber accent, matching the product's
restrained design voice) and Puppeteer (a plain npm devDependency, no
elevation needed, ships its own Chromium) prints it to
`TradeLens_Submission.pdf`. `npm run build:pdf` from the repo root.
Verified by reading the actual rendered PDF, not just checking the file
was written: two pages, correct section order, no rendering artifacts.

## 11. v9: Neha's duplicated cost figure (2026-09-13)

```
Neha's why_it_matters states the same figure twice: "cost you ₹1,16,891 across 90 trades, resulting in a loss of ₹1,16,891." For slice habits the cost and the negated net are the same number, so the prompt shouldn't ask for both. Add a v9 rule: when a habit's cost equals its slice net, state the figure once. Regenerate, re-run eval_narration.py, redeploy, retake Neha's screenshot, rebuild the PDF.
```

Root cause, traced in `detectors.py` before touching the prompt: for a
`kind:"slice"` habit, `cost = -s.net_pnl.sum()` and
`evidence.slice_net = s.net_pnl.sum()` — literally the same underlying
number, defined as each other's negation, not two independent facts.
`narrate.py` then pre-formats them as two *different-looking* strings
(`cost` -> `"₹1,16,891"` via `_rupees`; `slice_net` -> `"a loss of
₹1,16,891"` via `_rupees_signed`), and rule 2's completeness requirement
("reference `cost` **and every** field inside `evidence`") gave the model
no way to know these two instructions pointed at one number, not two —
it dutifully wrote both, producing "cost you ₹1,16,891 across 90 trades,
resulting in a loss of ₹1,16,891."

Confirmed this is structural, not a one-off: `_slice_habit` is the only
detector that defines `cost` as a bare negation of an `evidence` field
this way (the size-up-after-loss and averaging-down detectors compute
`cost` from a counterfactual difference instead, which doesn't equal any
single evidence field) — so the fix had to be scoped to `kind:"slice"`
specifically, not applied as a blanket rule that might suppress a
genuinely distinct number elsewhere.

**Fix, matching this project's established pattern** (a bug the eval
suite doesn't catch gets a permanent new check, not just a prompt patch —
see sections 4 and 8):
1. `prompts/narration_system.md` v8 -> v9: rule 2 gets an explicit
   exception for `kind:"slice"` habits — state the shared `cost`/
   `slice_net` figure once, in either framing, and cover the rest of
   `evidence` as usual. Named the exact bad sentence as the failure mode
   this exists to prevent, same convention as rule 1's v8 addition.
2. New `check_slice_cost_duplication` in `eval_narration.py` (a 5th
   non-stability check): for each `kind:"slice"` habit, counts how many
   times its Indian-grouped cost figure appears in that habit's own
   `why_it_matters`; fails if more than once. Verified against the actual
   bug before writing any fix: correctly failed on the old v8 text
   (`₹1,16,891 appears 2 times`) and passed clean once v9 text was in.

Regenerated only `neha_expiry_day` — the sole persona with a confirmed
`kind:"slice"` habit, so the only one this rule could affect. First call,
no retries:

> "This behaviour cost you ₹1,16,891 across 90 expiry‑day trades. On
> those trades you averaged a loss of ₹1,299, had a win rate of 29% and
> saw an average return of a 28% loss. The remaining 124 trades averaged
> a loss of ₹449, a 5% loss return and a win rate of 37%."

`eval_narration.py`, all four personas, now 5 non-stability checks each:
all PASS, including the new `slice_cost_dup` check everywhere (only
`neha_expiry_day` actually exercises the `kind:"slice"` branch; the other
three pass trivially since they have no slice-kind habit to check). Also
ran a genuine fresh `--stability 5` for `neha_expiry_day` against v9
rather than leave a stale, misleading single v8-era run file sitting in
`results/narration_stability/` that would otherwise have "passed" on an
n of 1: 5/5, identical habit ids and numbers.

Copied into `app/src/data/`, `npm test` and `npm run build` clean,
pushed, redeployed, confirmed via the live JS bundle that the old
"resulting in a loss" phrasing is gone. Retook screenshots for all four
personas and diffed them against the previous set — only
`neha_review.png` changed, as expected (the fix touches one persona's
`why_it_matters` text only; nothing else on any other screen reads from
it). Rebuilt `TradeLens_Submission.pdf`: page count and size unchanged
(30 pages, 0.82 MB) — only that one embedded screenshot's pixels differ.
