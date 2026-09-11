# Why narration_system v3 failed

Not caught by eval_narration.py — this is a content-correctness bug the four
automated checks (number tracing, advice filter, state fidelity, stability)
don't cover, found by reading the actual output. Sample saved as
`v3_sample_vikram_FAILED.json`.

v3 passed all four automated checks for all four personas. But Vikram's
(nothing-found) closing read:

> "Pick one rule to focus on for next month"

Vikram has zero qualified habits — there is no rule to pick. Screen 4
(Commit) only makes sense when a habit exists to commit to. The v3 prompt's
output-format section described the closing as unconditionally "nudging
toward picking one rule for next month," which is only true when `habits` is
non-empty; for a nothing-found or insufficient-data month it produces a
closing line that implies a choice the trader doesn't actually have.

(Sara's insufficient-data closing happened to read fine anyway — "trade a
few more times..." — but that was luck, not a rule the prompt enforced.)

**Fix (v4):** the closing instruction is now conditional: nudge toward
picking the top habit's rule only when `habits` is non-empty; when it's
empty (either reason), explicitly forbid mentioning "picking" or "choosing"
a rule and ask for a short, honest, encouraging line instead.
