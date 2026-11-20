# Opportunity Score — Calculation Methodology

_Last updated for the Wednesday review with Enrique._

The opportunity score is a 0–10 number that tells a rep **"is this property worth
walking the curb on this quarter?"** It is the same number that drives pin color
on the map and the warm/cold band on each card.

## What it reads

Six on-the-ground signals, weighted to match what a field rep would actually
notice first:

| Signal | Weight | What it means |
| --- | --- | --- |
| `ppsfFactor` — price/sqft vs **local neighborhood** average | 25% | Below local avg = upside room. Compared to other homes in the **same zip**, not the whole segment. (Enrique's correction.) |
| `permitGap` — trade categories never permitted | 25% | Kitchen / HVAC / roof / addition — the more gaps, the more scope. |
| `cashAvailability` — mortgage rate window of purchase date | 20% | Buyers 2018–2021 are rate-locked (less cash). Long-time owners or post-2022 buyers have equity / market-rate mindset. |
| `lotFactor` — lot size vs neighborhood median | 15% | Bigger lot = pool / hardscape / addition scope. |
| `ageNorm` — building age | 10% | Older systems = more replacement scope. |
| `channel` — LinkedIn reachability | 5% | Tiebreaker — can you land a message? |

## Formula

```
score = 10 × (
    0.25 · ppsfFactor
  + 0.25 · permitGap
  + 0.20 · cashAvailability
  + 0.15 · lotFactor
  + 0.10 · ageNorm
  + 0.05 · channel
)
```

All factors are normalized 0..1 before weighting.

## Heat map — separate but related

The heat map uses a tighter version of the same signals so the visualization
**immediately reads as "opportunity," not "expensive."**

```
heatWeight = 0.6 · ppsfFactor   (vs LOCAL neighborhood)
           + 0.4 · permitFactor (1 - permitCount/4)
```

- HOT (red/orange) = below-local-average $/sqft AND under-permitted = under-touched
- COLD (blue/green) = premium-priced OR well-permitted = owner has already invested

This is the inversion Enrique called for: a $5M home that just had a full
permit history filed is **cold** on the heat map, even though it's expensive.
A $1.2M home with zero permits in 25 years is **hot**.

## Neighborhood baseline

`MEDIAN_PPSF` (segment-wide) is kept for back-compat in a couple of legacy
displays. All scoring uses `neighborhoodPpsf(record)` which buckets by:

- Villanova: by zip (`19085`)
- Shore: by zip (`08226`, `08402`, `08247`, …)
- CRM: not scored on price

## Status bands

| Score | Band | Color |
| --- | --- | --- |
| 7.5+ | Prime | green (#16a34a) |
| 5.5–7.4 | Strong | amber (#eab308) |
| 3.5–5.4 | Watch | orange (#f97316) |
| <3.5 | Low | grey/red (#dc2626) |

## ICP (contact-level) is separate

The opportunity score is property-level. ICP fit is contact-level — channel
completeness, prior client relationship, opt-in status. See
`src/lib/portal-data.ts` → `icpScore()`.
