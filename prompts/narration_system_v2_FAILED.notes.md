# Why narration_system v2 failed

Generated with `python narrate.py --provider groq` (openai/gpt-oss-120b),
sample output saved as `v2_sample_arjun_FAILED.json` alongside this note.

v2 fixed both v1 failures (number formatting, Sara's "habit" wording). But
Arjun's watching item still failed state-fidelity:

> "averaging down is starting to show up, worth watching but not yet a
> confirmed habit."

That's honest — it explicitly says "not yet a confirmed habit" — but it's a
self-inflicted bug: v2's own rule 3 described the intended tone as "say it's
a pattern worth keeping an eye on, **not yet a confirmed habit**", and the
model echoed that example phrase almost verbatim, word "habit" included. I
was asking it to avoid something while modelling the exact word to avoid.

Per the brief's spec ("the watching item must not use 'habit'/'pattern you
have'"), the word itself is banned here regardless of how it's hedged, same
as the insufficient-data case in v1.

**Fix (v3):** rule 3 rewritten to explicitly forbid the literal word "habit"
in a watching note (not just discourage calling it confirmed), and its
example phrasing avoids the word entirely ("worth watching", "not confirmed
yet", "starting to show up") instead of demonstrating the word next to a
negation.
