// Real permits sourced from the Zillow_Properties_Full_Details workbook.
// Provided per Villanova property; everything else is derived.

import type { AnyRecord, VilProperty } from "./portal-data";
import { vilData } from "./portal-data";

export type WorkType =
  | "renovation"
  | "addition"
  | "roof"
  | "electrical"
  | "plumbing"
  | "hvac"
  | "deck"
  | "windows"
  | "exterior";

export const WORK_TYPES: { key: WorkType; label: string; emoji: string; color: string; bg: string }[] = [
  { key: "renovation", label: "Renovation",   emoji: "⛏",  color: "#7C3AED", bg: "#F3EEFF" },
  { key: "addition",   label: "Addition",     emoji: "🏗", color: "#0a1b30", bg: "#EFF6FF" },
  { key: "roof",       label: "Roof",         emoji: "🏠", color: "#D97706", bg: "#FEF3C7" },
  { key: "electrical", label: "Electrical",   emoji: "⚡", color: "#0891B2", bg: "#E0F7FA" },
  { key: "plumbing",   label: "Plumbing",     emoji: "🔧", color: "#0F766E", bg: "#ECFDF5" },
  { key: "hvac",       label: "HVAC",         emoji: "❄",  color: "#0EA5E9", bg: "#E0F2FE" },
  { key: "deck",       label: "Deck",         emoji: "🌿", color: "#059669", bg: "#ECFDF5" },
  { key: "windows",    label: "Windows",      emoji: "🪟", color: "#475569", bg: "#F1F5F9" },
  { key: "exterior",   label: "Exterior",     emoji: "🥥", color: "#B45309", bg: "#FEF3C7" },
];

const WORK_TYPE_KEYS: WorkType[] = WORK_TYPES.map((w) => w.key);

export type Permit = {
  id: string;
  propId: string;
  propAddress: string;
  type: WorkType;
  label: string;
  emoji: string;
  color: string;
  bg: string;
  date: string;        // YYYY-MM-DD
  year: number;
  jobValue: number;
  contractor: string;
  description: string;
  number: string;      // P-YYYY-###
};

type RawPermit = {
  number: string;
  date: string;
  jobValue: number;
  type: WorkType;
  contractor: string;
  description: string;
};

