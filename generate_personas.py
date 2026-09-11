"""
Synthetic order-history generator for TradeLens evals.

Each persona is a one-month order book (August 2026) for an intraday NIFTY
options buyer. Some personas have habits deliberately PLANTED so the detectors
have ground truth to recover. The control persona has none.

ALL NUMBERS ARE SYNTHETIC. Lot size, expiry weekday and the charges model are
simplifying assumptions set in the CONFIG block, not Nubra's actual schedule.
"""
import datetime as dt
import numpy as np
import pandas as pd

# ---------------- CONFIG (assumptions) ----------------
LOT_SIZE = 75                 # assumed NIFTY lot size; update to current NSE value
EXPIRY_WEEKDAY = 1            # Tuesday (Mon=0). Assumed weekly expiry day
BROKERAGE_PER_ORDER = 20.0    # assumed flat brokerage per executed order (Rs)
SELL_SIDE_LEVY = 0.001        # simplified STT-like levy on sell premium turnover
TURNOVER_LEVY = 0.0005        # simplified exchange + GST + stamp on all turnover
MONTH_DAYS = list(pd.bdate_range("2026-08-03", "2026-08-31").date)  # 21 weekdays
SESSION_OPEN = dt.time(9, 15)
LAST_ENTRY = dt.time(15, 10)
SQUARE_OFF = dt.time(15, 25)
# ------------------------------------------------------

# ---------------- PLANTED EFFECT SIZES (ground truth knobs) ----------------
EXPIRY_DECAY_PROB = 0.72      # Neha: share of 0DTE trades that decay (-45..-90%);
                              # 0.72 -> ~-28% average return per 0DTE trade
AVG_DOWN_ADD_DRIFT = -0.12    # Arjun: average return of the added (averaged) lots
REVENGE_TILT = -0.06          # Arjun: extra drift on trades taken after a loss
# ----------------------------------------------------------------------------


def position_charges(n_orders, buy_turnover, sell_turnover):
    return (BROKERAGE_PER_ORDER * n_orders
            + SELL_SIDE_LEVY * sell_turnover
            + TURNOVER_LEVY * (buy_turnover + sell_turnover))


def tick(x):
    """Round a premium to the 0.05 tick, floor at 0.05."""
    return max(0.05, round(x * 20) / 20)


def expiry_for(day, zero_dte):
    if zero_dte:
        return day
    ahead = (EXPIRY_WEEKDAY - day.weekday()) % 7
    if ahead == 0:
        ahead = 7              # on expiry day, a non-0DTE trade uses next week
    return day + dt.timedelta(days=ahead)


class Book:
    """Accumulates raw order rows the way a broker's order history would show them."""

    def __init__(self, code, seed):
        self.rows, self.n, self.code, self.seed = [], 0, code, seed
        self.rng = np.random.default_rng(seed)

    def _order(self, ts, symbol, side, qty, price, status="COMPLETE"):
        self.n += 1
        self.rows.append(dict(order_id=f"{self.code}{self.seed:03d}-{self.n:05d}",
                              timestamp=ts, symbol=symbol, side=side, qty=int(qty),
                              price=tick(price), status=status))

    def add_position(self, day, entry_dt, lots, p0, exit_px, hold_min,
                     zero_dte=False, add=None):
        """add = (minutes_after_entry, add_price, add_lots) for averaging down."""
        rng = self.rng
        exp = expiry_for(day, zero_dte)
        strike = 24000 + 50 * int(rng.integers(0, 21))
        symbol = f"NIFTY {exp.strftime('%d%b%y').upper()} {strike} {rng.choice(['CE', 'PE'])}"
        qty = lots * LOT_SIZE
        # ~6% of the time the trader fires an order that gets cancelled/rejected first
        if rng.random() < 0.06:
            self._order(entry_dt - dt.timedelta(seconds=40), symbol, "BUY", qty,
                        p0 * 0.98, rng.choice(["CANCELLED", "REJECTED"]))
        self._order(entry_dt, symbol, "BUY", qty, p0)
        buy_qty, buy_to = qty, qty * tick(p0)
        n_orders = 1
        if add:
            mins, add_px, add_lots = add
            aq = add_lots * LOT_SIZE
            self._order(entry_dt + dt.timedelta(minutes=mins), symbol, "BUY", aq, add_px)
            buy_qty += aq
            buy_to += aq * tick(add_px)
            n_orders += 1
        exit_dt = entry_dt + dt.timedelta(minutes=hold_min)
        self._order(exit_dt, symbol, "SELL", buy_qty, exit_px)
        n_orders += 1
        sell_to = buy_qty * tick(exit_px)
        net = sell_to - buy_to - position_charges(n_orders, buy_to, sell_to)
        return exit_dt, net

    def frame(self):
        return pd.DataFrame(self.rows)


