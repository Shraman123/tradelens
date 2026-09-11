"""
TradeLens habit detectors.

Design rule: code computes every number; the LLM (later) only explains what this
module outputs. A habit is reported only if it clears THREE gates:
  1. enough data     - month has >= MIN_TRADES closed trades, slice has >= MIN_SLICE
  2. not noise       - one-sided permutation test p < P_MAX vs the trader's other trades
  3. material        - counterfactual cost >= MIN_COST rupees
Then overlapping habits are de-duplicated so the same trades are never blamed twice.
"""
import datetime as dt
import numpy as np
import pandas as pd

from generate_personas import BROKERAGE_PER_ORDER, SELL_SIDE_LEVY, TURNOVER_LEVY, position_charges

# ---------------- GATES (judgment calls - tune on dev seeds only) ----------------
MIN_TRADES = 20
MIN_SLICE = 8
MIN_AVG_DOWN = 5
P_MAX = 0.01               # ~5 tests per month -> ~5% family-wise false-alarm budget
MIN_COST_FLOOR = 1000.0     # never interrupt a user for less than Rs1,000...
MIN_COST_SHARE = 0.01       # ...or less than 1% of the premium they bought this month
SIZE_RATIO = 1.3
HOLD_RATIO = 1.5
FAST_REENTRY_MIN = 5
LATE_SESSION = dt.time(14, 30)
OVERTRADE_FROM = 7          # 7th trade of the day onwards
P_WATCH = 0.10              # emerging-but-unproven: shown as 'watching', never as a habit
N_PERM = 5000
# ----------------------------------------------------------------------------------


def normalize(orders: pd.DataFrame) -> pd.DataFrame:
    """Raw order history -> one row per closed position (flat-to-flat per symbol)."""
    o = orders[orders.status == "COMPLETE"].copy()
    o["timestamp"] = pd.to_datetime(o.timestamp)
    o = o.sort_values(["symbol", "timestamp"])
    rows = []
    for sym, g in o.groupby("symbol", sort=False):
        net, legs = 0, []
        for r in g.itertuples():
            legs.append(r)
            net += r.qty if r.side == "BUY" else -r.qty
            if net == 0:
                rows.append(_position(sym, legs))
                legs = []
    pos = pd.DataFrame(rows).sort_values("entry_time").reset_index(drop=True)
    pos["pos_id"] = [f"T{i + 1:03d}" for i in range(len(pos))]
    pos["date"] = pos.entry_time.dt.date
    pos["day_index"] = pos.groupby("date").cumcount() + 1
    pos["prev_net"] = pos.groupby("date").net_pnl.shift(1)
    pos["prev_exit"] = pos.groupby("date").exit_time.shift(1)
    pos["reentry_gap_min"] = (pos.entry_time - pos.prev_exit).dt.total_seconds() / 60
    return pos


def _position(sym, legs):
    buys = [l for l in legs if l.side == "BUY"]
    sells = [l for l in legs if l.side == "SELL"]
    bq = sum(l.qty for l in buys); bto = sum(l.qty * l.price for l in buys)
    sq = sum(l.qty for l in sells); sto = sum(l.qty * l.price for l in sells)
    # averaging down = any add bought below the running average entry price
    avg_down, run_q, run_v = False, 0, 0.0
    for l in buys:
        if run_q and l.price < run_v / run_q:
            avg_down = True
        run_q += l.qty; run_v += l.qty * l.price
    charges = position_charges(len(legs), bto, sto)
    expiry = dt.datetime.strptime(sym.split()[1], "%d%b%y").date()
    entry = buys[0].timestamp
    return dict(symbol=sym, entry_time=entry, exit_time=sells[-1].timestamp,
                dte=(expiry - entry.date()).days, n_orders=len(legs),
                first_qty=buys[0].qty, first_price=buys[0].price,
                initial_value=buys[0].qty * buys[0].price,
                buy_qty=bq, avg_buy=bto / bq, avg_sell=sto / sq,
                buy_turnover=bto, sell_turnover=sto, averaged_down=avg_down,
                gross_pnl=sto - bto, charges=charges, net_pnl=sto - bto - charges,
                ret_pct=(sto - bto) / bto,
                net_ret=(sto - bto - charges) / bto,
                hold_min=(sells[-1].timestamp - entry).total_seconds() / 60)


