"""
TradeLens narration evals.

Checks the LLM narration layer the way detectors.py's evals check the
detector layer: automatically, against ground truth, with a real pass/fail
bar. Run after `python narrate.py` (and `python narrate.py --stability 5`).

    python eval_narration.py

Five checks, per persona, against demo/<persona>_analysis.json and
demo/<persona>_narration.json:

1. Number tracing   - every number in the narration text must trace to a
                       number that appears somewhere in the analysis JSON
                       (as a value, or embedded in a string like `message`
                       or `counterfactual`), allowing for the ordinary
                       reformattings a human writer would use (comma
                       grouping, a rate expressed as a rounded percent,
                       a ratio written as "1.91x"). headline/closing stay
                       number-free with one exception (v6): a "nothing
                       found" closing (enough data, no habits) may state
                       the review-month trade count, and only that number.
2. Advice filter    - no instrument / strike / direction / prediction words
                       anywhere in the narration text.
3. State fidelity   - insufficient_data / no-habits personas contain no habit
                       language; "watching" items are never called a habit.
4. Redundant framing - v8: some evidence values are handed to the model as a
                       complete phrase already ("a loss of ₹X"), and it has
                       been observed writing its own "a loss of"/"a gain of"
                       immediately in front of one anyway ("produced a loss
                       of a loss of ₹1,95,375" — a real generation, not a
                       hypothetical). Number tracing alone can't catch this:
                       the digit is still correct, only the English is
                       broken. Fails on "a loss/gain of" immediately
                       followed by another "a loss/gain of".
5. Stability        - across N reruns (results/narration_stability/), the set
                       of habit/watching ids named and every number used is
                       identical.
"""
import glob
import json
import os
import re
import sys

DEMO_DIR = "demo"
STABILITY_DIR = os.path.join("results", "narration_stability")

ADVICE_WORDS = [
    r"\bCE\b", r"\bPE\b", r"\bcall\b", r"\bput\b", r"\bbuy\b", r"\bsell\b",
    r"\bshort\b", r"\blong\b", r"\bstrike\b", r"\bnifty\b", r"\bbank nifty\b",
    r"\bexpect\b", r"will rise", r"will fall", r"\btarget\b",
]
ADVICE_RE = re.compile("|".join(ADVICE_WORDS), re.IGNORECASE)

# v8: "a loss of ₹X" / "a gain of ₹X" are already complete phrases (see
# narrate.py's _rupees_signed/_pct_signed) - this catches the model
# prepending its own framing right before one, e.g. "produced a loss of a
# loss of ₹1,95,375". See prompts/narration_system.md rule 1's note.
REDUNDANT_FRAMING_RE = re.compile(r"\ba (?:loss|gain) of\s+a (?:loss|gain) of\b", re.IGNORECASE)

NUMBER_RE = re.compile(r"-?\d[\d,]*\.?\d*")


def all_numbers(obj) -> set:
    """Every number that legitimately appears anywhere in the analysis JSON,
    whether as a value or embedded in a string (dates, `message`, `reason`,
    `counterfactual`, ...), plus the rounded-percent form of any 0-1 rate,
    the 1-decimal form of any ratio-like float, and the nearest-hundred form
    of any larger figure (v6: narrate.py's RULE_BUILDERS rounds a rupee
    evidence value to the nearest ₹100 for a "your usual size is about ₹X"
    rule of thumb — e.g. 6578 -> 6600 — the same kind of ordinary
    reformatting already tolerated for a rate-as-percent). Superset by
    design: the goal is to catch a clearly invented number, not to police
    formatting."""
    out = set()

    def walk(o):
        if isinstance(o, dict):
            for v in o.values():
                walk(v)
        elif isinstance(o, list):
            for v in o:
                walk(v)
        elif isinstance(o, (int, float)) and not isinstance(o, bool):
            # Both signed and absolute-value forms: narration text drops the
            # minus sign and says "a loss of X" instead (see narrate.py's
            # _rupees_signed / _pct_signed), so "195375" must trace back to
            # a JSON value of -195375.0 just as well as one of 195375.0.
            for val in (float(o), abs(float(o))):
                out.add(round(val, 4))
                out.add(round(val))
                if 0 <= val <= 1:
                    out.add(round(val * 100))
                    out.add(round(val * 100, 1))
                if abs(val) >= 100:
                    out.add(round(val / 100) * 100)
        elif isinstance(o, str):
            for m in NUMBER_RE.findall(o):
                try:
                    out.add(round(float(m.replace(",", "")), 4))
                except ValueError:
                    pass

    walk(obj)
    return out


def narration_numbers(text: str) -> set:
    out = set()
    for m in NUMBER_RE.findall(text):
        try:
            out.add(round(float(m.replace(",", "")), 4))
        except ValueError:
            pass
    return out


def narration_text(narration: dict) -> str:
    parts = [narration.get("headline", ""), narration.get("closing", "")]
    for section in ("habits", "watching", "also_noticed"):
        for v in narration.get(section, {}).values():
            parts.append(v.get("why_it_matters", ""))
            parts.append(v.get("note", ""))
            parts.append(v.get("rule", ""))
    return "\n".join(p for p in parts if p)


