// Demo photo gallery — curated stock luxury home images keyed deterministically
// by record id so each property has a stable, distinct gallery. Each gallery
// uses ONE exterior (the hero) plus interior shots, so it reads as one house
// shown from inside and out rather than a slideshow of different homes.

// ─── Exteriors (one per property) ─────────────────────────
// Villanova — stone, brick, traditional colonial Main Line homes
const EXT_VIL = [
  "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1200&q=80",
  "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1200&q=80",
  "https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=1200&q=80",
  "https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=1200&q=80",
  "https://images.unsplash.com/photo-1576941089067-2de3c901e126?w=1200&q=80",
  "https://images.unsplash.com/photo-1605146768851-eda79da39897?w=1200&q=80",
  "https://images.unsplash.com/photo-1598228723793-52759bba239c?w=1200&q=80",
];

// Shore — coastal / beachfront / shingle-style exteriors
const EXT_SHORE = [
  "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=1200&q=80",
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&q=80",
  "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=80",
  "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200&q=80",
  "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=1200&q=80",
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=80",
  "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=1200&q=80",
];

// ─── Interiors (shared, used to fill the rest of every gallery) ────
// Kitchens, living rooms, dining, baths, bedrooms — neutral luxury so they
// read plausibly for both Main Line traditional and Shore coastal homes.
const INTERIORS = [
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80", // kitchen
  "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&q=80", // kitchen 2
  "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=1200&q=80", // dining
  "https://images.unsplash.com/photo-1615529182904-14819c35db37?w=1200&q=80", // bath
  "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&q=80",   // living
  "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=1200&q=80", // living 2
  "https://images.unsplash.com/photo-1600573472550-8090b5e0745e?w=1200&q=80", // living 3
  "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1200&q=80", // bath 2
  "https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1200&q=80", // bedroom
  "https://images.unsplash.com/photo-1540518614846-7eded433c457?w=1200&q=80", // bedroom 2
];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

// Returns a deterministic gallery for a record: 1 exterior (matching the
// segment) + interior shots. The same record id always yields the same
// gallery in the same order.
export function getPropertyPhotos(id: string, segment?: string, count = 6): string[] {
  const exteriors =
    segment === "vil" ? EXT_VIL :
    segment === "shore" ? EXT_SHORE :
    [...EXT_VIL, ...EXT_SHORE];
  const h = hash(id);
  const hero = exteriors[h % exteriors.length];
  // Deterministic, distinct interior selection per record.
  const step = 1 + (hash(id + "_i") % (INTERIORS.length - 1));
  const start = hash(id + "_s") % INTERIORS.length;
  const interiors: string[] = [];
  const seen = new Set<number>();
  for (let i = 0; interiors.length < count - 1 && i < INTERIORS.length * 2; i++) {
    const idx = (start + i * step) % INTERIORS.length;
    if (seen.has(idx)) continue;
    seen.add(idx);
    interiors.push(INTERIORS[idx]);
  }
  return [hero, ...interiors].slice(0, count);
}