export const REAL_PERMITS_BY_PROP: Record<string, Omit<Permit,'propAddress'|'label'|'emoji'|'color'|'bg'|'year'|'propId'|'id'>[]> = {
  "v1": [
    { number:"P-2015-044", date:"2015-03-12", jobValue:4800, type:"roof", contractor:"Summit Roofing Inc", description:"Full roof replacement with architectural shingles and new flashing (Residential)".trim() },
    { number:"P-2018-119", date:"2018-09-22", jobValue:12500, type:"renovation", contractor:"Heritage Kitchen Designs", description:"Complete kitchen renovation including new cabinets, countertops and appliances (Kitchen)".trim() },
    { number:"P-2021-033", date:"2021-04-05", jobValue:3200, type:"hvac", contractor:"Comfort Air Systems", description:"Replacement of central air conditioning unit and ductwork inspection (Residential)".trim() },
  ],
  "v2": [
    { number:"P-2012-067", date:"2012-06-18", jobValue:28000, type:"addition", contractor:"Premier Building Solutions", description:"Three-car garage addition with bonus storage room above (Residential)".trim() },
    { number:"P-2019-088", date:"2019-08-30", jobValue:8500, type:"renovation", contractor:"Luxury Bath & Tile Co", description:"Master bathroom expansion with heated floors and steam shower (Master Bath)".trim() },
    { number:"P-2022-015", date:"2022-02-14", jobValue:5100, type:"electrical", contractor:"ProElec Services", description:"Whole-house generator installation and transfer switch wiring (Residential)".trim() },
  ],
  "v3": [
    { number:"P-2010-023", date:"2010-04-07", jobValue:45000, type:"renovation", contractor:"Estate Restoration Group", description:"Comprehensive historic home restoration including plaster repair, window restoration and structural updates (Whole House)".trim() },
    { number:"P-2016-078", date:"2016-07-14", jobValue:18000, type:"addition", contractor:"Artisan Builders LLC", description:"New carriage house conversion to guest quarters with full bathroom (Residential)".trim() },
    { number:"P-2020-051", date:"2020-05-19", jobValue:6200, type:"roof", contractor:"Historic Roof Specialists", description:"Slate roof repair and partial replacement on main house and wing (Residential)".trim() },
  ],
  "v4": [
    { number:"P-2014-056", date:"2014-05-02", jobValue:22000, type:"renovation", contractor:"Gourmet Design Build", description:"Full kitchen gut renovation with custom cabinetry and stone counters (Kitchen)".trim() },
    { number:"P-2018-033", date:"2018-03-28", jobValue:9800, type:"exterior", contractor:"Stone Craft Masonry", description:"Repointing and repair of stone facade and chimney restoration (Masonry)".trim() },
  ],
  "v5": [
    { number:"P-2017-091", date:"2017-09-11", jobValue:7400, type:"deck", contractor:"Outdoor Living Pros", description:"New wraparound deck with pergola and built-in seating area (Residential)".trim() },
    { number:"P-2020-072", date:"2020-07-22", jobValue:4100, type:"roof", contractor:"Certified Roofing Group", description:"Full roof replacement with impact-resistant shingles (Residential)".trim() },
    { number:"P-2022-041", date:"2022-05-03", jobValue:3600, type:"hvac", contractor:"Premier Climate Control", description:"Dual-zone HVAC upgrade with new air handlers and smart thermostats (Residential)".trim() },
  ],
  "v6": [
    { number:"P-2013-044", date:"2013-04-15", jobValue:14500, type:"addition", contractor:"Sherwood Builders Inc", description:"Sunroom addition off main living area with heated floor (Residential)".trim() },
    { number:"P-2019-065", date:"2019-06-07", jobValue:5300, type:"renovation", contractor:"Premier Bath Solutions", description:"Hall bathroom renovation with new fixtures and tile surround (Bathroom)".trim() },
  ],
  "v7": [
    { number:"P-2016-052", date:"2016-05-10", jobValue:6800, type:"renovation", contractor:"Modern Kitchen Studio", description:"Kitchen remodel with new island, quartz counters and appliances (Kitchen)".trim() },
    { number:"P-2018-097", date:"2018-10-04", jobValue:3400, type:"renovation", contractor:"Andersen Window Pros", description:"Replacement of 14 double-hung windows with energy-efficient units (Residential)".trim() },
    { number:"P-2021-058", date:"2021-06-14", jobValue:4900, type:"deck", contractor:"Outdoor Design Co", description:"New composite deck with stairs and privacy screening (Residential)".trim() },
  ],
  "v8": [
    { number:"P-2009-031", date:"2009-03-20", jobValue:85000, type:"renovation", contractor:"Grand Estate Renovations", description:"Historic estate comprehensive renovation including new mechanicals, windows and interior finishes (Whole House)".trim() },
    { number:"P-2015-088", date:"2015-09-03", jobValue:32000, type:"addition", contractor:"Estate Building Group", description:"Pool house construction with full bath, kitchenette and equipment room (Residential)".trim() },
    { number:"P-2019-076", date:"2019-08-08", jobValue:12000, type:"exterior", contractor:"Historic Masonry Arts", description:"Repointing and restoration of original stone walls and entry pillars (Masonry)".trim() },
  ],
  "v9": [
    { number:"P-2016-034", date:"2016-04-04", jobValue:9200, type:"renovation", contractor:"Finished Space Pros", description:"Basement finishing with home theater, bar and full bathroom (Basement)".trim() },
    { number:"P-2020-019", date:"2020-02-12", jobValue:5800, type:"deck", contractor:"Luxury Outdoor Living", description:"Bluestone patio and outdoor kitchen installation with pergola (Residential)".trim() },
  ],
  "v10": [
    { number:"P-2011-041", date:"2011-04-27", jobValue:38000, type:"renovation", contractor:"Vintage Home Restorers", description:"Historic home renovation including structural repairs, new wiring and plumbing throughout (Whole House)".trim() },
    { number:"P-2016-097", date:"2016-10-12", jobValue:7600, type:"roof", contractor:"Slate & Shingle Masters", description:"Partial slate roof replacement and copper flashing installation (Residential)".trim() },
    { number:"P-2021-044", date:"2021-04-28", jobValue:4200, type:"hvac", contractor:"Radnor Comfort Systems", description:"Boiler replacement and heating system upgrade (Residential)".trim() },
  ],
  "v11": [
    { number:"P-2015-063", date:"2015-06-22", jobValue:11500, type:"addition", contractor:"Main Line Builders", description:"Two-car garage addition with storage loft (Residential)".trim() },
    { number:"P-2019-079", date:"2019-08-19", jobValue:5700, type:"renovation", contractor:"Kitchen Crafters LLC", description:"Kitchen renovation with new layout, quartz counters and custom cabinetry (Kitchen)".trim() },
  ],
  "v12": [
    { number:"P-2013-077", date:"2013-07-08", jobValue:24000, type:"renovation", contractor:"Preservation Builders", description:"Victorian home restoration including porch reconstruction and interior update (Whole House)".trim() },
    { number:"P-2018-055", date:"2018-05-29", jobValue:6100, type:"plumbing", contractor:"Quality Plumbing Pros", description:"Full plumbing re-pipe with copper supply lines and updated fixtures (Residential)".trim() },
    { number:"P-2022-027", date:"2022-03-07", jobValue:4400, type:"electrical", contractor:"Safe Wiring Co", description:"Electrical panel replacement with 200-amp service upgrade (Residential)".trim() },
  ],
  "v13": [
    { number:"P-2014-088", date:"2014-08-04", jobValue:8900, type:"addition", contractor:"Cedar Lane Construction", description:"Mudroom and laundry room addition off rear entry (Residential)".trim() },
    { number:"P-2018-072", date:"2018-07-16", jobValue:4500, type:"roof", contractor:"Pro Roofing Services", description:"Complete roof replacement with 30-year architectural shingles (Residential)".trim() },
    { number:"P-2020-088", date:"2020-09-01", jobValue:3100, type:"renovation", contractor:"Premium Window Co", description:"Replacement of 10 windows and two exterior doors (Residential)".trim() },
  ],
  "v14": [
    { number:"P-2017-044", date:"2017-04-24", jobValue:5600, type:"renovation", contractor:"Bath & Tile Studio", description:"Master bath renovation with new vanity, shower tile and fixtures (Bathroom)".trim() },
    { number:"P-2019-091", date:"2019-09-17", jobValue:3800, type:"deck", contractor:"Deck Masters LLC", description:"Pressure-treated deck replacement with composite decking (Residential)".trim() },
  ],
  "v15": [
    { number:"P-2018-041", date:"2018-04-17", jobValue:15000, type:"renovation", contractor:"Prestige Basement Finishers", description:"Finished basement with gym, wine cellar and full bath (Basement)".trim() },
    { number:"P-2020-063", date:"2020-06-23", jobValue:7800, type:"exterior", contractor:"Outdoor Escapes Design", description:"Rear patio expansion with outdoor kitchen and fire pit area (Landscaping/Patio)".trim() },
    { number:"P-2022-052", date:"2022-06-08", jobValue:5200, type:"hvac", contractor:"Comfort Zone HVAC", description:"Geothermal heat pump system installation and zoning upgrade (Residential)".trim() },
  ],
  "v16": [
    { number:"P-2015-072", date:"2015-07-14", jobValue:5200, type:"renovation", contractor:"Classic Kitchen Co", description:"Kitchen renovation with new cabinets, appliances and backsplash (Kitchen)".trim() },
    { number:"P-2019-048", date:"2019-05-13", jobValue:3900, type:"roof", contractor:"All Season Roofing", description:"Full roof replacement with new underlayment and shingles (Residential)".trim() },
  ],
  "v17": [
    { number:"P-2013-055", date:"2013-05-17", jobValue:42000, type:"addition", contractor:"Greenwell Estate Builders", description:"In-ground pool, pool house and extensive hardscape installation (Residential)".trim() },
    { number:"P-2018-093", date:"2018-09-10", jobValue:9500, type:"renovation", contractor:"Spa Bath Designs", description:"Master suite bathroom expansion with soaking tub and steam shower (Master Bath)".trim() },
    { number:"P-2021-071", date:"2021-08-04", jobValue:6800, type:"exterior", contractor:"Superior Exterior Solutions", description:"Full exterior siding replacement with James Hardie fiber cement (Siding)".trim() },
  ],
};

