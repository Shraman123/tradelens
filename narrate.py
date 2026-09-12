"""
TradeLens narration generator.

Turns one detector-output JSON (demo/<persona>_analysis.json) into the plain-
language text shown on the Review screen (demo/<persona>_narration.json).

Design rule: this script computes NOTHING. It sends the already-computed
analysis JSON to an LLM with a system prompt (prompts/narration_system.md)
that forbids inventing numbers or giving trading advice, and writes back only
the prose. The one exception is the process `rule` text, which this script
injects verbatim from RULE_TEMPLATES (sourced from habit_library.md) rather
than letting the model write it — the "never suggest an instrument/strike/
direction" line is a hard product requirement, so the safest rule text is one
the model never gets to phrase itself.

Two providers, same prompt and same schema — swap with --provider or the
LLM_PROVIDER env var:
    anthropic   ANTHROPIC_API_KEY, model via ANTHROPIC_MODEL (default claude-sonnet-5)
    groq        GROQ_API_KEY (free tier, no card), model via GROQ_MODEL
                (default llama-3.3-70b-versatile)
Provider choice is a cost/quality tradeoff, not a product decision — the
guardrails in the prompt and in eval_narration.py are what actually keep the
output honest, whichever model is answering.

Usage:
    python narrate.py                            # regenerate demo/<persona>_narration.json (the shipped output)
    python narrate.py --provider groq            # same, forcing a specific provider
    python narrate.py --stability 5               # run each persona 5x into results/narration_stability/, for eval_narration.py
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

from eval_narration import check_number_tracing, check_advice_filter, check_state_fidelity

DEMO_DIR = "demo"
STABILITY_DIR = os.path.join("results", "narration_stability")
DEFAULT_SYSTEM = os.path.join("prompts", "narration_system.md")
DEFAULT_PROVIDER = os.environ.get("LLM_PROVIDER", "groq")

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


def _round_100(v: float) -> int:
    return int(round(v / 100.0)) * 100


# size_up_after_loss's rule ("your usual size") refers to a quantity the
# evidence already names exactly: median_entry_size_otherwise IS "your usual
# size". Naming it concretely (rounded to the nearest ₹100 — this is a rule
# of thumb, not a claim of precision) makes the rule actionable instead of
# abstract. Checked every other detector's evidence for the same fit: none
# of the other six rules refer to a quantity their own evidence contains
# (the underlying thresholds — 5-minute reentry window, 2:30pm cutoff,
# trade #7 — are detection parameters in detectors.py, not evidence fields,
# so naming them here would mean inventing a number not in the analysis
# JSON) — see PROMPTS_LOG.md for the per-detector check. They keep the
# static template above.
def _rule_size_up_after_loss(evidence: dict) -> str:
    usual = evidence.get("median_entry_size_otherwise")
    amount = f"about {_rupees(_round_100(usual))}" if usual is not None else "your usual size"
    return (
        f"After a loss, your next entry stays at your usual size — {amount}. "
        f"If you want to size up, it has to be a separate decision made before "
        f"the session, not after a loss."
    )


RULE_BUILDERS = {
    "size_up_after_loss": _rule_size_up_after_loss,
}


def fixed_rule_for(h: dict) -> str:
    builder = RULE_BUILDERS.get(h["id"])
    if builder:
        return builder(h.get("evidence", {}))
    return RULE_TEMPLATES.get(h["id"], "")

# Fields safe to send to the narration LLM. Deliberately excludes anything
# symbol-bearing (example_trades has "NIFTY ... CE/PE" strings, which would
# hand the model text it could echo straight past the no-advice rule) and
# not_reported (rendered by the app directly from analysis.json; no prose
# needed there, so no reason to give the model more surface to slip on).
HABIT_FIELDS = ["id", "label", "kind", "confidence", "n", "counterfactual"]

# --- number formatting -------------------------------------------------------
# v1 sent the model raw evidence floats and told it not to invent numbers, but
# never said how to render the numbers it WAS allowed to use — it complied by
# pasting JSON floats straight into prose ("0.281", "-195375.0", "105732.0").
# Traceable, but not "plain English", and not what a broker app should show a
# user. Fix: code formats every number into its exact final string (₹ with
# Indian grouping, rates as %, ratios as "x") and the model is told these are
# text to copy, not numbers to interpret — the same principle already used for
# the `rule` field. See prompts/narration_system_v1_FAILED.notes.md.


def inr(n) -> str:
    """Indian digit grouping: 105732 -> '1,05,732'."""
    n = int(round(n))
    sign, n = ("-", -n) if n < 0 else ("", n)
    s = str(n)
    if len(s) <= 3:
        return sign + s
    head, last3 = s[:-3], s[-3:]
    parts = []
    while len(head) > 2:
        parts.insert(0, head[-2:])
        head = head[:-2]
    if head:
        parts.insert(0, head)
    return sign + ",".join(parts) + "," + last3


def _rupees(v) -> str:
    return f"₹{inr(v)}"


def _rupees_signed(v) -> str:
    v = round(v)
    if v < 0:
        return f"a loss of ₹{inr(-v)}"
    if v > 0:
        return f"a gain of ₹{inr(v)}"
    return "₹0"


def _pct(v) -> str:
    return f"{round(v * 100)}%"


def _pct_signed(v) -> str:
    pct = v * 100
    if pct < 0:
        return f"a {round(-pct)}% loss"
    if pct > 0:
        return f"a {round(pct)}% gain"
    return "0%"


def _ratio(v) -> str:
    return f"{v:.2f}x"


def _minutes(v) -> str:
    return f"{v:g} minutes"


def _count(v) -> str:
    return str(int(v))


# Keyed on the exact evidence field names detectors.py produces (see
# d_size_up_after_loss, d_averaging_down, _slice_habit, d_disposition).
EVIDENCE_FORMATTERS = {
    "median_entry_size_after_loss": _rupees, "median_entry_size_otherwise": _rupees,
    "after_loss_net": _rupees_signed, "net_on_these_positions": _rupees_signed,
    "slice_net": _rupees_signed, "slice_avg": _rupees_signed, "rest_avg": _rupees_signed,
    "after_loss_win_rate": _pct, "other_win_rate": _pct, "added_leg_loss_rate": _pct,
    "slice_win_rate": _pct, "rest_win_rate": _pct,
    "added_leg_avg_return": _pct_signed, "other_trades_avg_return": _pct_signed,
    "slice_avg_return": _pct_signed, "rest_avg_return": _pct_signed,
    "size_ratio": _ratio, "hold_ratio": _ratio,
    "after_loss_trades": _count, "averaged_positions": _count,
    "slice_trades": _count, "rest_trades": _count,
    "median_hold_losers_min": _minutes, "median_hold_winners_min": _minutes,
}


def format_evidence(evidence: dict) -> dict:
    return {k: (EVIDENCE_FORMATTERS[k](v) if k in EVIDENCE_FORMATTERS else v)
            for k, v in evidence.items()}


def trimmed_input(analysis: dict) -> dict:
    def strip_habit(h):
        d = {k: h[k] for k in HABIT_FIELDS if k in h}
        d["cost"] = _rupees(h["cost"]) if h.get("cost") is not None else None
        d["fixed_rule"] = fixed_rule_for(h)  # raw evidence — before formatting, below
        d["evidence"] = format_evidence(h.get("evidence", {}))
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


def _extract_json(text: str) -> dict:
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text, flags=re.MULTILINE).strip()
    return json.loads(text)


# Reliability counters for the "what didn't work" record — see eval_report.md
# and PROMPTS_LOG.md. Distinguishes a malformed/non-JSON model response (a
# free-tier-model reliability question) from a network/HTTP retry (an
# infrastructure question) from a self-check retry (a content-correctness
# question) — three different things worth three different rates.
STATS = {"top_level_calls": 0, "malformed_json_retries": 0,
         "network_or_http_retries": 0, "self_check_retries": 0}


def _post(url: str, headers: dict, body: dict, retries: int, get_text) -> dict:
    """POST with retry. Retries cover HTTP failures AND a malformed/non-JSON
    model response (an LLM occasionally returns truncated or non-JSON text;
    that's a retryable flake, not a reason to crash the whole batch — this
    is what actually happened on run 5/5 for neha_expiry_day mid-stability-run,
    which crashed before this fix instead of just retrying that one call)."""
    STATS["top_level_calls"] += 1
    data = json.dumps(body).encode()
    # Some providers sit behind bot protection (e.g. Cloudflare) that rejects
    # Python's default urllib User-Agent outright. Look like an ordinary client.
    headers = {"User-Agent": "Mozilla/5.0", "Accept": "application/json", **headers}
    req = urllib.request.Request(url, data=data, method="POST", headers=headers)
    last_err = None
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                response = json.loads(resp.read())
        except urllib.error.HTTPError as e:
            last_err = f"HTTP {e.code}: {e.read().decode(errors='replace')}"
            STATS["network_or_http_retries"] += 1
            time.sleep(2 * (attempt + 1))
            continue
        except Exception as e:  # noqa: BLE001 - network/transport-level failure
            last_err = f"{type(e).__name__}: {e}"
            STATS["network_or_http_retries"] += 1
            time.sleep(2 * (attempt + 1))
            continue
        try:
            return _extract_json(get_text(response))
        except Exception as e:  # noqa: BLE001 - the call succeeded; the CONTENT wasn't valid JSON
            last_err = f"malformed model output ({type(e).__name__}): {e}"
            STATS["malformed_json_retries"] += 1
            time.sleep(2 * (attempt + 1))
    raise RuntimeError(f"LLM call failed after {retries} attempts: {last_err}")


def call_anthropic(system_prompt: str, user_json: dict, retries=3) -> dict:
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        sys.exit("ANTHROPIC_API_KEY is not set in this shell's environment.")
    model = os.environ.get("ANTHROPIC_MODEL", "claude-sonnet-5")
    body = dict(
        model=model,
        max_tokens=3000,
        temperature=0.2,
        system=system_prompt,
        messages=[{"role": "user", "content": json.dumps(user_json, indent=2)}],
    )
    headers = {
        "content-type": "application/json",
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
    }
    return _post("https://api.anthropic.com/v1/messages", headers, body, retries,
                 get_text=lambda data: data["content"][0]["text"])


def call_groq(system_prompt: str, user_json: dict, retries=3) -> dict:
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        sys.exit("GROQ_API_KEY is not set in this shell's environment.")
    model = os.environ.get("GROQ_MODEL", "openai/gpt-oss-120b")
    body = dict(
        model=model,
        temperature=0.2,
        max_tokens=3000,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": json.dumps(user_json, indent=2)},
        ],
    )
    headers = {
        "content-type": "application/json",
        "authorization": f"Bearer {api_key}",
    }
    return _post("https://api.groq.com/openai/v1/chat/completions", headers, body, retries,
                 get_text=lambda data: data["choices"][0]["message"]["content"])


PROVIDERS = {"anthropic": call_anthropic, "groq": call_groq}


SELF_CHECKS = [check_number_tracing, check_advice_filter, check_state_fidelity]


def narrate_persona(name: str, system_prompt: str, provider: str, self_check_retries=2) -> dict:
    """Generate, then validate against the same checks eval_narration.py runs
    (number tracing, advice filter, state fidelity) before accepting the
    output — regenerating on failure rather than shipping bad prose and
    hoping a separate eval run catches it later. Added after a stability run
    surfaced a real digit-insertion error (evidence said "₹449", one run's
    prose said "₹9449") that number_tracing would have caught immediately
    had it run against that specific output instead of only the final one
    shipped to demo/. See narrate.py's git history / PROMPTS_LOG.md."""
    with open(os.path.join(DEMO_DIR, f"{name}_analysis.json")) as f:
        analysis = json.load(f)

    last_reason = None
    for attempt in range(self_check_retries + 1):
        out = PROVIDERS[provider](system_prompt, trimmed_input(analysis))
        out["persona"] = name
        out.setdefault("habits", {})
        out.setdefault("watching", {})
        out.setdefault("also_noticed", {})
        failed = [(fn.__name__, msg) for fn in SELF_CHECKS
                  for ok, msg in [fn(name, analysis, out)] if not ok]
        if not failed:
            return out
        last_reason = failed
        STATS["self_check_retries"] += 1
        print(f"  [{name}] self-check failed on attempt {attempt + 1}, retrying: {failed}")
    raise RuntimeError(f"{name}: failed self-checks after {self_check_retries + 1} attempts: {last_reason}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--persona", choices=PERSONAS, help="only this persona (default: all four)")
    ap.add_argument("--system", default=DEFAULT_SYSTEM, help="path to the system prompt file")
    ap.add_argument("--provider", choices=list(PROVIDERS), default=DEFAULT_PROVIDER,
                     help=f"which LLM API to call (default: {DEFAULT_PROVIDER}, or set LLM_PROVIDER)")
    ap.add_argument("--stability", type=int, metavar="N",
                     help="instead of writing demo/, run each persona N times into "
                          f"{STABILITY_DIR}/ for eval_narration.py's stability check")
    ap.add_argument("--delay", type=float, default=0.0,
                     help="seconds to sleep between calls (useful to stay under a free-tier "
                          "tokens-per-minute limit, e.g. Groq's 8000 TPM)")
    args = ap.parse_args()

    with open(args.system) as f:
        system_prompt = f.read()

    personas = [args.persona] if args.persona else PERSONAS

    failures = []

    if args.stability:
        os.makedirs(STABILITY_DIR, exist_ok=True)
        for name in personas:
            for i in range(1, args.stability + 1):
                try:
                    out = narrate_persona(name, system_prompt, args.provider)
                except Exception as e:  # noqa: BLE001 - one bad call shouldn't abort the batch
                    print(f"[{args.provider}] {name} run {i}/{args.stability} FAILED: {e}")
                    failures.append(f"{name} run {i}")
                    continue
                path = os.path.join(STABILITY_DIR, f"{name}_run{i}.json")
                with open(path, "w") as f:
                    json.dump(out, f, indent=2)
                print(f"[{args.provider}] {name} run {i}/{args.stability} -> {path}")
                if args.delay:
                    time.sleep(args.delay)
    else:
        os.makedirs(DEMO_DIR, exist_ok=True)
        for name in personas:
            try:
                out = narrate_persona(name, system_prompt, args.provider)
            except Exception as e:  # noqa: BLE001 - one bad call shouldn't abort the batch
                print(f"[{args.provider}] {name} FAILED: {e}")
                failures.append(name)
                continue
            path = os.path.join(DEMO_DIR, f"{name}_narration.json")
            with open(path, "w") as f:
                json.dump(out, f, indent=2)
            print(f"[{args.provider}] {name} -> {path}")

    calls = STATS["top_level_calls"]
    malformed_rate = STATS["malformed_json_retries"] / calls if calls else 0
    print(f"\nReliability: {calls} top-level API calls | "
          f"malformed-JSON retries: {STATS['malformed_json_retries']} ({malformed_rate:.0%}) | "
          f"network/HTTP retries: {STATS['network_or_http_retries']} | "
          f"self-check retries: {STATS['self_check_retries']}")

    if failures:
        sys.exit(f"\n{len(failures)} call(s) failed after retries, re-run for just these: {failures}")


if __name__ == "__main__":
    main()
