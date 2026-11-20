// Lightweight derived intelligence helpers used across the portal.
import type { AnyRecord } from "./portal-data";
import { opportunityScore } from "./portal-data";

// Deterministic "added this week" flag derived from id hash so the UI
// has a believable mix of new vs. existing records without a real DB column.
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
export function isNewThisWeek(r: AnyRecord): boolean {
  // ~25% of records flagged new
  return hash(r.id) % 4 === 0;
}

export type Readiness = "green" | "amber" | "red";
export function outreachReadiness(r: AnyRecord): Readiness {
  if (r.segment === "crm") {
    const n = (r.hasEmail ? 1 : 0) + (r.hasPhone ? 1 : 0) + (r.hasLinkedIn ? 1 : 0);
    if (n === 3 && r.address) return "green";
    if (n >= 2) return "amber";
    return "red";
  }
  // vil + shore: we always have address + owner → amber baseline
  return "amber";
}

export function dataCompleteness(r: AnyRecord): number {
  if (r.segment === "crm") {
    const fields = [r.name, r.email, r.phone, r.address, r.city, r.state, r.zip, r.linkedIn];
    const filled = fields.filter(Boolean).length;
    return Math.round((filled / fields.length) * 100);
  }
  if (r.segment === "vil") {
    const fields = [r.address, r.owner, r.beds, r.baths, r.sqft, r.yearBuilt, r.marketValue, r.lastSalePrice];
    return Math.round((fields.filter(Boolean).length / fields.length) * 100);
  }
  const fields = [r.address, r.owner, r.sqft, r.yearBuilt, r.salePrice, r.lastYearTax, r.ownerMail];
  return Math.round((fields.filter(Boolean).length / fields.length) * 100);
}

export function householdEstimate(r: AnyRecord): number | null {
  if (r.segment !== "vil") return null;
  // Rough: 1 adult per ~1000 sqft, min 2, max beds-1.
  return Math.max(2, Math.min(r.beds - 1, Math.round(r.sqft / 1100)));
}

export function topOpportunity<T extends AnyRecord>(records: T[]): T | null {
  if (records.length === 0) return null;
  return [...records].sort((a, b) => opportunityScore(b) - opportunityScore(a))[0] ?? null;
}
