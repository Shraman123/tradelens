"""Detection power vs planted effect size and months of data (DEV seeds only)."""
import generate_personas as gp, detectors, pandas as pd

months = gp.multi_month

def rate(fn, hid, n_months, seeds=range(1, 31)):
    hit = watch = 0
    for s in seeds:
        r = detectors.analyze(months(fn, s, n_months), seed=s)
        ids = [h["id"] for h in r["habits"]]
        if hid is None:            # control: any habit at all is a false alarm
            hit += bool(ids); watch += bool(r["watching"])
        else:
            hit += hid in ids; watch += (hid not in ids) and hid in [w["id"] for w in r["watching"]]
    return hit, watch, len(seeds)

rows = []
for q in [0.60, 0.65, 0.72, 0.80]:
    gp.EXPIRY_DECAY_PROB = q
    ev = q * -0.675 + (1 - q) * 0.75
    for m in (1, 2):
        h, w, n = rate(gp.persona_expiry, "expiry_day_trading", m)
        rows.append(("Neha expiry-day", f"{ev:+.0%}/trade", m, h, w, n))
gp.EXPIRY_DECAY_PROB = 0.72
for m in (1, 2):
    h, w, n = rate(gp.persona_revenge, "averaging_down", m); rows.append(("Arjun averaging-down", "-12% added lots", m, h, w, n))
    h, w, n = rate(gp.persona_revenge, "size_up_after_loss", m); rows.append(("Arjun size-up", "2x after loss", m, h, w, n))
    h, w, n = rate(gp.persona_control, None, m); rows.append(("Vikram control (false alarms)", "none planted", m, h, w, n))
df = pd.DataFrame(rows, columns=["habit", "planted effect", "months", "detected", "watching", "of"])
print(df.to_string(index=False))
df.to_csv("power_results.csv", index=False)
