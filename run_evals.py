"""
Detector evals against planted ground truth.
Thresholds are tuned ONLY on DEV seeds; the ship decision is made on HELD-OUT seeds.
Usage: python run_evals.py dev|heldout
"""
import sys
import collections
from generate_personas import PERSONAS, multi_month
from detectors import analyze

DEV_SEEDS = range(1, 11)
HELDOUT_SEEDS = range(101, 131)


def check(name, res):
    """Return (pass, reason) for one persona-month against its ground truth."""
    ids = [h["id"] for h in res["habits"]]
    if name == "sara_thin_data":
        ok = res["insufficient_data"] and not ids
        return ok, "insufficient-data response" if ok else f"called habits {ids}"
    if name == "vikram_control":
        ok = not ids
        return ok, "no habits" if ok else f"FALSE POSITIVE {ids}"
    planted = PERSONAS[name]["planted"]
    if len(planted) == 1 and (not ids or ids[0] != planted[0]):
        return False, f"#1 was {ids[0] if ids else 'nothing'}, expected {planted[0]}"
    missing = [p for p in planted if p not in ids]
    extra = [i for i in ids if i not in planted]
    if missing:
        return False, f"missed {missing}"
    if extra:
        return False, f"unplanted habit(s) {extra}"
    return True, "planted habits recovered, nothing invented"


def main(split, n_months=1):
    seeds = DEV_SEEDS if split == "dev" else HELDOUT_SEEDS
    fails, flags, table = [], collections.Counter(), {}
    for name, p in PERSONAS.items():
        passed = 0
        for s in seeds:
            res = analyze(multi_month(p["fn"], s, n_months), seed=s)
            ok, why = check(name, res)
            passed += ok
            if not ok:
                fails.append((name, s, why))
            for f in res["also_noticed"]:
                flags[(name, "flag:" + f["id"])] += 1
            for w in res["watching"]:
                flags[(name, "watching:" + w["id"])] += 1
        table[name] = (passed, len(seeds))
    print(f"\n=== {split.upper()} | {n_months} month(s) | {len(seeds)} seeds per persona ===")
    for name, (k, n) in table.items():
        print(f"{name:22s} {k:3d}/{n}   expect: {PERSONAS[name]['expect']}")
    print("\nNon-habit mentions (flag-only / watching):", dict(flags) or "none")
    print("\nFailures:" if fails else "\nFailures: none")
    for f in fails:
        print("  ", f)
    return table, fails, flags


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "dev",
         int(sys.argv[2]) if len(sys.argv) > 2 else 1)