def perm_p(slice_vals, rest_vals, rng, greater=False):
    """One-sided permutation test on the difference in means.
    Default: is the slice WORSE (lower) than the rest? greater=True flips it."""
    a, b = np.asarray(slice_vals, float), np.asarray(rest_vals, float)
    obs = a.mean() - b.mean()
    pool, n = np.concatenate([a, b]), len(a)
    perms = rng.permuted(np.tile(pool, (N_PERM, 1)), axis=1)
    d = perms[:, :n].mean(axis=1) - perms[:, n:].mean(axis=1)
    hits = (d >= obs).sum() if greater else (d <= obs).sum()
    return float((hits + 1) / (N_PERM + 1))


_CTX = {"min_cost": MIN_COST_FLOOR}


def _slice_habit(hid, pos, mask, rng, label):
    s, r = pos[mask], pos[~mask]
    out = dict(id=hid, label=label, kind="slice", n=int(len(s)), trade_ids=list(s.pos_id))
    if len(s) < MIN_SLICE or len(r) < MIN_SLICE:
        return {**out, "qualified": False, "reason": f"slice n={len(s)} < {MIN_SLICE}"}
    # significance on SIZE-NORMALISED return (v1 used rupee P&L and missed Neha's
    # expiry habit: her 0DTE trades were small, so big normal trades drowned the signal)
    p = perm_p(s.net_ret, r.net_ret, rng)
    cost = -s.net_pnl.sum()          # counterfactual: skip these trades (incl. charges)
    out.update(p_value=round(p, 4), cost=round(cost, 0),
               evidence=dict(slice_trades=int(len(s)), slice_net=round(s.net_pnl.sum(), 0),
                             slice_avg=round(s.net_pnl.mean(), 0),
                             slice_win_rate=round((s.net_pnl > 0).mean(), 3),
                             slice_avg_return=round(s.net_ret.mean(), 3),
                             rest_avg_return=round(r.net_ret.mean(), 3),
                             rest_trades=int(len(r)), rest_avg=round(r.net_pnl.mean(), 0),
                             rest_win_rate=round((r.net_pnl > 0).mean(), 3)),
               counterfactual="Net P&L if these trades had not been taken")
    return _gate(out, p, cost)


def _gate(out, p, cost):
    if p >= P_MAX:
        return {**out, "qualified": False, "reason": f"p={p:.3f} >= {P_MAX} (could be noise)"}
    if cost is not None and cost < _CTX["min_cost"]:
        return {**out, "qualified": False,
                "reason": f"cost Rs{cost:.0f} < materiality bar Rs{_CTX['min_cost']:.0f}"}
    return {**out, "qualified": True,
            "confidence": "strong" if p < 0.005 else "moderate"}


def d_size_up_after_loss(pos, rng):
    after = pos.prev_net < 0
    s, base = pos[after], pos[~after]
    out = dict(id="size_up_after_loss", label="Sizes up on the trade after a loss",
               kind="costed", n=int(len(s)), trade_ids=list(s.pos_id))
    if len(s) < MIN_SLICE or len(base) < MIN_SLICE:
        return {**out, "qualified": False, "reason": "not enough after-loss trades"}
    base_med = base.initial_value.median()
    ratio = s.initial_value.median() / base_med
    p = perm_p(s.initial_value, base.initial_value, rng, greater=True)
    # counterfactual: resize every oversized after-loss trade down to the usual size
    k = np.minimum(1.0, base_med / s.initial_value)
    cf = s.gross_pnl * k - (BROKERAGE_PER_ORDER * s.n_orders
                            + SELL_SIDE_LEVY * s.sell_turnover * k
                            + TURNOVER_LEVY * (s.buy_turnover + s.sell_turnover) * k)
    cost = (cf - s.net_pnl).sum()
    out.update(p_value=round(p, 4), cost=round(cost, 0),
               evidence=dict(after_loss_trades=int(len(s)),
                             median_entry_size_after_loss=round(s.initial_value.median(), 0),
                             median_entry_size_otherwise=round(base_med, 0),
                             size_ratio=round(ratio, 2),
                             after_loss_net=round(s.net_pnl.sum(), 0),
                             after_loss_win_rate=round((s.net_pnl > 0).mean(), 3),
                             other_win_rate=round((base.net_pnl > 0).mean(), 3)),
               counterfactual="Net P&L if after-loss trades had used your usual entry size")
    if ratio < SIZE_RATIO:
        return {**out, "qualified": False, "reason": f"size ratio {ratio:.2f} < {SIZE_RATIO}"}
    return _gate(out, p, cost)


