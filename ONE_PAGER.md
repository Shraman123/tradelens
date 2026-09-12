# TradeLens — a post-trade review that names the habit, not the metric

**Problem 03 · Post-trade review** · Live prototype: https://app-azure-zeta-42.vercel.app

## The problem

My user is an intraday index-options buyer on Nubra. He trades most days, checks his P&L constantly, and reviews it almost never. This is not a data problem: his complete order history already sits inside the app. It is a diagnosis problem. After a losing month he knows the number, but not which of his own behaviours produced it.

SEBI's August 2026 studies describe exactly this population. In FY26, 87.7% of individual traders in equity derivatives lost money, about 92% of their aggregate losses came from options, and roughly 59% of index options turnover sat in same-day-expiry contracts. The finding that decided the product for me is this: about 90% of traders who lost money two years running and kept trading lost again the following year. Losing is not the anomaly. Not changing is.

So the question TradeLens answers is not "how did I trade last month" but "what am I repeatedly doing that costs me money".

## Why Nubra should solve it

Nubra already holds the order book. That removes the upload, the journalling discipline, and the delay: the review can arrive the morning after a bad week rather than whenever the trader gets round to it. No third-party journal clears that friction, which is why most traders never review anything.

There is an uncomfortable part worth naming. A broker earns on volume, and this product will often tell a trader to trade less. I still think it is right to build. The 90% figure above describes a trader on a path to quitting, and a churned trader generates no volume at all. Diagnosing one costly habit protects the account that produces future revenue. It also fits how Nubra already positions itself: a precision platform for serious traders, not a beginner's app.

## The solution space

I considered and rejected four shapes. A P&L dashboard shows metrics and leaves the diagnosis to the user. A journal demands discipline he has already shown he lacks. A chatbot answers questions he does not know to ask. Real-time nudges are the right long-term direction but need live infrastructure and a level of trust this product has not yet earned.

What I built is a monthly review that names at most three habits, ranks them by what each one cost, proves each with the trader's own trades, and ends with one process rule he commits to. Next month's review opens with how often he broke it. The review is the artifact; the loop is the product.

## How it works

Code computes every number. The language model only explains the JSON the code produces, and may not state a figure that is not in it. A habit is reported only if it clears three gates: enough trades, statistical significance against that trader's own other trades, and a cost above a materiality bar set relative to his turnover. Every cost is a counterfactual, such as net P&L if after-loss trades had used his usual size. Output has four states: confirmed habit, watching, nothing found, and not enough data. Advice covers process only — size, timing, trade count, stops — never instruments or direction.

## What testing changed

I wrote the evals before the app, using synthetic traders with habits planted at known strength, including a control with no habit and a thin-data trader. On held-out traders, one month of history recovered the planted habits in only 13 and 20 of 30 months. Sixty days recovered them in 28 and 29 of 30, with zero false alarms on the control in both. Loosening the significance threshold bought recall only by inventing habits.

So the evidence window became 60 days, and material-but-unproven patterns are shown as "watching" rather than hidden or overstated. Testing changed the product, not just checked it.

One failure is worth recording: automated checks caught a fabricated number, but a duplicated phrase in the narration was caught only by reading the live app. Both kinds of checking were necessary.

## Scope

**In:** five screens, seven detectors, four output states, synthetic order history for four traders, and an LLM narration layer with automated evals for number tracing, prohibited advice, state fidelity and rerun stability.

**Out:** live market data, real user data, price behaviour after exit (which is why one detected pattern is shown with no cost attached), real-time nudges, instrument or direction advice, and any prediction of prices.
