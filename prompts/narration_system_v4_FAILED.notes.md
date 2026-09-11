# Why narration_system v4 failed

Caught by `eval_narration.py`'s stability check (5 reruns via
`python narrate.py --stability 5`), which is exactly the check this failure
mode exists to catch. Sample runs preserved in `v4_stability_samples/`.

v4 passed number-tracing, advice-filter and state-fidelity for all four
personas on every run. But the stability check failed for 3 of 4:

- **arjun_revenge_sizer**: `why_it_matters` cited a different *subset* of the
  habit's evidence each run — run 1 mentioned the win-rate comparison, run 2
  added the size ratio, run 4 used the median entry sizes instead of the net
  P&L figure. Nothing was invented (every number traced fine individually),
  but which numbers appeared varied run to run. Separately, the `watching`
  note for `averaging_down` sometimes stated its ₹35,792 cost and sometimes
  didn't — v4 never said whether a watching note should include a number,
  so the model decided freely each time.
- **neha_expiry_day**: same subset-selection issue in `why_it_matters`.
- **sara_thin_data**: the headline/closing sometimes restated "18" and "20"
  (the trade count and minimum) and sometimes didn't — v4's instruction said
  the model "may" restate them, i.e. optional, so it was inconsistent by
  construction.
- **vikram_control** (no habits, no eligible numbers anywhere) passed
  trivially — nothing to be inconsistent about.

The common root cause: v4 left several things *optional* ("you may restate
the count", no guidance on whether a watching note carries a number, no
requirement to cover every evidence field). An LLM asked to write free prose
around optional content will vary what it includes, run to run, by
construction — reproducibility needs a decision has to be always-on or
always-off, never left to the model's discretion.

**Fix (v5):**
- A habit's `why_it_matters` must now cite *every* value in that habit's
  `evidence` plus its `cost` — completeness, not a curated subset.
- `watching` and `also_noticed` notes must never contain a number at all —
  purely qualitative, so there's nothing to vary. (This is a real product
  narrowing, not just a determinism hack: it also keeps "watching" from
  reading as authoritative as a confirmed, costed habit — flagged to the
  user separately.)
- The headline's insufficient-data exception (allowed to restate the trade
  count) is removed — headline and closing are now unconditionally
  number-free in every state. The UI shows the exact trade count from
  `summary`/`message` directly; the narration doesn't need to repeat it.