def check_number_tracing(persona, analysis, narration):
    allowed = all_numbers(analysis)
    problems = []

    text = narration_text(narration)
    used = narration_numbers(text)
    # tolerance of 1 absolute unit covers ordinary human rounding (e.g. 33.7% -> "34%")
    orphans = [n for n in used if not any(abs(n - a) <= 1 for a in allowed)]
    if orphans:
        problems.append(f"orphan numbers: {orphans}")

    # v5: headline/closing are tone, never data (stability requirement - see
    # narration_system_v4_FAILED.notes.md), and watching/also_noticed are
    # never given a specific figure at all (see rule 3).
    #
    # v6: one narrow, deliberate exception. The "nothing found" closing
    # (enough data, no habits) is allowed to state the review-month trade
    # count -- and only that number -- to explain what "nothing found"
    # means at the trader's own scale (see prompts/narration_system.md's
    # rule 4 and its closing guidance). Every other case, and every other
    # field, stays number-free exactly as before.
    nothing_found = not analysis["insufficient_data"] and not analysis.get("habits")
    trade_count = analysis.get("summary", {}).get("review_month", {}).get("closed_trades")
    closing_allowed = {round(float(trade_count), 4)} if (nothing_found and trade_count is not None) else set()

    for field in ("headline", "closing"):
        nums = narration_numbers(narration.get(field, ""))
        stray = nums - closing_allowed if field == "closing" else nums
        if stray:
            problems.append(f"{field} contains a number that shouldn't be there ({stray}): {narration[field]!r}")
    for section in ("watching", "also_noticed"):
        for hid, w in narration.get(section, {}).items():
            if narration_numbers(w.get("note", "")):
                problems.append(f"{section}.{hid} note contains a number (must be zero): {w['note']!r}")

    return (len(problems) == 0, "; ".join(problems) if problems else "ok")


def check_advice_filter(persona, analysis, narration):
    text = narration_text(narration)
    hits = ADVICE_RE.findall(text)
    return (len(hits) == 0, f"advice words found: {hits}" if hits else "ok")


def check_redundant_framing(persona, analysis, narration):
    text = narration_text(narration)
    hits = REDUNDANT_FRAMING_RE.findall(text)
    return (len(hits) == 0, f"redundant framing found: {hits}" if hits else "ok")


def check_state_fidelity(persona, analysis, narration):
    text_all = (narration.get("headline", "") + " " + narration.get("closing", "")).lower()
    if analysis["insufficient_data"] or not analysis.get("habits"):
        for word in ("habit", "pattern you have"):
            if word in text_all:
                return (False, f"'{word}' used in a no-habit/insufficient-data narration")
    for hid, w in narration.get("watching", {}).items():
        note = w.get("note", "").lower()
        if "habit" in note or "pattern you have" in note:
            return (False, f"watching item '{hid}' phrased as a confirmed habit: {note!r}")
    return (True, "ok")


def check_stability(persona):
    runs = sorted(glob.glob(os.path.join(STABILITY_DIR, f"{persona}_run*.json")))
    if not runs:
        return (None, "no stability runs found (run: python narrate.py --stability 5)")
    loaded = [json.load(open(r)) for r in runs]
    habit_sets = [frozenset(n.get("habits", {}).keys()) | frozenset(n.get("watching", {}).keys())
                  for n in loaded]
    number_sets = [narration_numbers(narration_text(n)) for n in loaded]
    ids_stable = len(set(habit_sets)) == 1
    numbers_stable = all(s == number_sets[0] for s in number_sets)
    if ids_stable and numbers_stable:
        return (True, f"{len(runs)} runs, identical ids and numbers")
    detail = []
    if not ids_stable:
        detail.append(f"habit/watching ids varied: {[sorted(s) for s in habit_sets]}")
    if not numbers_stable:
        detail.append("numbers varied across runs")
    return (False, "; ".join(detail))


def main():
    personas = sorted(p.replace("_analysis.json", "")
                       for p in os.listdir(DEMO_DIR) if p.endswith("_analysis.json"))
    all_ok = True
    for persona in personas:
        analysis = json.load(open(os.path.join(DEMO_DIR, f"{persona}_analysis.json")))
        narr_path = os.path.join(DEMO_DIR, f"{persona}_narration.json")
        if not os.path.exists(narr_path):
            print(f"{persona}: MISSING narration (run: python narrate.py)")
            all_ok = False
            continue
        narration = json.load(open(narr_path))
        results = {
            "number_tracing": check_number_tracing(persona, analysis, narration),
            "advice_filter": check_advice_filter(persona, analysis, narration),
            "state_fidelity": check_state_fidelity(persona, analysis, narration),
            "redundant_framing": check_redundant_framing(persona, analysis, narration),
        }
        stable_ok, stable_msg = check_stability(persona)
        results["stability"] = (True if stable_ok is None else stable_ok, stable_msg)

        persona_ok = all(ok for ok, _ in results.values() if ok is not None) and stable_ok is not False
        all_ok = all_ok and persona_ok
        print(f"\n{persona}: {'PASS' if persona_ok else 'FAIL'}")
        for check, (ok, msg) in results.items():
            status = "skip" if ok is None else ("ok" if ok else "FAIL")
            print(f"  {check:16s} [{status}] {msg}")

    print(f"\n{'ALL PASS' if all_ok else 'SOME CHECKS FAILED'}")
    sys.exit(0 if all_ok else 1)


if __name__ == "__main__":
    main()
