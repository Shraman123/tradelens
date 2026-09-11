"""Threshold sweep on DEV seeds only (1-30). Pick P_MAX here, confirm on held-out later."""
import detectors, run_evals
from generate_personas import PERSONAS
DEV = range(1, 31)
cache = {n: [(s, PERSONAS[n]["fn"](s)) for s in DEV] for n in PERSONAS}
for pmax in [0.01, 0.02, 0.05, 0.10]:
    detectors.P_MAX = pmax
    row = []
    for n in PERSONAS:
        ok = sum(run_evals.check(n, detectors.analyze(df, seed=s))[0] for s, df in cache[n])
        row.append(f"{n.split('_')[0]} {ok}/30")
    print(f"P_MAX={pmax:<5}", " | ".join(row))