def _day_start(day, rng):
    return dt.datetime.combine(day, SESSION_OPEN) + dt.timedelta(minutes=int(rng.integers(2, 25)))


def _fits(entry_dt, hold):
    end = entry_dt + dt.timedelta(minutes=hold)
    return entry_dt.time() <= LAST_ENTRY and end.time() <= SQUARE_OFF


def _base_return(rng, mu, sigma):
    return float(np.clip(rng.normal(mu, sigma), -0.9, 2.0))


# ---------------- PERSONAS ----------------

def persona_control(seed):
    """Vikram - CONTROL. Slightly negative edge, charges drag, NO planted habit.
    Size varies randomly (not with outcomes); trades 0DTE on half of expiry-day
    trades with the SAME edge; timing and re-entry gaps are random."""
    b = Book("VK", seed); rng = b.rng
    for day in MONTH_DAYS:
        t = _day_start(day, rng)
        for _ in range(int(rng.integers(3, 9))):
            hold = int(rng.integers(4, 76))
            if not _fits(t, hold):
                break
            p0 = rng.uniform(60, 220)
            exit_px = p0 * (1 + _base_return(rng, -0.015, 0.2))
            zero = day.weekday() == EXPIRY_WEEKDAY and rng.random() < 0.5
            lots = int(rng.choice([1, 1, 2]))
            end, _ = b.add_position(day, t, lots, p0, exit_px, hold, zero_dte=zero)
            t = end + dt.timedelta(minutes=int(rng.integers(2, 41)))
    return b.frame()


def persona_revenge(seed):
    """Arjun - PLANTED: (1) sizes up ~2x on the trade after a loss, and those trades
    carry a worse edge (tilt); (2) averages down on ~20% of positions, and the added
    lots tend to keep losing. His underlying entries are slightly profitable."""
    b = Book("AR", seed); rng = b.rng
    for day in MONTH_DAYS:
        t = _day_start(day, rng)
        prev_net = None
        for _ in range(int(rng.integers(3, 7))):
            after_loss = prev_net is not None and prev_net < 0
            lots = 2 if (after_loss and rng.random() < 0.85) else 1
            mu = REVENGE_TILT if after_loss else 0.02
            p0 = rng.uniform(40, 150)
            if rng.random() < 0.20:                       # averaging-down path
                add_after = int(rng.integers(5, 26))
                p1 = p0 * (1 - rng.uniform(0.08, 0.20))
                hold = add_after + int(rng.integers(10, 41))
                exit_px = p1 * (1 + float(np.clip(rng.normal(AVG_DOWN_ADD_DRIFT + mu, 0.15), -0.9, 1.5)))
                add = (add_after, p1, lots)
            else:
                hold = int(rng.integers(4, 61))
                exit_px = p0 * (1 + _base_return(rng, mu, 0.2))
                add = None
            if not _fits(t, hold):
                break
            end, prev_net = b.add_position(day, t, lots, p0, exit_px, hold, add=add)
            t = end + dt.timedelta(minutes=int(rng.integers(1, 31)))
    return b.frame()


