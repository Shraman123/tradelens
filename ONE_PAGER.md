# TradeLens — a post-trade review that names the habit, not the metric

**Problem 03 · Post-trade review** · Live prototype: https://app-azure-zeta-42.vercel.app

## The problem

My user is an intraday index-options buyer on Nubra. He trades most days and reviews almost never — not a data problem, since his order history already sits inside the app, but a diagnosis problem: after a losing month he knows the number, not which behaviour produced it.

SEBI's August 2026 studies: 87.7% of individual F&O traders lost money in FY26, and about 90% of those who lost two years running and kept trading lost again the next year. Losing is not the anomaly. Not changing is.

So TradeLens answers not "how did I trade last month" but "what am I repeatedly doing that costs me money".

## Why Nubra should solve it

Nubra already holds the order book — no upload, no journalling discipline, no delay; the review can arrive the morning after a bad week, not whenever the trader gets round to it.

A broker earns on volume, and this product will often tell a trader to trade less. I think it is right to build: a churned trader generates no volume, and diagnosing one costly habit protects the account that produces future revenue.

## The solution space

Four rejected shapes: a dashboard shows metrics and leaves diagnosis to the user; a journal demands discipline he has already shown he lacks; a chatbot answers questions he does not know to ask; real-time nudges need infrastructure and trust this product has not yet earned.

What I built: a monthly review naming at most three habits, ranked by cost, each proved with the trader's own trades, ending in one process rule he commits to. Next month's review opens with how often he broke it. The review is the artifact; the loop is the product.

## How it works

Code computes every number; the model only explains the JSON it produces and may not state a figure not in it. A habit clears three gates: enough trades, statistical significance against the trader's own other trades, and cost above a materiality bar tied to his turnover. Every cost is a counterfactual, not a raw loss. Output has four states: confirmed habit, watching, nothing found, not enough data. Advice is process only — size, timing, trade count, stops — never instruments or direction.

## What testing changed

I wrote the evals before the app, using synthetic traders with habits planted at known strength, plus a control and a thin-data trader. One month of history recovered the planted habits in only 13 and 20 of 30 runs; 60 days recovered them in 28 and 29 of 30, with zero false alarms on the control. Loosening the significance threshold bought recall only by inventing habits — so the window became 60 days, and unproven-but-material patterns are shown as "watching," not overstated.

## What I'd validate first

This rests on assumptions untested with a real trader. Three matter most.

**Desirability:** a losing trader wants diagnosis, not avoidance. Test: do reviews open after losing months, or only winning ones? If opens track wins, the review needs pushing, not waiting to be opened.

**Behaviour change:** naming a habit and a commitment reduces it next month. Test: recurrence, committed vs not. If it's the same either way, the loop does not work.

**Trust:** a trader accepts a verdict from a broker who earns on his volume. Test: commit rates with and without a plain disclosure of that incentive. A gap means real distrust, and a different messenger.

## How I'd measure success

The metric is habit recurrence next month, not opens or session time. The counter-metric is churn — if diagnosed traders leave rather than improve, the thesis is wrong. A trader can also fix the named habit and still have a worse month; one habit is rarely the only cause. Success is measured on the habit, not the P&L.

## Scope

**In:** five screens, seven detectors, four output states, synthetic order history for four traders, and an LLM narration layer with automated evals for number tracing, advice, state fidelity and stability.

**Out:** live market data, real user data, price behaviour after exit, real-time nudges, instrument or direction advice, and price prediction.
