# TradeLens — Detector Evals

## The question

Would a trader trust this with their own money story? That breaks into two failures to avoid:

1. **Missing a real habit.** The review is useless.
2. **Inventing a habit that isn't there.** The review is actively harmful, and trust ends the first time it happens.

Failure 2 is worse, so the thresholds are set to protect against it first.

## Method

- **Ground truth.** Four synthetic traders with habits planted at known strength, including a control with none and a thin-data trader (see `habit_library.md`).
- **No tuning on the test set.** Thresholds were tuned on dev seeds 1–30. The results below use held-out seeds 101–130, which were never looked at during tuning.
- **Pass criteria per persona-month.** Planted personas: every planted habit found and nothing unplanted reported. Control: zero habits. Thin data: the "not enough data" response.

## Held-out results (30 simulated traders per persona)

| Persona | 1-month window | 60-day window |
|---|---|---|
| Arjun: both planted habits found, nothing invented | 13/30 | **28/30** |
| Neha: expiry-day as #1, nothing invented | 20/30 | **29/30** |
| Vikram (control): zero habits | 30/30 | **30/30** |
| Sara (thin data): says "not enough data" | 30/30 | **30/30** |
| Wrong habit reported as #1 (worst failure) | 2/30 (Neha) | **0/30** |

Almost every 1-month failure is a **miss**, not a false alarm, and most misses surface as *watching* rather than disappearing.

## Why 60 days: detection power (dev seeds)

| Habit (planted effect) | Detected, 1 month | Detected, 2 months |
|---|---|---|
| Size-up after loss (2× size) | 28/30 | 30/30 |
| Averaging down (added lots −12%) | 14/30 | 27/30 |
| Expiry-day, −10% per trade | 1/30 | 5/30 |
| Expiry-day, −18% per trade | 7/30 | 16/30 |
| Expiry-day, −28% per trade | 18/30 | 26/30 |
| Expiry-day, −39% per trade | 26/30 | 30/30 |
| Control, false alarms | 1/30 | 0/30 |

Lottery-like payoffs (cheap expiry-day options) are high-variance. One month of trades often can't separate a costly habit from a bad month. Loosening the threshold would buy recall with false alarms (see the sweep below). A longer evidence window buys recall for free.

**Threshold sweep, 1-month, dev seeds:**

| p-value threshold | Arjun | Neha | Control correct |
|---|---|---|---|
| 0.01 *(chosen)* | 12/30 | 18/30 | 29/30 |
| 0.02 | 15/30 | 19/30 | 29/30 |
| 0.05 | 21/30 | 21/30 | 28/30 |
| 0.10 | 26/30 | 23/30 | 27/30 |

## What broke, and what changed (iteration log)

1. **Missed Neha's planted habit (p = 0.46).** Significance was tested on ₹ P&L. Her expiry-day trades were small in ₹, so noise from her bigger normal trades drowned the signal. *Fix:* test on size-normalised return and report cost in ₹.
2. **Averaging down vanished for Arjun.** A rule merged habits that shared trades, and since about half his trades follow a loss, averaging down kept getting absorbed into size-up. *Fix:* distinct behaviours are never merged; only time/day patterns are tested for confounding.
3. **Neha got "overtrading" as #1 in some months.** Her 7th-plus trades are all on expiry days, so overtrading was a proxy. *Fix:* a two-way test. Overtrading doesn't hold once expiry trades are removed; expiry-day trading does hold once 7th-plus trades are removed.
4. **Control false positive worth ₹1,145.** A flat ₹1,000 bar is meaningless for someone buying ~₹15 lakh of premium a month. *Fix:* the bar became the larger of ₹1,000 and 1% of premium bought.
5. **Implausible data.** Arjun lost ₹3.7 lakh in a month, and his size-up drill-down showed averaging-down trades, which muddled two stories. *Fix:* realistic sizing, and examples exclude trades claimed by another habit.
6. **The "second month" was September 2026, which is in the future.** *Fix:* the window became July + August.

## Product decisions that came from the evals

- **60-day evidence window**, with the review still framed monthly.
- **"Watching" state** for material but unproven patterns, so the product can be honest without being silent.
- **"Holds losers longer" stays uncosted.** Order history can't prove its cost, so it's never shown with a ₹ figure.
- **Habit costs are never added together**, because the same trade can appear in two habits.

## Ship bar (detector layer)

Measured on held-out seeds, 60-day window:
- planted habit recovered in ≥ 90% of months;
- control false alarms ≤ 5%;
- thin data handled correctly 100% of the time;
- zero wrong-habit calls.

**Met** at 60 days (93–97%, 0%, 100%, 0). **Not met** at one month, which is why the window changed.

## Ship bar (narration layer)

Zero orphan numbers, zero advice-word hits, zero habit-language misuse,
identical output across reruns — across all four personas.

**Met, fully**, on the current prompt (v7 — see `PROMPTS_LOG.md` sections
6-7 for the full version history: window wording and the concrete
`size_up_after_loss` rule in v6; varied ruled-out phrasing and a "nothing
found" closing that doesn't chain two unrelated ideas with "so" in v7).
Number tracing / advice filter / state fidelity: 4/4 personas, every
generation. Stability: **4/4 personas, a genuine 5/5** — 20/20 Groq calls
succeeded first pass, no rate limits, no self-check retries (cleaner than
either the v6 run or any v5-era run). Two prompt versions in a row (v6,
then v7) have now independently reached a complete 5/5 for all four.

## Narration layer evals

Provider/model: Groq, `openai/gpt-oss-120b`, temperature 0.2 (see README for
why Groq — free tier, no card — and how to swap providers). Four automated
checks in `eval_narration.py`, run against all four personas:

| Check | What it verifies | Result |
|---|---|---|
| Number tracing | every ₹/%/ratio/count in the narration traces to a value in the analysis JSON | **PASS**, all 4 |
| Advice filter | no instrument/strike/direction/prediction words anywhere | **PASS**, all 4 |
| State fidelity | no habit-language for Vikram/Sara; "watching" never phrased as confirmed | **PASS**, all 4 |
| Stability (5 reruns) | identical habit/watching ids and identical numbers across 5 regenerations | **PASS**, all 4 personas, a genuine 5/5 on v7 — see `PROMPTS_LOG.md` section 7 |

Every single-shot generation, on every prompt version from v2 onward, has
independently passed number-tracing and state-fidelity regardless of
whether a full 5x stability batch was current at the time — the thing
stability is checking for (the model violating a numeric or empty-habits
rule) is already caught per-run by the checks above, and by
`narrate_persona`'s own self-check retry at generation time. A full 5/5
stability batch is now current for v7 as well (section 7), but if the
prompt changes again, remember the run in `results/narration_stability/`
only speaks to the prompt it was generated against — re-run it after any
further prompt edit rather than trust a stale pass.

## Not yet tested

- **Detectors without a dedicated persona.** Late-session, fast re-entry (only tested as a confounder) and holds-losers-longer.
- **Real-world validity.** Synthetic data proves the system recovers what was planted, not how common these habits are among Nubra users. Planted effect sizes are assumptions.

## How to run

```
python run_evals.py heldout 2     # ship-decision table (60-day window)
python power.py                   # detection power (dev seeds)
python tune.py                    # threshold sweep (dev seeds)
python export_demo.py             # demo order histories + analysis JSON for the app
```
