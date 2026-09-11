"""Export demo inputs for the prototype: raw order history + the detector JSON the LLM
will narrate. 60-day evidence window (Jul-Aug 2026), review month = August 2026."""
import json, os
import numpy as np
from generate_personas import PERSONAS, multi_month
from detectors import analyze
import run_evals

DEMO_SEEDS = {"arjun_revenge_sizer": 1, "neha_expiry_day": 1, "vikram_control": 1, "sara_thin_data": 1}
KEEP = ["id", "rank", "label", "kind", "confidence", "cost", "p_value", "evidence",
        "counterfactual", "cost_note", "n", "status"]

def clean(o):
    if isinstance(o, dict): return {k: clean(v) for k, v in o.items()}
    if isinstance(o, (list, tuple)): return [clean(v) for v in o]
    if isinstance(o, (np.integer,)): return int(o)
    if isinstance(o, (np.floating,)): return float(o)
    if isinstance(o, (np.bool_,)): return bool(o)
    return o

def examples(pos, ids, other_ids=(), k=5):
    """Worst trades for this habit, preferring ones NOT claimed by another reported habit,
    so each habit's drill-down tells its own story."""
    own = pos[pos.pos_id.isin(ids)]
    pure = own[~own.pos_id.isin(other_ids)]
    ex = (pure if len(pure) >= 3 else own).sort_values("net_pnl").head(k)
    return [dict(trade_id=r.pos_id, date=str(r.date), entry=r.entry_time.strftime("%H:%M"),
                 symbol=r.symbol, entry_size_rs=round(r.initial_value), net_pnl=round(r.net_pnl),
                 averaged_down=bool(r.averaged_down)) for r in ex.itertuples()]

os.makedirs("demo", exist_ok=True)
for name, seed in DEMO_SEEDS.items():
    orders = multi_month(PERSONAS[name]["fn"], seed, 2)
    res = analyze(orders, seed=seed, review_month="2026-08")
    ok, why = run_evals.check(name, res)
    pos = res["positions"]
    out = dict(persona=name, summary=res["summary"], insufficient_data=res["insufficient_data"],
               message=res.get("message"), note=res.get("note"),
               habits=[{**{k: h[k] for k in KEEP if k in h},
                        "example_trades": examples(pos, h["trade_ids"],
                                                   set().union(*[set(o["trade_ids"]) for o in res["habits"] + res["watching"] if o is not h]))}
                       for h in res["habits"]],
               also_noticed=[{k: h[k] for k in KEEP if k in h} for h in res["also_noticed"]],
               watching=[{k: h[k] for k in KEEP if k in h} for h in res["watching"]],
               not_reported=[dict(id=h["id"], reason=h.get("reason")) for h in res["rejected"]])
    orders.to_csv(f"demo/{name}_orders_jul-aug-2026.csv", index=False)
    with open(f"demo/{name}_analysis.json", "w") as f:
        json.dump(clean(out), f, indent=2, default=str)
    print(f"{name:22s} seed {seed}: {'PASS' if ok else 'FAIL'} ({why}) | "
          f"habits={[h['id'] for h in res['habits']]} watching={[w['id'] for w in res['watching']]} "
          f"flags={[f['id'] for f in res['also_noticed']]}")
