# Why narration_system v1 failed

Generated with `python narrate.py --provider groq` (openai/gpt-oss-120b),
sample output saved as `v1_sample_arjun_FAILED.json` alongside this note.

## Failure 1: raw floats leaked into prose (caught by manual read, not by
   eval_narration.py — the 4 automated checks don't grade formatting)

v1 sent the model the raw `evidence` dict straight from the analysis JSON
and told it (Hard Rule 1) not to invent numbers, but never told it *how* to
render the numbers it was allowed to use. The model complied with "don't
invent," and then pasted the JSON's floats verbatim:

> "using a median size of 12562.0 versus 6578.0 normally, which cost you
> 105732.0 and contributed to a net loss of -195375.0 with a win rate of
> 0.281 compared to 0.394 otherwise."

Every number there is traceable (it'd pass number-tracing), but this is not
"plain English" (Hard Rule 5) and would look broken in a broker app: no ₹
grouping, a win rate shown as a decimal instead of a percent, a loss shown
as a bare negative number.

**Fix:** don't ask the model to format numbers at all. `narrate.py` now
pre-formats every evidence value into its exact display string (₹1,05,732;
28%; a loss of ₹1,95,375; 1.91x) before it ever reaches the prompt, and the
model is told those strings are final text to copy, not numbers to
interpret. This is the same principle already applied to the `rule` field —
code produces anything that has one correct mechanical answer; the model
only produces connective prose.

## Failure 2: Sara's (insufficient-data) closing used the word "habit"

> "You have 18 closed trades; need at least 20 before a habit can be
> identified."

This is honest and not a false claim — it doesn't say a habit exists — but
it fails the state-fidelity bar as specified ("for Vikram and Sara the
narration must contain no habit language"), and it's an easy ambiguity to
remove rather than argue with the checker: there's no reason the sentence
needs that specific word.

**Fix:** v2 explicitly forbids the literal word "habit" (and "pattern you
have") anywhere in an insufficient-data or nothing-found narration, with an
example of the intended phrasing ("...before it can look for a pattern" /
"...before this can look for a repeated pattern").
