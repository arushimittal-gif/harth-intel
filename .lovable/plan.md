## Goal
Ship the most demo-impactful features from your list for Wednesday. Skipping HubSpot webhook, record-and-replay, sound effects (per your call). I'll group by what already exists vs. what's new so you can see what changes.

## Already in the app (no work needed)
Filter panel, save view, saved view dropdown, guided tour, presentation mode, opportunity score, color-coded pins, layer toggle (Pins/Heat/Cluster/Satellite/Owners), CSV export, quick filter chips, KPIs, ICP star, search-by-address, mapbox satellite, contact card with missing-field display, opt-in status, completeness/data signals, top-of-page rolling counter, three pre-saved case studies, last sale date, years at address, permit history flag, job title / value bands.

## New features I'll add (grouped)

### Map & Visual polish
1. **Animated pin drop** — pins fall + bounce on load (staggered).
2. **Cluster radius ring** — clicking a pin draws a 2-block (≈0.4 mi) ring of nearby homes; shows count.
3. **Flyover on saved view** — smooth `flyTo` + slight pitch when loading a saved view or case study.
4. **Mini-map inset** — small overview map in map corner when zoomed > z14.
5. **Insight callout cards** — floating annotations on the map (e.g. "6 homes here haven't renovated in 10+ years") tied to clusters.
6. **Street-view-style peek** — hover a pin → Mapbox satellite zoom thumbnail inline (no Google key required, uses existing Mapbox token).

### Property Intelligence
7. **Renovation-age badge** — derived per property from `lastPermitYear` / `built` ("Kitchen likely 15+ yrs", "No recent permits", etc.). No AI call needed — deterministic rules from existing data.
8. **Neighbor chain view** — when a CRM (ex-client) pin is selected, nearby Villanova/Shore pins glow as "warm prospects".
9. **Comparable spend benchmark** — small stat in detail panel: "Avg permit value in zip: $Xk".
10. **Household size estimate** — derived from `beds` + `sqft` in detail panel.

### Data Display
11. **Outreach readiness traffic light** — green/amber/red per record based on email + phone + linkedin coverage. Surfaced in CRM table + detail panel.
12. **Data completeness bar** — small progress bar per record.
13. **Missing data flag** — red dot in tables when email + phone + linkedin all absent.

### Interaction & Filtering
14. **Sort by opportunity score** — sortable column header on tables (asc/desc).
15. **Radius filter** — after drawing a ring (#2), "Filter to this radius" button restricts table + counts.
16. **Multi-select pins (shift-click)** — side-by-side compare panel for up to 4 pins.
17. **Ready-to-mail format** — existing CSV export gets a "Mail house format" variant (Name, Addr1, City, State, Zip columns only).

### Engagement & Delight
18. **Top opportunity of the week** — pinned card on Overview surfacing the single highest-score property.
19. **New-this-week badge** — green dot on records with `addedAt` within 7 days (synthetic flag added to seed data).
20. **Weekly digest snapshot** — Overview tile: "+N new opportunities since last visit" (uses localStorage timestamp).
21. **Confetti on export** — small canvas-confetti burst when CSV export completes.
22. **Dark mode toggle** — header switch; persists in localStorage. Tokenized via CSS variables; affects panels, tables, sidebar.
23. **Saved view "new matches" badge** — count of records matching a saved view's filters added since save time.

### Demo & Storytelling
24. **Shareable view link** — Save view → "Copy share link" encodes the view (filters + tab + map state) into URL hash; loads automatically on open.
25. **Annotation tool** — in Presentation mode, click-to-place a sticky note on the map; cleared on exit.
26. **PDF case study export** — one-click PDF of the current saved view: map screenshot (mapbox static API) + top 5 properties + insight callouts. Done client-side with `jspdf` + `html2canvas`.
27. **Highlight reel** — Presentation mode option that auto-scrolls through top 5 properties (10s each) with the map flying to each pin.

### Backend & Intelligence
28. **Search history log** — every filter change written to `search_history` table (Supabase already has it).
29. **Enrichment status tracker** — column in CRM showing "Enriched / Needs LinkedIn / Needs email", derived from field presence.
30. **Deduplication flag** — surfaces duplicate names/emails across tables.
31. **ICP match score** — % fit against Harth's historical best clients (rule: high value + has email + has linkedin + no recent permits + age > X).

## Skipped (per your instructions)
HubSpot webhook, record-and-replay, sound effects.

## Skipped (out of demo scope, can do later)
Before/after slider, real Google Street View (needs Google Maps connector), Zillow/Redfin photos (needs scraping or paid API), heatmap density upgrade (existing heat layer is fine), usage heatmap of clicks, auto re-enrichment to Clay, streak indicator.

## Technical notes
- All client-side; uses existing Mapbox token + Supabase tables.
- New deps: `canvas-confetti`, `jspdf`, `html2canvas`.
- Dark mode via CSS variables on `:root.dark`; minor refactor of hardcoded `bg-white` / `text-[#0F1420]` in shell + panels (tables left light initially, can do later if needed).
- Share link state is encoded JSON in `location.hash`; falls back gracefully.
- Renovation-age, ICP score, completeness % are pure functions in a new `src/lib/intel.ts`.

## Order of work
1. Intel helpers + data-derived badges (renovation age, ICP score, completeness, readiness, household, dedup, enrichment, new-this-week) — unlocks UI everywhere.
2. Map polish: animated drops, radius ring, flyover, mini-map, insight callouts, hover satellite peek, multi-select.
3. Tables: sort, missing-data, traffic light, completeness bar, enrichment column, dedup flag, ready-to-mail export.
4. Overview: top opportunity card, weekly digest, new-this-week.
5. Demo: share link, annotation tool, PDF export, highlight reel, saved-view new-match badge.
6. Polish: confetti, dark mode, search_history logging.

Implementation is large (~30 features) but each is small and isolated, so it'll land in one pass. Approve and I'll build straight through.