// ─── Build full Permit objects per property ─────────────────
const PERMITS_BY_PROP: Record<string, Permit[]> = {};
for (const p of vilData) {
  const raw = REAL_PERMITS_BY_PROP[p.id] ?? [];
  PERMITS_BY_PROP[p.id] = raw.map((r) => {
    const meta = WORK_TYPES.find((w) => w.key === r.type) ?? WORK_TYPES[0];
    return {
      id: `${p.id}-${r.number}`,
      propId: p.id,
      propAddress: p.address,
      type: r.type,
      label: meta.label,
      emoji: meta.emoji,
      color: meta.color,
      bg: meta.bg,
      date: r.date,
      year: Number(r.date.slice(0, 4)) || 2020,
      jobValue: r.jobValue,
      contractor: r.contractor,
      description: r.description,
      number: r.number,
    };
  });
}

export const ALL_PERMITS: Permit[] = Object.values(PERMITS_BY_PROP).flat()
  .sort((a, b) => (a.date < b.date ? 1 : -1));

// Publish a global registry so opportunityScore() can compute "years since last
// permit" without a circular import. Cheap, deterministic, runs once at module load.
(globalThis as { __HARTH_PERMITS__?: Record<string, { date: string }[]> }).__HARTH_PERMITS__ =
  Object.fromEntries(Object.entries(PERMITS_BY_PROP).map(([k, v]) => [k, v.map((p) => ({ date: p.date }))]));

export function permitsFor(propId: string): Permit[] {
  return PERMITS_BY_PROP[propId] ?? [];
}
export function workCompleted(propId: string): Set<WorkType> {
  return new Set(permitsFor(propId).map((p) => p.type));
}
export function workGaps(propId: string): WorkType[] {
  const done = workCompleted(propId);
  return WORK_TYPE_KEYS.filter((w) => !done.has(w));
}

// ─── Renovation potential 0-100 + reason ────────────────────
export function renoPotential(r: AnyRecord): { score: number; reason: string } | null {
  if (r.segment !== "vil") return null;
  const v = r as VilProperty;
  const age = 2026 - v.yearBuilt;
  const gaps = workGaps(v.id).length;
  const ageNorm = Math.min(1, age / 80);
  const gapNorm = gaps / WORK_TYPE_KEYS.length;
  const fewPermits = Math.max(0, 1 - v.permitCount / 4);
  const raw = ageNorm * 0.5 + gapNorm * 0.4 + fewPermits * 0.1;
  const score = Math.round(raw * 100);
  return {
    score,
    reason: `${age} years old · ${gaps} work types not yet permitted`,
  };
}