def persona_expiry(seed):
    """Neha - PLANTED: on expiry day she switches to many cheap 0DTE options with a
    strongly negative, lottery-like payoff. Other days are near break-even."""
    b = Book("NH", seed); rng = b.rng
    for day in MONTH_DAYS:
        t = _day_start(day, rng)
        is_exp = day.weekday() == EXPIRY_WEEKDAY
        for _ in range(int(rng.integers(9, 14)) if is_exp else int(rng.integers(2, 6))):
            if is_exp:
                hold = int(rng.integers(3, 26))
                p0 = rng.uniform(5, 35)
                if rng.random() < EXPIRY_DECAY_PROB:
                    r = rng.uniform(-0.9, -0.45)           # decay
                else:
                    r = rng.uniform(0.1, 1.4)              # occasional pop
                lots = int(rng.integers(2, 5))
                gap = int(rng.integers(2, 16))
            else:
                hold = int(rng.integers(5, 76))
                p0 = rng.uniform(60, 220)
                r = _base_return(rng, -0.01, 0.2)
                lots = 1
                gap = int(rng.integers(10, 61))
            if not _fits(t, hold):
                break
            end, _ = b.add_position(day, t, lots, p0, p0 * (1 + r), hold, zero_dte=is_exp)
            t = end + dt.timedelta(minutes=gap)
    return b.frame()


def persona_thin(seed):
    """Sara - THIN DATA: only 9 trades in the month. She even shows a visible
    size-up-after-loss pattern, which the product must NOT call a habit."""
    b = Book("SR", seed); rng = b.rng
    days = sorted(rng.choice(len(MONTH_DAYS), size=4, replace=False))
    per_day = [3, 2, 2, 2]
    for di, k in zip(days, per_day):
        day = MONTH_DAYS[di]
        t = _day_start(day, rng)
        prev_net = None
        for _ in range(k):
            lots = 2 if (prev_net is not None and prev_net < 0) else 1
            p0 = rng.uniform(60, 220)
            hold = int(rng.integers(5, 60))
            end, prev_net = b.add_position(day, t, lots, p0,
                                           p0 * (1 + _base_return(rng, -0.02, 0.2)), hold)
            t = end + dt.timedelta(minutes=int(rng.integers(5, 40)))
    return b.frame()


PREV_MONTH_DAYS = list(pd.bdate_range("2026-07-01", "2026-07-31").date)  # 23 weekdays


def multi_month(fn, seed, n_months=1):
    """n=1: August 2026 only. n=2: July + August 2026 (60-day evidence window)."""
    global MONTH_DAYS
    aug, frames = MONTH_DAYS, []
    for i, days in enumerate([aug, PREV_MONTH_DAYS][:n_months]):
        MONTH_DAYS = days
        frames.append(fn(seed + 1000 * i))
    MONTH_DAYS = aug
    return pd.concat(frames[::-1], ignore_index=True)


PERSONAS = {
    "arjun_revenge_sizer": dict(fn=persona_revenge,
                                planted=["size_up_after_loss", "averaging_down"],
                                expect="both planted habits in top 3 (ranked by computed cost), nothing unplanted"),
    "neha_expiry_day": dict(fn=persona_expiry, planted=["expiry_day_trading"],
                            expect="expiry_day_trading ranked #1, nothing unplanted"),
    "vikram_control": dict(fn=persona_control, planted=[],
                           expect="zero habits (losing, but no repeated pattern)"),
    "sara_thin_data": dict(fn=persona_thin, planted=[],
                           expect="insufficient-data response, zero habits"),
}

if __name__ == "__main__":
    for name, p in PERSONAS.items():
        df = p["fn"](1)
        df.to_csv(f"data/{name}_orders.csv", index=False)
        print(name, len(df), "orders")