def d_averaging_down(pos, rng):
    s, r = pos[pos.averaged_down], pos[~pos.averaged_down]
    out = dict(id="averaging_down", label="Adds to losing positions (averaging down)",
               kind="costed", n=int(len(s)), trade_ids=list(s.pos_id))
    if len(s) < MIN_AVG_DOWN or len(r) < MIN_SLICE:
        return {**out, "qualified": False, "reason": f"only {len(s)} averaged-down positions"}
    # counterfactual: keep only the first entry, same exit price
    cf_gross = (s.avg_sell - s.first_price) * s.first_qty
    cf_buy, cf_sell = s.first_qty * s.first_price, s.first_qty * s.avg_sell
    cf = cf_gross - (2 * BROKERAGE_PER_ORDER + SELL_SIDE_LEVY * cf_sell
                     + TURNOVER_LEVY * (cf_buy + cf_sell))
    cost = (cf - s.net_pnl).sum()
    # the added lots' return, compared with the trader's normal per-trade return
    add_qty = s.buy_qty - s.first_qty
    add_px = (s.avg_buy * s.buy_qty - s.first_price * s.first_qty) / add_qty
    add_ret = (s.avg_sell - add_px) / add_px
    p = perm_p(add_ret, r.ret_pct, rng)
    out.update(p_value=round(p, 4), cost=round(cost, 0),
               evidence=dict(averaged_positions=int(len(s)),
                             added_leg_loss_rate=round((add_ret < 0).mean(), 3),
                             added_leg_avg_return=round(add_ret.mean(), 3),
                             other_trades_avg_return=round(r.ret_pct.mean(), 3),
                             net_on_these_positions=round(s.net_pnl.sum(), 0)),
               counterfactual="Net P&L if you had kept only your first entry on these positions")
    return _gate(out, p, cost)


def d_disposition(pos, rng):
    w, l = pos[pos.net_pnl > 0], pos[pos.net_pnl <= 0]
    out = dict(id="holds_losers_longer", label="Holds losing trades much longer than winners",
               kind="flag_only", n=int(len(l)), trade_ids=list(l.pos_id), cost=None,
               counterfactual=None,
               cost_note="Not costed: proving the cost needs price data after exit, "
                         "which is outside order history.")
    if len(w) < MIN_SLICE or len(l) < MIN_SLICE:
        return {**out, "qualified": False, "reason": "not enough winners/losers"}
    ratio = l.hold_min.median() / w.hold_min.median()
    p = perm_p(l.hold_min, w.hold_min, rng, greater=True)
    out.update(p_value=round(p, 4),
               evidence=dict(median_hold_losers_min=round(l.hold_min.median(), 1),
                             median_hold_winners_min=round(w.hold_min.median(), 1),
                             hold_ratio=round(ratio, 2)))
    if ratio < HOLD_RATIO:
        return {**out, "qualified": False, "reason": f"hold ratio {ratio:.2f} < {HOLD_RATIO}"}
    return _gate(out, p, None)


SLICE_DETECTORS = {
    "fast_reentry_after_loss": ("Jumps back in within minutes of a loss",
                                lambda p: (p.prev_net < 0) & (p.reentry_gap_min <= FAST_REENTRY_MIN)),
    "expiry_day_trading": ("Loses on expiry-day (0DTE) trades",
                           lambda p: p.dte == 0),
    "late_session_trading": ("Late-session trades (after 2:30 PM) lose money",
                             lambda p: p.entry_time.dt.time >= LATE_SESSION),
    "overtrading": (f"Trades from the {OVERTRADE_FROM}th of the day onwards lose money",
                    lambda p: p.day_index >= OVERTRADE_FROM),
}


