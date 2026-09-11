# TradeLens — Habit Library & Eval Personas

**User:** an intraday index-options buyer on Nubra (NIFTY weekly options).
**Input:** raw order history only (no market data). Cancelled/rejected orders are ignored; fills are paired flat-to-flat per symbol into closed trades.
**Design rule:** code computes every number; the LLM only explains the JSON the code outputs.

## Global gates (a pattern is a *habit* only if all three pass)

| Gate | Rule | Why |
|---|---|---|
| Enough data | ≥ 20 closed trades in the window; ≥ 8 trades in the pattern (≥ 5 for averaging down) | Below this, a pattern is an anecdote |
| Not noise | One-sided permutation test vs the trader's *other* trades, p < 0.01, on size-normalised return | ~5 tests per review, so 0.01 keeps the family-wise false-alarm budget near 5% |
| Material | Counterfactual cost ≥ max(₹1,000, 1% of premium bought in the window) | Don't interrupt someone over rounding error |

**Evidence window:** 60 days (this month + last), review framed monthly. Chosen from the power analysis in the eval report.

**Confounding:** behaviour habits (sizing, averaging) are never merged with each other. A time/day pattern must still hold after removing trades explained by a behaviour habit. Between two time/day patterns, keep the one that survives removing the other's trades.

**Four output states:** confirmed habit (max 3, ranked by ₹ cost) · *watching* (0.01 ≤ p < 0.10 and material; never phrased as a habit) · nothing found · not enough data.

**Costs overlap and are never summed.** Every cost is over the evidence window, and the window is always stated.

## Detectors

| ID | What the user hears | Defined from order history | Counterfactual cost | Process rule (template) |
|---|---|---|---|---|
| `size_up_after_loss` | "You size up on the trade right after a loss." | Entry size of the first fill, for trades after a same-day losing trade vs all others. Median ratio ≥ 1.3 | Net P&L if oversized after-loss trades had used your usual entry size | "After a loss, your next entry is your usual size." |
| `averaging_down` | "You add to trades that are going against you." | Any buy while the position is below its running average entry | Net P&L if you'd kept only your first entry (same exit) | "Decide full size before entry. No adds below your entry price." |
| `expiry_day_trading` | "Your expiry-day trades are where the money goes." | Trades in a contract on its expiry date (0DTE) | Net P&L if those trades weren't taken | "Set a hard cap on expiry-day trades before the open." |
| `fast_reentry_after_loss` | "You jump back in within minutes of a loss." | Entry ≤ 5 min after a same-day losing exit | Net P&L if those trades weren't taken | "10-minute cooldown after any losing exit." |
| `late_session_trading` | "Your late-session trades lose money." | Entry at or after 2:30 PM | Net P&L if those trades weren't taken | "No new entries after 2:30 PM." |
| `overtrading` | "Trades after your 6th of the day lose money." | 7th trade of the day onwards | Net P&L if those trades weren't taken | "Stop after trade #6." |
| `holds_losers_longer` *(flag only)* | "You hold losers much longer than winners." | Median hold of losers ÷ winners ≥ 1.5 | **Not costed.** Proving the cost needs prices after exit, which order history doesn't contain | "Write your exit-on-loss level before you enter." |

Rules are about *process*: size, timing, count, and stops. The product never suggests an instrument, strike or direction.

## Eval personas (synthetic, planted ground truth)

| Persona | What's planted | Correct output | Demo month (seed 1, Jul–Aug 2026) |
|---|---|---|---|
| **Arjun**: revenge sizer | ~2× size after a loss, with a worse edge on those trades; averages down on ~20% of trades, and added lots average −12% | Both habits, nothing invented | Size-up confirmed (strong). Averaging down shown as *watching* (p = 0.045), one of the 2–3 in 30 two-month windows where it isn't confirmed yet |
| **Neha**: expiry-day | Expiry days: 9–13 cheap 0DTE trades at about −28% average return; other days near break-even | Expiry-day trading as #1, nothing invented | Confirmed (strong); overtrading correctly rejected as confounded |
| **Vikram**: control | Nothing. Slightly negative edge plus charges; random sizing, timing and re-entry | No habits, even though he's losing | No habits |
| **Sara**: thin data | 9 trades/month, with a visible size-up-after-loss pattern | "Not enough data", no habits | 18 trades in 60 days → not enough data |

*All numbers are synthetic. Lot size (75), Tuesday expiry, ₹20/order brokerage and the simplified levies are assumptions set in `generate_personas.py`, not Nubra's actual schedule.*
