"""
TradeLens narration generator.

Turns one detector-output JSON (demo/<persona>_analysis.json) into the plain-
language text shown on the Review screen (demo/<persona>_narration.json).

Design rule: this script computes NOTHING. It sends the already-computed
analysis JSON to Claude with a system prompt (prompts/narration_system.md)
that forbids inventing numbers or giving trading advice, and writes back only
the prose. The one exception is the process `rule` text, which this script
injects verbatim from RULE_TEMPLATES (sourced from habit_library.md) rather
than letting the model write it — the "never suggest an instrument/strike/
direction" line is a hard product requirement, so the safest rule text is one
the model never gets to phrase itself.

Usage:
    python narrate.py                    # regenerate demo/<persona>_narration.json (the shipped output)
    python narrate.py --stability 5      # run each persona 5x into results/narration_stability/, for eval_narration.py
    python narrate.py --persona sara_thin_data --system prompts/narration_system.md
"""
import argparse
import json
import os
import re
import sys
import time
import urllib.request
import urllib.error

DEMO_DIR = "demo"
STABILITY_DIR = os.path.join("results", "narration_stability")
DEFAULT_SYSTEM = os.path.join("prompts", "narration_system.md")
MODEL = os.environ.get("ANTHROPIC_MODEL", "claude-sonnet-5")
API_URL = "https://api.anthropic.com/v1/messages"

PERSONAS = ["arjun_revenge_sizer", "neha_expiry_day", "vikram_control", "sara_thin_data"]

# Verbatim from habit_library.md's "Process rule (template)" column.
# The narration LLM never writes this text; it only receives it as `fixed_rule`
# on each habit and is instructed to copy it verbatim.
RULE_TEMPLATES = {
    "size_up_after_loss": "After a loss, your next entry is your usual size.",
    "averaging_down": "Decide full size before entry. No adds below your entry price.",
    "expiry_day_trading": "Set a hard cap on expiry-day trades before the open.",
    "fast_reentry_after_loss": "10-minute cooldown after any losing exit.",
    "late_session_trading": "No new entries after 2:30 PM.",
    "overtrading": "Stop after trade #6.",
    "holds_losers_longer": "Write your exit-on-loss level before you enter.",
}

# Fields safe to send to the narration LLM. Deliberately excludes anything
# symbol-bearing (example_trades has "NIFTY ... CE/PE" strings, which would
# hand the model text it could echo straight past the no-advice rule) and
# not_reported (rendered by the app directly from analysis.json; no prose
# needed there, so no reason to give the model more surface to slip on).
HABIT_FIELDS = ["id", "label", "kind", "confidence", "cost", "n", "evidence", "counterfactual"]


def trimmed_input(analysis: dict) -> dict:
    def strip_habit(h):
        d = {k: h[k] for k in HABIT_FIELDS if k in h}
        d["fixed_rule"] = RULE_TEMPLATES.get(h["id"], "")
        return d

    return dict(
        persona=analysis["persona"],
        summary=analysis["summary"],
        insufficient_data=analysis["insufficient_data"],
        message=analysis.get("message"),
        habits=[strip_habit(h) for h in analysis.get("habits", [])],
        watching=[strip_habit(h) for h in analysis.get("watching", [])],
        also_noticed=[strip_habit(h) for h in analysis.get("also_noticed", [])],
    )


def call_claude(system_prompt: str, user_json: dict, retries=3) -> dict:
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        sys.exit("ANTHROPIC_API_KEY is not set in this shell's environment.")
    body = json.dumps(dict(
        model=MODEL,
        max_tokens=2000,
        temperature=0.2,
        system=system_prompt,
        messages=[{"role": "user", "content": json.dumps(user_json, indent=2)}],
    )).encode()
    req = urllib.request.Request(API_URL, data=body, method="POST", headers={
        "content-type": "application/json",
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
    })
    last_err = None
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                data = json.loads(resp.read())
            text = data["content"][0]["text"].strip()
            text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text, flags=re.MULTILINE).strip()
            return json.loads(text)
        except urllib.error.HTTPError as e:
            last_err = f"HTTP {e.code}: {e.read().decode(errors='replace')}"
        except Exception as e:  # noqa: BLE001 - surfaced to caller either way
            last_err = str(e)
        time.sleep(2 * (attempt + 1))
    raise RuntimeError(f"narration call failed after {retries} attempts: {last_err}")


def narrate_persona(name: str, system_prompt: str) -> dict:
    with open(os.path.join(DEMO_DIR, f"{name}_analysis.json")) as f:
        analysis = json.load(f)
    out = call_claude(system_prompt, trimmed_input(analysis))
    out["persona"] = name
    out.setdefault("habits", {})
    out.setdefault("watching", {})
    out.setdefault("also_noticed", {})
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--persona", choices=PERSONAS, help="only this persona (default: all four)")
    ap.add_argument("--system", default=DEFAULT_SYSTEM, help="path to the system prompt file")
    ap.add_argument("--stability", type=int, metavar="N",
                     help="instead of writing demo/, run each persona N times into "
                          f"{STABILITY_DIR}/ for eval_narration.py's stability check")
    args = ap.parse_args()

    with open(args.system) as f:
        system_prompt = f.read()

    personas = [args.persona] if args.persona else PERSONAS

    if args.stability:
        os.makedirs(STABILITY_DIR, exist_ok=True)
        for name in personas:
            for i in range(1, args.stability + 1):
                out = narrate_persona(name, system_prompt)
                path = os.path.join(STABILITY_DIR, f"{name}_run{i}.json")
                with open(path, "w") as f:
                    json.dump(out, f, indent=2)
                print(f"{name} run {i}/{args.stability} -> {path}")
        return

    os.makedirs(DEMO_DIR, exist_ok=True)
    for name in personas:
        out = narrate_persona(name, system_prompt)
        path = os.path.join(DEMO_DIR, f"{name}_narration.json")
        with open(path, "w") as f:
            json.dump(out, f, indent=2)
        print(f"{name} -> {path}")


if __name__ == "__main__":
    main()