def analyze(orders: pd.DataFrame, seed=0, review_month=None) -> dict:
    rng = np.random.default_rng(seed)
    pos = normalize(orders)
    summary = dict(closed_trades=int(len(pos)), trading_days=int(pos.date.nunique()),
                   net_pnl=round(pos.net_pnl.sum(), 0), gross_pnl=round(pos.gross_pnl.sum(), 0),
                   charges=round(pos.charges.sum(), 0),
                   win_rate=round((pos.net_pnl > 0).mean(), 3),
                   ignored_orders=int((orders.status != "COMPLETE").sum()),
                   window=f"{pos.date.min()} to {pos.date.max()}")
    if review_month:                                   # e.g. "2026-08"
        m = pos[pd.to_datetime(pos.date).dt.strftime("%Y-%m") == review_month]
        summary["review_month"] = dict(month=review_month, closed_trades=int(len(m)),
                                       trading_days=int(m.date.nunique()),
                                       net_pnl=round(m.net_pnl.sum(), 0),
                                       charges=round(m.charges.sum(), 0),
                                       win_rate=round((m.net_pnl > 0).mean(), 3))
    if len(pos) < MIN_TRADES:
        return dict(summary=summary, insufficient_data=True,
                    message=f"{len(pos)} closed trades; need at least {MIN_TRADES} "
                            f"before calling anything a habit.",
                    habits=[], also_noticed=[], watching=[], rejected=[], positions=pos)

    _CTX["min_cost"] = max(MIN_COST_FLOOR, MIN_COST_SHARE * pos.buy_turnover.sum())
    summary["materiality_bar"] = round(_CTX["min_cost"], 0)
    cands = [d_size_up_after_loss(pos, rng), d_averaging_down(pos, rng)]
    for hid, (label, fn) in SLICE_DETECTORS.items():
        cands.append(_slice_habit(hid, pos, fn(pos), rng, label))
    flag = d_disposition(pos, rng)

    qualified = [c for c in cands if c["qualified"]]
    rejected = [c for c in cands if not c["qualified"]]
    mech = [c for c in qualified if c["kind"] == "costed"]      # distinct behaviours: never merged
    slices = [c for c in qualified if c["kind"] == "slice"]     # time/day slices: test for confounding

    def survives(c, excluded_ids):
        sub = pos[~pos.pos_id.isin(excluded_ids)].reset_index(drop=True)
        return _slice_habit(c["id"], sub, SLICE_DETECTORS[c["id"]][1](sub), rng, c["label"])["qualified"]

    # (a) a slice must still hold once trades explained by a behaviour habit are removed
    mech_ids = set().union(*[set(m["trade_ids"]) for m in mech]) if mech else set()
    tmp = []
    for c in slices:
        if mech_ids and not survives(c, mech_ids):
            rejected.append({**c, "qualified": False,
                             "reason": f"explained by {[m['id'] for m in mech]} "
                                       f"(no longer holds without those trades)"})
        else:
            tmp.append(c)
    # (b) between slices: if A holds without B's trades but B doesn't hold without A's,
    #     A is the real pattern and B was riding on it
    drop = {}
    for b_ in tmp:
        for a_ in tmp:
            if a_ is b_:
                continue
            b_alone = survives(b_, set(a_["trade_ids"]))
            a_alone = survives(a_, set(b_["trade_ids"]))
            if (not b_alone and a_alone) or (not b_alone and not a_alone and a_["n"] > b_["n"]):
                drop[b_["id"]] = a_["id"]
                break
    for c in tmp:
        if c["id"] in drop:
            rejected.append({**c, "qualified": False,
                             "reason": f"explained by {drop[c['id']]} (confounded)"})
    kept = sorted(mech + [c for c in tmp if c["id"] not in drop], key=lambda c: -c["cost"])
    # 'watching': material, suggestive, but not proven -> say so, don't call it a habit
    kept_ids = set().union(*[set(k["trade_ids"]) for k in kept]) if kept else set()
    watching = []
    for c in rejected:
        p, cost = c.get("p_value"), c.get("cost")
        if (p is not None and P_MAX <= p < P_WATCH and cost is not None
                and cost >= _CTX["min_cost"] and "explained by" not in c.get("reason", "")
                and len(set(c["trade_ids"]) & kept_ids) < 0.8 * max(1, len(c["trade_ids"]))):
            watching.append({**c, "status": "watching"})
    watching = sorted(watching, key=lambda c: c["p_value"])[:2]
    habits = kept[:3]
    for i, h in enumerate(habits, 1):
        h["rank"] = i
    also = [flag] if flag["qualified"] else []
    if not flag["qualified"]:
        rejected.append(flag)
    return dict(summary=summary, insufficient_data=False, habits=habits,
                also_noticed=also, watching=watching, rejected=rejected, positions=pos,
                note="Habit costs overlap and must never be added together.")
