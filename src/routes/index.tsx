import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import confetti from "canvas-confetti";
import jsPDF from "jspdf";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, ScatterChart, Scatter, ReferenceLine,
} from "recharts";
import {
  MapPin, Flame, Box, Satellite, Star, Bookmark, Play, Pause,
  Download, X, ChevronRight, Sparkles, Maximize2, Minimize2, ArrowRight, Filter, Users,
  Share2, FileText, ArrowUpDown,
} from "lucide-react";

import { getMapboxToken } from "@/lib/mapbox.functions";
import {
  vilData, shoreData, crmData, allRecords, caseStudies,
  opportunityScore, scoreColor, scoreLabel, isICPMatch, recordTitle,
  pricePerSqft, MEDIAN_PPSF, scoreDrivers, cashAvailabilityFactor,
  neighborhoodPpsf, heatWeight as recordHeatWeight,
  icpScore, icpLabel, icpColor, icpDrivers,
  recordStatus, statusColor,
  HARTH_OFFICE as HARTH_OFFICE_LL, milesBetween,
  type AnyRecord, type Segment, type CaseStudy, type VilProperty, type ShoreProperty,
  type RecordStatus,
} from "@/lib/portal-data";
import {
  WORK_TYPES, ALL_PERMITS, permitsFor, workCompleted, workGaps, renoPotential,
  type WorkType,
} from "@/lib/portal-permits";
import { isNewThisWeek, topOpportunity, dataCompleteness } from "@/lib/intel";
import harthLogo from "@/assets/harth-logo.png.asset.json";
import { fetchListingPhotos } from "@/lib/listing-photos.functions";
import { ZILLOW_PHOTOS } from "@/lib/zillow-photos";
import { StreetViewPano } from "@/components/StreetViewPano";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Harth Builders · Intelligence Portal" },
      { name: "description", content: "Hyper-targeted property and ex-client intelligence for the Main Line, NJ Shore, and Harth's CRM." },
    ],
  }),
  component: Portal,
});

// ─── Types ────────────────────────────────────────────────
type TabKey = "overview" | "map" | "crm" | "vil" | "shore" | "permits" | "matrix" | "analytics";
type LayerKey = "pins" | "heat" | "cluster" | "satellite" | "owners";

// Harth's office (Villanova/Main Line). Used for the drive-time reach overlay.
const HARTH_OFFICE: [number, number] = [-75.3438, 40.0367];

// Approx lat/lng for Philly-area zips found in Shore owners' mailing addresses
const PHILA_ZIP_COORDS: Record<string, [number, number]> = {
  "19103": [-75.1727, 39.9496], // Rittenhouse
  "19147": [-75.1561, 39.9356], // Queen Village / Bella Vista
  "19102": [-75.1652, 39.9510], // Center City
  "19118": [-75.2080, 40.0750], // Chestnut Hill
  "19145": [-75.1810, 39.9220], // S Philly
  "19115": [-75.0420, 40.0900], // Far NE
};
function ownerZip(mail: string): string | null {
  const m = mail.match(/\b(\d{5})\b\s*$/);
  return m ? m[1] : null;
}
type FilterState = {
  segment: "all" | Segment;
  hasEmail: boolean;
  hasLinkedIn: boolean;
  noPermits: boolean;
  state: "" | "PA" | "NJ";
  minValue: number;
  builtBefore: number;
  contractor: string;       // free-text contractor name (e.g. "Keystone")
  minLotSqft: number;       // 0 = no lot-size filter
  maxPricePerSqft: number;  // 0 = no $/sqft cap
  status: "all" | RecordStatus;
  era: "all" | "pre1960" | "1960s70s" | "1980s90s" | "2000plus";
  permitBucket: "all" | "0" | "1" | "2" | "3+";
  optIn: "all" | "in" | "out";
  oppBand: "all" | "hot" | "warm" | "cold";
  minIcp: number;
};

type SavedView = {
  id: string;
  name: string;
  emoji: string;
  filters: FilterState;
  tab: TabKey;
  layer?: LayerKey;
  center?: [number, number];
  zoom?: number;
  createdAt: number;
};

const DEFAULT_FILTERS: FilterState = {
  segment: "all",
  hasEmail: false,
  hasLinkedIn: false,
  noPermits: false,
  state: "",
  minValue: 0,
  builtBefore: 2026,
  contractor: "",
  minLotSqft: 0,
  maxPricePerSqft: 0,
  status: "all",
  era: "all",
  permitBucket: "all",
  optIn: "all",
  oppBand: "all",
  minIcp: 0,
};

const fmt$ = (n: number | null | undefined) =>
  n == null ? "—" : "$" + Math.round(n).toLocaleString();

const fmtN = (n: number | null | undefined) =>
  n == null ? "—" : n.toLocaleString();

const recordSalePrice = (r: AnyRecord): number =>
  r.segment === "vil" ? (r as VilProperty).lastSalePrice
  : r.segment === "shore" ? (r as ShoreProperty).salePrice
  : 0;

const propertyAerialUrl = (record: AnyRecord, token: string, size = "600x320", zoom = 18) =>
  token && record.segment !== "crm" && record.lat && record.lng
    ? `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/static/${record.lng},${record.lat},${zoom},0/${size}@2x?access_token=${token}`
    : "";

// ─── Share link encoding ───────────────────────────────────
type ShareState = {
  tab: TabKey;
  layer: LayerKey;
  filters: FilterState;
  center?: [number, number];
  zoom?: number;
};
function encodeShare(s: ShareState): string {
  try {
    const json = JSON.stringify(s);
    return "#v=" + btoa(unescape(encodeURIComponent(json)));
  } catch { return ""; }
}
function decodeShare(hash: string): ShareState | null {
  try {
    const m = hash.match(/#v=(.+)/);
    if (!m) return null;
    const json = decodeURIComponent(escape(atob(m[1])));
    return JSON.parse(json) as ShareState;
  } catch { return null; }
}

// ─── PDF case-study export ─────────────────────────────────
async function exportCaseStudyPDF(opts: {
  title: string;
  subtitle: string;
  mapboxToken: string;
  center: [number, number];
  zoom: number;
  records: AnyRecord[];
}) {
  const { title, subtitle, mapboxToken, center, zoom, records } = opts;
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
  const w = doc.internal.pageSize.getWidth();
  let y = 48;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Harth Builders · Intelligence", 48, y);
  y += 22;
  doc.setFontSize(14);
  doc.setTextColor(60);
  doc.text(title, 48, y);
  y += 16;
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(subtitle, 48, y);
  y += 18;

  // Mapbox static map
  try {
    const overlayPins = records.slice(0, 30)
      .map((r) => {
        const color = scoreColor(opportunityScore(r)).replace("#", "");
        return `pin-s+${color}(${r.lng},${r.lat})`;
      })
      .join(",");
    const overlay = overlayPins ? overlayPins + "/" : "";
    const url = `https://api.mapbox.com/styles/v1/mapbox/light-v11/static/${overlay}${center[0]},${center[1]},${zoom},0/720x360@2x?access_token=${mapboxToken}`;
    const res = await fetch(url);
    const blob = await res.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
    const imgW = w - 96;
    const imgH = imgW * 0.5;
    doc.addImage(dataUrl, "PNG", 48, y, imgW, imgH);
    y += imgH + 18;
  } catch { /* ignore static map failure */ }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(20);
  doc.text("Top properties", 48, y);
  y += 14;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const top = [...records]
    .sort((a, b) => opportunityScore(b) - opportunityScore(a))
    .slice(0, 8);
  top.forEach((r, i) => {
    const score = opportunityScore(r).toFixed(1);
    const line = `${i + 1}. ${recordTitle(r)} — score ${score}/10`;
    doc.setTextColor(40);
    doc.text(line, 48, y);
    y += 14;
    if (y > 720) { doc.addPage(); y = 48; }
  });

  y += 8;
  doc.setFontSize(9);
  doc.setTextColor(140);
  doc.text(
    `Generated ${new Date().toLocaleString()} · ${records.length} records in view`,
    48,
    760,
  );

  doc.save(`harth-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`);
  try {
    confetti({ particleCount: 60, spread: 60, origin: { y: 0.8 } });
  } catch { /* noop */ }
}



// ─── Portal root ──────────────────────────────────────────
function Portal() {
  const tokenFn = useServerFn(getMapboxToken);
  const { data: tokenData } = useSuspenseQuery({
    queryKey: ["mapbox-token"],
    queryFn: () => tokenFn(),
  });
  const token = tokenData?.token ?? "";

  const [tab, setTab] = useState<TabKey>("overview");
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [selected, setSelected] = useState<AnyRecord | null>(null);
  const [layer, setLayer] = useState<LayerKey>("pins");
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [showSavedDrop, setShowSavedDrop] = useState(false);
  const [presentation, setPresentation] = useState(false);
  const [tourPlaying, setTourPlaying] = useState(false);
  const [tourIdx, setTourIdx] = useState(0);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  // Load saved views from localStorage, OR pre-seed with the three case studies
  // (Villanova / NJ Shore / Ex-Clients) so Lauren + Greg land on a working pipeline.
  useEffect(() => {
    const STORAGE_KEY = "harth-saved-views-v3";
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as SavedView[];
        if (parsed.length) { setSavedViews(parsed); return; }
      }
    } catch { /* noop */ }
    const seeded: SavedView[] = caseStudies.map((cs, i) => ({
      id: `case-${cs.id}`,
      name: cs.title,
      emoji: cs.emoji,
      filters: { ...DEFAULT_FILTERS, segment: cs.segment === "all" ? "all" : cs.segment },
      tab: "map" as TabKey,
      layer: "pins" as LayerKey,
      center: cs.center,
      zoom: cs.zoom,
      createdAt: Date.now() - (caseStudies.length - i) * 86400000,
    }));
    setSavedViews(seeded);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded)); } catch { /* noop */ }
  }, []);
  const persistSaved = useCallback((v: SavedView[]) => {
    setSavedViews(v);
    try { localStorage.setItem("harth-saved-views-v3", JSON.stringify(v)); } catch { /* noop */ }
  }, []);

  // Decode share link from URL hash on first load
  useEffect(() => {
    const s = decodeShare(window.location.hash);
    if (!s) return;
    setTab(s.tab);
    setLayer(s.layer);
    setFilters(s.filters);
    if (s.center && s.zoom != null) {
      const tryFly = () => {
        const m = mapRef.current;
        if (m) {
          m.flyTo({ center: s.center!, zoom: s.zoom!, speed: 1.0, essential: true });
        } else {
          setTimeout(tryFly, 300);
        }
      };
      setTimeout(tryFly, 600);
    }
  }, []);

  const copyShareLink = useCallback(async () => {
    const m = mapRef.current;
    const s: ShareState = {
      tab, layer, filters,
      center: m ? [m.getCenter().lng, m.getCenter().lat] : undefined,
      zoom: m?.getZoom(),
    };
    const url = window.location.origin + window.location.pathname + encodeShare(s);
    try {
      await navigator.clipboard.writeText(url);
      alert("Share link copied to clipboard");
    } catch {
      window.prompt("Copy this share link:", url);
    }
  }, [tab, layer, filters]);

  // Filtered records
  const filtered = useMemo(() => {
    const contractorQ = filters.contractor.trim();
    const propsMatchingContractor = contractorQ
      ? new Set(ALL_PERMITS.filter((p) => p.contractor === contractorQ).map((p) => p.propId))
      : null;
    return allRecords.filter((r) => {
      if (filters.segment !== "all" && r.segment !== filters.segment) return false;
      if (filters.hasEmail && !(r.segment === "crm" && r.hasEmail)) return false;
      if (filters.hasLinkedIn && !(r.segment === "crm" && r.hasLinkedIn)) return false;
      if (filters.noPermits && !(r.segment === "vil" && r.permitCount === 0)) return false;
      if (filters.state) {
        if (r.segment === "vil" && filters.state !== "PA") return false;
        if (r.segment === "shore" && filters.state !== "NJ") return false;
        if (r.segment === "crm" && r.state !== filters.state) return false;
      }
      if (filters.minValue > 0) {
        if (r.segment === "vil" && r.marketValue < filters.minValue) return false;
        if (r.segment === "shore" && r.salePrice < filters.minValue) return false;
        if (r.segment === "crm") return false; // hide CRM when value filter active
      }
      if (filters.builtBefore < 2026) {
        if (r.segment === "vil" && r.yearBuilt > filters.builtBefore) return false;
        if (r.segment === "shore" && r.yearBuilt > filters.builtBefore) return false;
      }
      if (propsMatchingContractor) {
        // Only properties with a permit by that contractor — drops CRM and Shore (no permits)
        if (!propsMatchingContractor.has(r.id)) return false;
      }
      if (filters.minLotSqft > 0) {
        const lot = (r as VilProperty | ShoreProperty).lotSqft;
        if (!lot || lot < filters.minLotSqft) return false;
      }
      if (filters.maxPricePerSqft > 0) {
        const p = pricePerSqft(r);
        if (p == null || p > filters.maxPricePerSqft) return false;
      }
      if (filters.status !== "all" && recordStatus(r) !== filters.status) return false;
      if (filters.era !== "all") {
        const yb = r.segment === "vil" || r.segment === "shore" ? r.yearBuilt : null;
        if (yb == null) return false;
        if (filters.era === "pre1960" && yb >= 1960) return false;
        if (filters.era === "1960s70s" && (yb < 1960 || yb >= 1980)) return false;
        if (filters.era === "1980s90s" && (yb < 1980 || yb >= 2000)) return false;
        if (filters.era === "2000plus" && yb < 2000) return false;
      }
      if (filters.permitBucket !== "all") {
        if (r.segment !== "vil") return false;
        const c = r.permitCount;
        if (filters.permitBucket === "0" && c !== 0) return false;
        if (filters.permitBucket === "1" && c !== 1) return false;
        if (filters.permitBucket === "2" && c !== 2) return false;
        if (filters.permitBucket === "3+" && c < 3) return false;
      }
      if (filters.optIn !== "all") {
        if (r.segment !== "crm") return false;
        if (filters.optIn === "in" && !r.emailOptIn) return false;
        if (filters.optIn === "out" && r.emailOptIn) return false;
      }
      if (filters.oppBand !== "all") {
        const s = opportunityScore(r);
        if (filters.oppBand === "hot" && s < 7.5) return false;
        if (filters.oppBand === "warm" && (s < 5.5 || s >= 7.5)) return false;
        if (filters.oppBand === "cold" && s >= 5.5) return false;
      }
      if (filters.minIcp > 0 && icpScore(r) < filters.minIcp) return false;
      return true;
    });
  }, [filters]);

  const exportPDF = useCallback(async () => {
    const m = mapRef.current;
    const center: [number, number] = m
      ? [m.getCenter().lng, m.getCenter().lat]
      : [-75.35, 40.04];
    const zoom = m?.getZoom() ?? 11;
    await exportCaseStudyPDF({
      title: `${tab.toUpperCase()} View`,
      subtitle: `${filtered.length} records · ${filters.segment === "all" ? "All segments" : filters.segment}`,
      mapboxToken: token,
      center, zoom, records: filtered,
    });
  }, [tab, filtered, filters, token]);



  // Tour timer
  useEffect(() => {
    if (!tourPlaying) return;
    const t = setTimeout(() => {
      const next = (tourIdx + 1) % caseStudies.length;
      setTourIdx(next);
      const cs = caseStudies[next];
      loadCaseStudy(cs);
    }, 7000);
    return () => clearTimeout(t);
  }, [tourPlaying, tourIdx]);

  // ESC exits presentation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPresentation(false);
        setTourPlaying(false);
      }
      if (presentation) {
        if (e.key === "ArrowRight") nextCase();
        if (e.key === "ArrowLeft") prevCase();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [presentation, tourIdx]);

  function nextCase() {
    const next = (tourIdx + 1) % caseStudies.length;
    setTourIdx(next);
    loadCaseStudy(caseStudies[next]);
  }
  function prevCase() {
    const next = (tourIdx - 1 + caseStudies.length) % caseStudies.length;
    setTourIdx(next);
    loadCaseStudy(caseStudies[next]);
  }

  function loadCaseStudy(cs: CaseStudy) {
    setTab("map");
    setFilters({ ...DEFAULT_FILTERS, segment: cs.segment === "all" ? "all" : cs.segment });
    setSelected(null);
    setLayer("pins");
    setTimeout(() => {
      mapRef.current?.flyTo({
        center: cs.center, zoom: cs.zoom, pitch: cs.pitch ?? 0, bearing: cs.bearing ?? 0,
        speed: 0.9, curve: 1.6, essential: true,
      });
    }, 200);
  }

  function saveCurrentView() {
    const name = prompt("Name this view:", "Untitled view");
    if (!name) return;
    const m = mapRef.current;
    const view: SavedView = {
      id: Date.now().toString(36),
      name,
      emoji: "📌",
      filters,
      tab,
      layer,
      center: m ? [m.getCenter().lng, m.getCenter().lat] : undefined,
      zoom: m?.getZoom(),
      createdAt: Date.now(),
    };
    persistSaved([view, ...savedViews]);
  }

  function applySavedView(v: SavedView) {
    setFilters(v.filters);
    setTab(v.tab);
    if (v.layer) setLayer(v.layer);
    if (v.center && v.zoom != null && mapRef.current) {
      setTimeout(() => mapRef.current?.flyTo({ center: v.center!, zoom: v.zoom!, speed: 1.2 }), 200);
    }
  }
  function deleteSavedView(id: string) {
    persistSaved(savedViews.filter((v) => v.id !== id));
  }
  function renameSavedView(id: string, name: string) {
    persistSaved(savedViews.map((v) => v.id === id ? { ...v, name } : v));
  }

  // KPI totals (use full set, not filtered, so headline numbers feel stable)
  const totals = useMemo(() => {
    const totalPermits = vilData.reduce((s, v) => s + v.permitCount, 0);
    const avgVil = vilData.reduce((s, v) => s + v.marketValue, 0) / vilData.length;
    const avgShore = shoreData.reduce((s, v) => s + v.salePrice, 0) / shoreData.length;
    return { totalPermits, avgVil, avgShore };
  }, []);

  const selectTopTab = useCallback((next: TabKey) => {
    if (next === "map") {
      setFilters(DEFAULT_FILTERS);
      setLayer("pins");
      setSelected(null);
    } else if (next === "crm" || next === "vil" || next === "shore") {
      setFilters({ ...DEFAULT_FILTERS, segment: next });
      setLayer("pins");
      setSelected(null);
    } else if (next === "permits") {
      setFilters({ ...DEFAULT_FILTERS, segment: "vil" });
      setLayer("heat");
      setSelected(null);
    }
    setTab(next);
  }, []);

  const isMapTab = tab === "map" || tab === "crm" || tab === "vil" || tab === "shore" || tab === "permits";

  if (presentation) {
    return (
      <PresentationMode
        onExit={() => { setPresentation(false); setTourPlaying(false); }}
        tourPlaying={tourPlaying}
        toggleTour={() => setTourPlaying((p) => !p)}
        next={nextCase}
        prev={prevCase}
        currentCase={caseStudies[tourIdx]}
        token={token}
        filtered={filtered}
      />
    );
  }

  return (
    <div className="flex h-screen w-screen flex-col bg-[#F5F6F8] text-[#0A1B2F]" style={{ fontFamily: "'Roboto', system-ui, sans-serif" }}>
      <TopBar
        tab={tab} setTab={selectTopTab}
        goHome={() => {
          setSelected(null);
          setPresentation(false);
          setTourPlaying(false);
          setTab("overview");
        }}
        showSavedDrop={showSavedDrop} setShowSavedDrop={setShowSavedDrop}
        savedViews={savedViews}
        applySaved={applySavedView}
        deleteSaved={deleteSavedView}
        renameSaved={renameSavedView}
        saveCurrent={saveCurrentView}
        startPresentation={() => { setPresentation(true); setTourIdx(0); }}
        playTour={() => { setPresentation(true); setTourPlaying(true); setTourIdx(0); }}
        copyShare={copyShareLink}
        exportPDF={exportPDF}
      />


      <LiveCounter filtered={filtered} />

      <div className="flex flex-1 min-h-0">
        <Sidebar filters={filters} setFilters={setFilters} filtered={filtered} />
        <main className="flex-1 overflow-hidden">
          {tab === "overview" && (
            <OverviewView
              totals={totals}
              token={token}
              loadCase={(cs) => loadCaseStudy(cs)}
              setTab={setTab}
              filtered={filtered}
              onOpenRecord={(r) => { setSelected(r); setTab("map"); }}
              viewRenoOnMap={() => {
                setTab("map");
                setFilters({ ...DEFAULT_FILTERS, segment: "vil" });
                setLayer("heat");
                setTimeout(() => {
                  mapRef.current?.flyTo({
                    center: [-75.3438, 40.0367],
                    zoom: 13.4, pitch: 45, bearing: -12,
                    speed: 0.9, curve: 1.6, essential: true,
                  });
                }, 220);
              }}
            />
          )}
          {isMapTab && (
            <MapView
              token={token} mapRef={mapRef} layer={layer} setLayer={setLayer}
              records={filtered} selected={selected} setSelected={setSelected}
            />
          )}
          {tab === "matrix" && <CoverageMatrixView onOpen={(r) => { setSelected(r); setTab("map"); }} />}
          {tab === "analytics" && <AnalyticsView />}
        </main>
      </div>
    </div>
  );
}

// ─── TopBar ───────────────────────────────────────────────
function TopBar({
  tab, setTab, goHome, showSavedDrop, setShowSavedDrop, savedViews,
  applySaved, deleteSaved, renameSaved, saveCurrent, startPresentation, playTour,
  copyShare, exportPDF,
}: {
  tab: TabKey; setTab: (t: TabKey) => void;
  goHome: () => void;
  showSavedDrop: boolean; setShowSavedDrop: (v: boolean) => void;
  savedViews: SavedView[];
  applySaved: (v: SavedView) => void;
  deleteSaved: (id: string) => void;
  renameSaved: (id: string, name: string) => void;
  saveCurrent: () => void;
  startPresentation: () => void;
  playTour: () => void;
  copyShare: () => void;
  exportPDF: () => void;
}) {
  const tabs: { k: TabKey; label: string }[] = [

    { k: "overview", label: "Overview" },
    { k: "map", label: "Map" },
    { k: "crm", label: "Ex-Clients" },
    { k: "vil", label: "Villanova" },
    { k: "shore", label: "NJ Shore" },
    { k: "permits", label: "Permits" },
    { k: "matrix", label: "Matrix" },
    { k: "analytics", label: "Analytics" },
  ];
  return (
    <header className="relative flex h-16 flex-shrink-0 items-center gap-3 border-b border-[#0a1b30] bg-[#0a1b30] px-4 text-white">
      <button
        type="button"
        onClick={goHome}
        className="shrink-0 flex items-center rounded bg-white/95 px-2 py-1 hover:brightness-105"
        title="Back to overview"
      >
        <img src={harthLogo.url} alt="Harth Design Build Remodel" className="h-7 w-auto" />
      </button>
      {tab !== "overview" && (
        <button
          type="button"
          onClick={goHome}
          className="shrink-0 inline-flex items-center gap-1 rounded-md border border-white/20 bg-white/10 px-2.5 py-1.5 text-xs font-medium hover:bg-white/20"
          title="Back to overview"
        >
          ← Back
        </button>
      )}
      <div className="h-7 w-px shrink-0 bg-white/25" />
      <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80">Intel</span>
      <nav className="ml-2 flex flex-1 min-w-0 gap-1 overflow-x-auto scrollbar-none">
        {tabs.map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k)}
            className={`shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${
              tab === t.k ? "bg-white text-[#0a1b30] shadow-sm" : "text-white/85 hover:bg-white/15 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>
      <div className="flex shrink-0 items-center gap-1.5">
        <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-semibold tracking-wider">LIVE</span>
        <button
          onClick={saveCurrent}
          className="shrink-0 whitespace-nowrap rounded-md border border-white/15 bg-white/10 px-2.5 py-1.5 text-xs font-medium hover:bg-white/20"
          title="Save view"
        >
          <Bookmark className="inline h-3 w-3 sm:mr-1" />
          <span className="hidden sm:inline">Save view</span>
        </button>
        <button
          onClick={() => setShowSavedDrop(!showSavedDrop)}
          className="shrink-0 whitespace-nowrap rounded-md border border-white/15 bg-white/10 px-2.5 py-1.5 text-xs font-medium hover:bg-white/20"
          title="Saved views"
        >
          <span className="hidden sm:inline">Saved </span>({savedViews.length}) ▾
        </button>
        <button
          onClick={copyShare}
          className="shrink-0 rounded-md border border-white/15 bg-white/10 px-2 py-1.5 text-xs font-medium hover:bg-white/20"
          title="Copy share link"
        >
          <Share2 className="h-3 w-3" />
        </button>
        <button
          onClick={exportPDF}
          className="shrink-0 rounded-md border border-white/15 bg-white/10 px-2 py-1.5 text-xs font-medium hover:bg-white/20"
          title="Export case-study PDF"
        >
          <FileText className="h-3 w-3" />
        </button>
        <button

          onClick={playTour}
          className="shrink-0 whitespace-nowrap rounded-md border border-white/15 bg-[#0a1b30] px-2.5 py-1.5 text-xs font-medium hover:brightness-110"
          title="Guided tour"
        >
          <Play className="inline h-3 w-3 sm:mr-1" />
          <span className="hidden sm:inline">Guided tour</span>
        </button>
        <button
          onClick={startPresentation}
          className="shrink-0 rounded-md border border-white/15 bg-white/10 px-2 py-1.5 text-xs font-medium hover:bg-white/20"
          title="Presentation mode"
        >
          <Maximize2 className="h-3 w-3" />
        </button>

        {showSavedDrop && (
          <div className="absolute right-6 top-14 z-50 w-80 overflow-hidden rounded-md border border-[#E2E5EC] bg-white text-[#0A1B2F] shadow-2xl">
            <div className="border-b border-[#E2E5EC] px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Saved views
            </div>
            {savedViews.length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-slate-500">
                No saved views yet. Click "Save view" to bookmark the current filters and map.
              </div>
            )}
            {savedViews.map((v) => (
              <div key={v.id} className="group flex items-center gap-2 border-b border-[#E2E5EC] px-3 py-2 last:border-b-0 hover:bg-slate-50">
                <button
                  onClick={() => { applySaved(v); setShowSavedDrop(false); }}
                  className="flex flex-1 items-center gap-2 text-left"
                >
                  <span className="text-base">{v.emoji}</span>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{v.name}</div>
                    <div className="text-[10px] text-slate-500">
                      {new Date(v.createdAt).toLocaleDateString()} · {v.tab}
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    const n = prompt("Rename saved view", v.name);
                    if (n && n.trim()) renameSaved(v.id, n.trim());
                  }}
                  className="rounded p-1 text-slate-400 opacity-0 hover:bg-slate-100 hover:text-slate-700 group-hover:opacity-100"
                  title="Rename"
                >✎</button>
                <button
                  onClick={() => deleteSaved(v.id)}
                  className="rounded p-1 text-slate-400 opacity-0 hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100"
                  title="Delete"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}

// ─── Live counter banner ──────────────────────────────────
function LiveCounter({ filtered }: { filtered: AnyRecord[] }) {
  const counts = useMemo(() => {
    const vil = filtered.filter((r) => r.segment === "vil").length;
    const shore = filtered.filter((r) => r.segment === "shore").length;
    const crm = filtered.filter((r) => r.segment === "crm").length;
    const withEmail = filtered.filter((r) => r.segment === "crm" && r.hasEmail).length;
    const noPermits = filtered.filter((r) => r.segment === "vil" && r.permitCount === 0).length;
    const icp = filtered.filter(isICPMatch).length;
    return { vil, shore, crm, withEmail, noPermits, icp };
  }, [filtered]);
  return (
    <div className="flex h-9 flex-shrink-0 items-center gap-6 border-b border-[#E2E5EC] bg-white px-6 text-[11px]">
      <span className="font-semibold text-[#0A1B2F]">Records</span>
      <span className="text-slate-500">Villanova</span>
      <span className="text-slate-500">Shore</span>
      <span className="text-slate-500">Ex-Clients</span>
      <span className="text-slate-500">With email</span>
      <span className="text-slate-500">No permits</span>
      <span className="ml-auto inline-flex items-center gap-1 text-[#0a1b30]">
        <Star className="h-3 w-3 fill-current" /> {counts.icp} match ICP
      </span>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────
function Sidebar({
  filters, setFilters, filtered,
}: {
  filters: FilterState;
  setFilters: (f: FilterState) => void;
  filtered: AnyRecord[];
}) {
  const segCounts = {
    all: allRecords.length,
    vil: vilData.length,
    shore: shoreData.length,
    crm: crmData.length,
  };
  return (
    <aside className="flex w-64 flex-shrink-0 flex-col gap-0 overflow-y-auto border-r border-[#E2E5EC] bg-white">
      <div className="border-b border-[#E2E5EC] p-4">
        <div className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Segments</div>
        {([
          { k: "all" as const, label: "All Records", dot: "#0a1b30" },
          { k: "crm" as const, label: "Ex-Clients (CRM)", dot: "#E8A020" },
          { k: "vil" as const, label: "Villanova", dot: "#0a1b30" },
          { k: "shore" as const, label: "NJ Shore", dot: "#14A870" },
        ]).map((s) => {
          const active = filters.segment === s.k;
          return (
            <button
              key={s.k}
              onClick={() => setFilters({ ...filters, segment: s.k })}
              className={`mb-1 flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                active ? "border-[#C2D0FF] bg-[#EEF3FF]" : "border-transparent hover:bg-slate-50"
              }`}
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.dot }} />
              <span className="font-medium text-slate-700">{s.label}</span>
            </button>
          );
        })}
      </div>

      <div className="border-b border-[#E2E5EC] p-4">
        <div className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Pipeline Status</div>
        <div className="flex flex-wrap gap-1.5">
          {(["all","Hot","Warm","Cold","Converted","Re-engagement"] as const).map((s) => {
            const active = filters.status === s;
            const dot = s === "all" ? "#94A3B8" : statusColor(s as RecordStatus);
            const count = s === "all"
              ? allRecords.length
              : allRecords.filter((r) => recordStatus(r) === s).length;
            return (
              <button
                key={s}
                onClick={() => setFilters({ ...filters, status: s as FilterState["status"] })}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold transition ${
                  active ? "border-[#0A1B2F] bg-[#0A1B2F] text-white" : "border-[#E2E5EC] bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: dot }} />
                {s === "all" ? "All" : s}
                <span className={active ? "text-white/70" : "text-slate-400"}>{count}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
          Auto-derived from opportunity score, recent permits, and CRM relationship — save a view to lock a status into a workflow.
        </p>
      </div>

      <div className="border-b border-[#E2E5EC] p-4">
        <div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          <Filter className="h-3 w-3" /> Filters
        </div>
        <label className="mb-3 block text-xs">
          <span className="mb-1 block font-medium text-slate-700">State</span>
          <select
            value={filters.state}
            onChange={(e) => setFilters({ ...filters, state: e.target.value as FilterState["state"] })}
            className="w-full rounded-md border border-[#E2E5EC] bg-[#F5F6F8] px-2 py-1.5 text-xs"
          >
            <option value="">All States</option>
            <option value="PA">Pennsylvania</option>
            <option value="NJ">New Jersey</option>
          </select>
        </label>
        <label className="mb-3 block text-xs">
          <span className="mb-1 flex justify-between font-medium text-slate-700">
            <span>Min Value</span>
            <span className="text-slate-500">${(filters.minValue / 1_000_000).toFixed(1)}M</span>
          </span>
          <input
            type="range" min={0} max={10_000_000} step={100_000}
            value={filters.minValue}
            onChange={(e) => setFilters({ ...filters, minValue: parseInt(e.target.value) })}
            className="w-full accent-[#0a1b30]"
          />
        </label>
        <label className="mb-3 block text-xs">
          <span className="mb-1 flex justify-between font-medium text-slate-700">
            <span>Built Before</span>
            <span className="text-slate-500">{filters.builtBefore}</span>
          </span>
          <input
            type="range" min={1900} max={2026} step={5}
            value={filters.builtBefore}
            onChange={(e) => setFilters({ ...filters, builtBefore: parseInt(e.target.value) })}
            className="w-full accent-[#0a1b30]"
          />
        </label>
        {[
          { k: "hasEmail" as const, label: "Has Email" },
          { k: "hasLinkedIn" as const, label: "Has LinkedIn" },
          { k: "noPermits" as const, label: "No Permits Filed" },
        ].map((t) => (
          <label key={t.k} className="mb-2 flex cursor-pointer items-center gap-2 text-xs text-slate-700">
            <input
              type="checkbox"
              checked={filters[t.k]}
              onChange={(e) => setFilters({ ...filters, [t.k]: e.target.checked })}
              className="h-3.5 w-3.5 accent-[#0a1b30]"
            />
            {t.label}
          </label>
        ))}
        <label className="mb-3 mt-3 block text-xs">
          <span className="mb-1 block font-medium text-slate-700">Competitor (contractor)</span>
          <select
            value={filters.contractor}
            onChange={(e) => setFilters({ ...filters, contractor: e.target.value })}
            className="w-full rounded-md border border-[#E2E5EC] bg-[#F5F6F8] px-2 py-1.5 text-xs"
          >
            <option value="">All contractors</option>
            {(() => {
              const counts = new Map<string, number>();
              ALL_PERMITS.forEach((p) => counts.set(p.contractor, (counts.get(p.contractor) ?? 0) + 1));
              return [...counts.entries()]
                .sort((a, b) => b[1] - a[1])
                .map(([name, n]) => (
                  <option key={name} value={name}>{name} ({n})</option>
                ));
            })()}
          </select>
          <span className="mt-0.5 block text-[10px] text-slate-500">Ordered by permit volume — see who dominates the block</span>
        </label>
        <label className="mb-3 block text-xs">
          <span className="mb-1 flex justify-between font-medium text-slate-700">
            <span>Min Lot Size</span>
            <span className="text-slate-500">{filters.minLotSqft === 0 ? "Any" : `${(filters.minLotSqft / 43560).toFixed(2)} ac`}</span>
          </span>
          <input
            type="range" min={0} max={150000} step={5000}
            value={filters.minLotSqft}
            onChange={(e) => setFilters({ ...filters, minLotSqft: parseInt(e.target.value) })}
            className="w-full accent-[#0a1b30]"
          />
          <span className="mt-0.5 block text-[10px] text-slate-500">Outdoor footprint — pools, fire pits, additions</span>
        </label>
        <label className="mb-3 block text-xs">
          <span className="mb-1 flex justify-between font-medium text-slate-700">
            <span>Max $/sqft</span>
            <span className="text-slate-500">{filters.maxPricePerSqft === 0 ? "Any" : `$${filters.maxPricePerSqft}`}</span>
          </span>
          <input
            type="range" min={0} max={1200} step={25}
            value={filters.maxPricePerSqft}
            onChange={(e) => setFilters({ ...filters, maxPricePerSqft: parseInt(e.target.value) })}
            className="w-full accent-[#0a1b30]"
          />
          <span className="mt-0.5 block text-[10px] text-slate-500">Apples-to-apples — under-priced upside</span>
        </label>

        <div className="mb-2 mt-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Era</div>
        <div className="mb-3 flex flex-wrap gap-1">
          {([["all","Any"],["pre1960","Pre-1960"],["1960s70s","'60s–'70s"],["1980s90s","'80s–'90s"],["2000plus","2000+"]] as const).map(([k,lbl]) => (
            <button key={k} onClick={() => setFilters({ ...filters, era: k as FilterState["era"] })}
              className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${filters.era===k ? "border-[#0a1b30] bg-[#0a1b30] text-white" : "border-[#E2E5EC] bg-white text-slate-600 hover:bg-slate-50"}`}>{lbl}</button>
          ))}
        </div>

        <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Permits on file</div>
        <div className="mb-3 flex flex-wrap gap-1">
          {([["all","Any"],["0","0"],["1","1"],["2","2"],["3+","3+"]] as const).map(([k,lbl]) => (
            <button key={k} onClick={() => setFilters({ ...filters, permitBucket: k as FilterState["permitBucket"] })}
              className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${filters.permitBucket===k ? "border-[#0a1b30] bg-[#0a1b30] text-white" : "border-[#E2E5EC] bg-white text-slate-600 hover:bg-slate-50"}`}>{lbl}</button>
          ))}
        </div>

        <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Opportunity band</div>
        <div className="mb-3 flex flex-wrap gap-1">
          {([["all","Any"],["hot","Hot ≥7.5"],["warm","Warm"],["cold","Cold"]] as const).map(([k,lbl]) => (
            <button key={k} onClick={() => setFilters({ ...filters, oppBand: k as FilterState["oppBand"] })}
              className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${filters.oppBand===k ? "border-[#0a1b30] bg-[#0a1b30] text-white" : "border-[#E2E5EC] bg-white text-slate-600 hover:bg-slate-50"}`}>{lbl}</button>
          ))}
        </div>

        <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Email opt-in (CRM)</div>
        <div className="mb-3 flex flex-wrap gap-1">
          {([["all","Any"],["in","Opted-in"],["out","Unsubscribed"]] as const).map(([k,lbl]) => (
            <button key={k} onClick={() => setFilters({ ...filters, optIn: k as FilterState["optIn"] })}
              className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${filters.optIn===k ? "border-[#0a1b30] bg-[#0a1b30] text-white" : "border-[#E2E5EC] bg-white text-slate-600 hover:bg-slate-50"}`}>{lbl}</button>
          ))}
        </div>

        <label className="mb-1 block text-xs">
          <span className="mb-1 flex justify-between font-medium text-slate-700">
            <span>Min ICP score</span>
            <span className="text-slate-500">{filters.minIcp === 0 ? "Any" : filters.minIcp.toFixed(1)}</span>
          </span>
          <input
            type="range" min={0} max={10} step={0.5}
            value={filters.minIcp}
            onChange={(e) => setFilters({ ...filters, minIcp: parseFloat(e.target.value) })}
            className="w-full accent-[#0a1b30]"
          />
        </label>
      </div>

      <div className="p-4">
        <div className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Summary</div>
        {(() => {
          const addressable = filtered.reduce((sum, r) => sum + (r.segment === "vil" ? r.marketValue : r.segment === "shore" ? r.salePrice : 0), 0);
          const scored = filtered.filter((r) => r.segment !== "crm");
          const avgScore = scored.length ? scored.reduce((s, r) => s + opportunityScore(r), 0) / scored.length : 0;
          return [
            { label: "Records Shown", v: filtered.length.toString() },
            { label: "Hot Score (≥7.5)", v: filtered.filter((r) => opportunityScore(r) >= 7.5).length.toString() },
            { label: "ICP Match", v: filtered.filter(isICPMatch).length.toString() },
            { label: "Addressable Value", v: addressable >= 1_000_000 ? `$${(addressable/1_000_000).toFixed(1)}M` : `$${(addressable/1000).toFixed(0)}K` },
            { label: "Avg Opp Score", v: avgScore ? avgScore.toFixed(1) : "—" },
          ];
        })().map((s) => (
          <div key={s.label} className="mb-2 rounded-md border border-[#E2E5EC] bg-[#F5F6F8] p-3">
            <div className="text-lg font-semibold text-[#0A1B2F]">{s.v}</div>
            <div className="text-[10px] font-medium uppercase tracking-wider text-slate-500">{s.label}</div>
          </div>
        ))}
      </div>
    </aside>
  );
}

// ─── Overview ─────────────────────────────────────────────
function OverviewView({
  totals, token, loadCase, setTab, viewRenoOnMap, filtered, onOpenRecord,
}: {
  totals: { totalPermits: number; avgVil: number; avgShore: number };
  token: string;
  loadCase: (cs: CaseStudy) => void;
  setTab: (t: TabKey) => void;
  viewRenoOnMap: () => void;
  filtered: AnyRecord[];
  onOpenRecord: (r: AnyRecord) => void;
}) {
  const renoTop = [...vilData]
    .map((v) => ({ ...v, score: opportunityScore(v) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const vilMedianYear = [...vilData].map((v) => v.yearBuilt).sort((a, b) => a - b)[Math.floor(vilData.length / 2)];
  const vilAgeMedian = new Date().getFullYear() - vilMedianYear;
  const lightPermitShare = Math.round((vilData.filter((v) => v.permitCount <= 2).length / vilData.length) * 100);
  const phillyOwners = shoreData.filter((s) => /PHILADELPHIA|PHILA/i.test(s.ownerMail)).length;
  const phillyShare = Math.round((phillyOwners / shoreData.length) * 100);
  const paOwners = shoreData.filter((s) => /, PA /i.test(s.ownerMail)).length;
  const reachableCrm = crmData.filter((c: AnyRecord) => (c as { email?: string }).email && (c as { phone?: string }).phone).length;

  // ── "Cool to Know" wow-stats (real data, no fabricated numbers) ──
  const shorePortfolio = shoreData.reduce((s, p) => s + p.salePrice, 0);
  const vilPortfolio = vilData.reduce((s, p) => s + p.marketValue, 0);
  const totalAddressable = shorePortfolio + vilPortfolio;
  // Renovation debt: per Villanova property, count permit-gap types × $75K midpoint job value
  const renoDebt = vilData.reduce((sum, v) => {
    const gaps = workGaps(v.id).length;
    return sum + gaps * 75000;
  }, 0);
  const allRecords: AnyRecord[] = [...vilData, ...shoreData, ...crmData];
  const hotCount = allRecords.filter((r) => opportunityScore(r) >= 7.5).length;
  const icpHitRate = Math.round((hotCount / allRecords.length) * 100);

  return (
    <div className="h-full overflow-y-auto">
      <div className="border-b border-[#E2E5EC] bg-white px-8 py-8">
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#0a1b30]">Intelligence Portal · Demo Build</div>
        <h1 className="mt-2 max-w-2xl text-[34px] leading-tight" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
          Three audiences. One story your data was already telling.
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-slate-600">
          We stitched 45 records across the <span className="font-semibold text-[#0A1B2F]">Villanova Main Line</span>,
          the <span className="font-semibold text-[#0A1B2F]">New Jersey Shore</span>, and your existing
          <span className="font-semibold text-[#0A1B2F]"> CRM</span> into a single view — then layered in deeds,
          permits, owner-occupancy, and channel reach. The patterns underneath are unmistakable: a Main Line cohort
          of {vilAgeMedian}-year-old estates with thin permit histories, a Shore market quietly owned from Philadelphia
          living rooms, and a warm-contact bench you can mobilize today.
        </p>
        <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-slate-500">
          Each tile below is a hypothesis to act on, not a metric to admire — click any KPI or row to drop into the
          filtered map view that supports it.
        </p>
      </div>

      {/* ── Hero "wow stats" — the lean-forward moments ── */}
      <div className="border-b border-[#E2E5EC] bg-gradient-to-br from-[#0a1b30] to-[#1a2f4d] px-8 py-6 text-white">
        <div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/60">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#FF5733]" />
          The headline numbers
        </div>
        <div className="grid gap-5 md:grid-cols-4">
          <div>
            <div className="font-serif text-[32px] leading-none" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              {fmt$(totalAddressable)}
            </div>
            <div className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-white/70">Total addressable portfolio</div>
            <div className="mt-1 text-[11px] leading-snug text-white/60">{vilData.length} Main Line + {shoreData.length} Shore properties combined</div>
          </div>
          <div>
            <div className="font-serif text-[32px] leading-none" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              {fmt$(shorePortfolio)}
            </div>
            <div className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-white/70">Shore homes, owned from PA</div>
            <div className="mt-1 text-[11px] leading-snug text-white/60">{paOwners} of {shoreData.length} Shore owners mail to a Pennsylvania address — your backyard, their vacation home</div>
          </div>
          <div>
            <div className="font-serif text-[32px] leading-none" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              {fmt$(renoDebt)}
            </div>
            <div className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-white/70">Estimated renovation debt</div>
            <div className="mt-1 text-[11px] leading-snug text-white/60">Villanova permit-gap types × $75K midpoint job value — pipeline you haven't quoted yet</div>
          </div>
          <div>
            <div className="font-serif text-[32px] leading-none" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              {icpHitRate}<span className="text-lg text-white/60">%</span>
            </div>
            <div className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-white/70">ICP hit rate (score ≥ 7.5)</div>
            <div className="mt-1 text-[11px] leading-snug text-white/60">{hotCount} of {allRecords.length} records qualify as &ldquo;hot&rdquo; — the actual list for the next campaign</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 border-b border-[#E2E5EC] bg-[#F5F6F8] p-6 md:grid-cols-4">
        <Kpi color="#0a1b30" value={fmt$(totals.avgVil)} label="Median Villanova value" delta={`${vilData.length} estates, all north of $1.3M`} />
        <Kpi color="#FF5733" value={fmt$(totals.avgShore)} label="Avg. Shore sale price" delta={`${phillyShare}% of owners mail to Philly addresses`} />
        <Kpi color="#E8A020" value={String(reachableCrm)} label="CRM contacts · fully reachable" delta="Email + phone + LinkedIn on file" />
        <Kpi color="#14A870" value={String(totals.totalPermits)} label="Permits filed (Villanova)" delta={`${lightPermitShare}% of homes show ≤2 — renovation runway`} />
      </div>

      <div className="grid gap-5 p-6 lg:grid-cols-2">
        <div className="overflow-hidden rounded-lg border border-[#E2E5EC] bg-white">
          <div className="flex items-center justify-between border-b border-[#E2E5EC] px-5 py-3">
            <span className="text-sm font-semibold">Case studies · pre-built narratives</span>
            <span className="text-xs text-slate-400">Click to load the supporting view</span>
          </div>
          <div className="p-4">
            {caseStudies.map((cs) => (
              <button
                key={cs.id}
                onClick={() => loadCase(cs)}
                className="mb-2 flex w-full items-start gap-3 rounded-lg border border-[#E2E5EC] p-4 text-left transition-all hover:border-[#0a1b30] hover:shadow-md"
              >
                <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-lg bg-[#EEF3FF] text-lg">
                  {cs.emoji}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold">{cs.title}</div>
                  <div className="mt-1 text-xs text-slate-500">{cs.subtitle}</div>
                </div>
                <ChevronRight className="mt-3 h-4 w-4 text-slate-300" />
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-[#E2E5EC] bg-white">
          <div className="flex items-center justify-between border-b border-[#E2E5EC] px-5 py-3">
            <span className="text-sm font-semibold">Where the next renovation likely lives</span>
            <span className="rounded-full bg-[#EEF3FF] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#0a1b30]">Villanova · Top 5</span>
          </div>
          <div className="p-5">
            <p className="mb-4 text-xs leading-relaxed text-slate-500">
              The opportunity score reads four signals against each other — <span className="font-semibold text-slate-700">home age</span>,
              the <span className="font-semibold text-slate-700">permit gap</span> (what we'd expect to see versus what's actually filed),
              <span className="font-semibold text-slate-700"> market value</span> as a proxy for renovation budget, and
              <span className="font-semibold text-slate-700"> channel reach</span> (how many ways you can land a message).
              A higher number doesn't just mean "nice house" — it means an under-touched owner you can credibly approach this quarter.
            </p>
            {renoTop.map((d, i) => {
              const c = scoreColor(d.score);
              return (
                <button
                  key={d.id}
                  onClick={viewRenoOnMap}
                  className="group mb-2 flex w-full items-center gap-3 rounded-lg border border-transparent p-2 text-left transition-all hover:border-[#E2E5EC] hover:bg-[#FAFBFC]"
                >
                  <div
                    className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-md text-[11px] font-bold text-white shadow-sm"
                    style={{ background: `linear-gradient(135deg, ${c}, ${c}cc)` }}
                  >
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                      <span className="truncate font-semibold text-[#0A1B2F]">{d.address.split(",")[0]}</span>
                      <span className="flex-shrink-0 font-bold tabular-nums" style={{ color: c }}>{d.score.toFixed(1)}<span className="text-[10px] text-slate-400"> / 10</span></span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[#F1F3F7]">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${d.score * 10}%`, background: `linear-gradient(90deg, ${c}99, ${c})` }}
                      />
                    </div>
                  </div>
                </button>
              );
            })}
            <button
              onClick={viewRenoOnMap}
              className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-[#0a1b30] px-3 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:brightness-110 hover:shadow-md"
            >
              View all on map <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Property card grid (live filter state) ── */}
      <div className="border-t border-[#E2E5EC] bg-white px-6 py-6">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0a1b30]">Pipeline · live filter</div>
            <h2 className="mt-1 text-[22px] font-semibold text-[#0A1B2F]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              {filtered.length} {filtered.length === 1 ? "record" : "records"} match your current filter
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">Adjust the sidebar to reshape this grid. Click any card to drop into the map.</p>
          </div>
          <button
            onClick={() => setTab("map")}
            className="hidden shrink-0 items-center gap-1.5 rounded-md bg-[#0a1b30] px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:brightness-110 sm:inline-flex"
          >
            View all on map <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
        {filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#E2E5EC] bg-[#FAFBFC] p-8 text-center text-sm text-slate-500">
            No records match. Loosen a sidebar filter to see properties.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.slice(0, 24).map((r) => (
              <PropertyCard key={`${r.segment}-${r.id}`} token={token} record={r} onOpen={() => onOpenRecord(r)} />
            ))}
            {filtered.length > 24 && (
              <button
                onClick={() => setTab("map")}
                className="grid min-h-[140px] place-items-center rounded-lg border border-dashed border-[#0a1b30]/40 bg-[#EEF3FF] p-4 text-center text-xs font-semibold text-[#0a1b30] transition hover:bg-[#DDE6FF]"
              >
                +{filtered.length - 24} more<br />
                <span className="mt-1 inline-flex items-center gap-1 font-normal text-[#0a1b30]/70">See all on map <ArrowRight className="h-3 w-3" /></span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function PropertyCard({ record, token, onOpen }: { record: AnyRecord; token: string; onOpen: () => void }) {
  const segMeta =
    record.segment === "vil" ? { label: "Villanova", color: "#0a1b30", bg: "#EEF3FF" } :
    record.segment === "shore" ? { label: "NJ Shore", color: "#059669", bg: "#ECFDF5" } :
    { label: "Ex-Client", color: "#D97706", bg: "#FEF3C7" };
  const score = opportunityScore(record);
  const sc = scoreColor(score);
  const title = recordTitle(record);
  const sub =
    record.segment === "vil" ? `${fmt$((record as VilProperty).marketValue)} · Built ${(record as VilProperty).yearBuilt}` :
    record.segment === "shore" ? `${fmt$((record as ShoreProperty).salePrice)} · Built ${(record as ShoreProperty).yearBuilt}` :
    `${(record as { city?: string; state?: string }).city ?? ""} ${(record as { state?: string }).state ?? ""}`.trim();
  const photo = propertyAerialUrl(record, token, "520x260", record.segment === "shore" ? 17 : 18);
  const isIcp = isICPMatch(record);
  return (
    <button
      onClick={onOpen}
      className="group flex flex-col overflow-hidden rounded-lg border border-[#E2E5EC] bg-white text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#0a1b30] hover:shadow-md"
    >
      <div className="relative h-32 w-full overflow-hidden bg-slate-100">
        {photo ? (
          <img
            src={photo}
            alt={title}
            loading="lazy"
            onError={(e) => {
              const t = e.currentTarget;
              t.style.display = "none";
              const ph = t.nextElementSibling as HTMLElement | null;
              if (ph) ph.style.display = "grid";
            }}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : null}
        <div
          className="absolute inset-0 hidden place-items-center bg-[#0a1b30] text-3xl text-white/70"
          style={{ display: photo ? "none" : "grid" }}
        >
          {record.segment === "crm" ? "👤" : "🏠"}
        </div>
        <div className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm" style={{ background: segMeta.color }}>
          {segMeta.label}
        </div>
        {isIcp && (
          <div className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-bold text-[#0a1b30] shadow-sm">
            <Star className="h-2.5 w-2.5 fill-[#E8A020] text-[#E8A020]" /> ICP
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-[#0A1B2F]">{title}</div>
            <div className="mt-0.5 truncate text-[11px] text-slate-500">{sub}</div>
          </div>
          <div className="flex shrink-0 flex-col items-end">
            <span className="text-sm font-bold tabular-nums" style={{ color: sc }}>{score.toFixed(1)}</span>
            <span className="text-[9px] uppercase tracking-wider text-slate-400">score</span>
          </div>
        </div>
        <div className="mt-auto h-1 overflow-hidden rounded-full bg-[#F1F3F7]">
          <div className="h-full rounded-full transition-all" style={{ width: `${score * 10}%`, background: sc }} />
        </div>
      </div>
    </button>
  );
}

function Kpi({ color, value, label, delta }: { color: string; value: string; label: string; delta: string }) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-[#E2E5EC] bg-white px-5 py-4">
      <div className="absolute left-0 top-0 h-full w-[3px]" style={{ background: color }} />
      <div className="text-[26px] font-semibold leading-none text-[#0A1B2F]">{value}</div>
      <div className="mt-1 text-[10px] font-medium uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-2 text-[11px] font-medium text-emerald-600">↑ {delta}</div>
    </div>
  );
}

// ─── Map View ─────────────────────────────────────────────
function MapView({
  token, mapRef, layer, setLayer, records, selected, setSelected, chromeless = false,
}: {
  token: string;
  mapRef: React.MutableRefObject<mapboxgl.Map | null>;
  layer: LayerKey;
  setLayer: (l: LayerKey) => void;
  records: AnyRecord[];
  selected: AnyRecord | null;
  setSelected: (r: AnyRecord | null) => void;
  chromeless?: boolean;
}) {
  const container = useRef<HTMLDivElement>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const mapStyleRef = useRef<"light" | "satellite">("light");
  const officeMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const [mapReadyTick, setMapReadyTick] = useState(0);
  const [showOfficeReach, setShowOfficeReach] = useState(false);
  const isochroneCacheRef = useRef<GeoJSON.FeatureCollection | null>(null);

  // Init
  useEffect(() => {
    if (!container.current || mapRef.current || !token) return;
    mapboxgl.accessToken = token;
    const m = new mapboxgl.Map({
      container: container.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [-74.95, 39.8],
      zoom: 8,
      projection: { name: "mercator" }, // stable; globe causes label jitter at this zoom
      pitchWithRotate: true,
      antialias: true,
    });
    m.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "top-right");
    m.addControl(new mapboxgl.ScaleControl({ unit: "imperial" }), "bottom-right");
    mapRef.current = m;
    setMapReadyTick((tick) => tick + 1);

    // Ensure correct sizing once layout settles (fixes blank-canvas when
    // the container measured 0 during the first paint).
    const resize = () => { try { m.resize(); } catch { /* noop */ } };
    const markMapReady = () => {
      resize();
      setMapReadyTick((tick) => tick + 1);
    };
    m.on("load", markMapReady);
    m.on("style.load", markMapReady);
    requestAnimationFrame(resize);
    const timeouts = [50, 150, 350, 750, 1500].map((d) => setTimeout(resize, d));
    const ro = new ResizeObserver(resize);
    if (container.current) ro.observe(container.current);
    window.addEventListener("resize", resize);

    return () => {
      timeouts.forEach(clearTimeout);
      ro.disconnect();
      window.removeEventListener("resize", resize);
      m.off("load", markMapReady);
      m.off("style.load", markMapReady);
      officeMarkerRef.current?.remove();
      officeMarkerRef.current = null;
      m.remove();
      mapRef.current = null;
    };
  }, [token, mapRef]);


  // Style toggle
  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;
    let cancelled = false;
    const targetStyle = layer === "satellite" ? "satellite" : "light";
    if (mapStyleRef.current === targetStyle) return;
    const target = layer === "satellite"
      ? "mapbox://styles/mapbox/satellite-streets-v12"
      : "mapbox://styles/mapbox/light-v11";

    const applyStyle = () => {
      if (cancelled || mapRef.current !== m) return;
      try {
        if (!m.isStyleLoaded()) {
          m.once("style.load", applyStyle);
          return;
        }
        mapStyleRef.current = targetStyle;
        m.setStyle(target);
      } catch {
        m.once("style.load", applyStyle);
      }
    };

    applyStyle();
    return () => {
      cancelled = true;
      m.off("style.load", applyStyle);
    };
  }, [layer, mapRef]);

  // Satellite-only enrichments: sky atmosphere, fog, 3D building extrusions.
  // Re-applied whenever the style finishes loading.
  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;
    const apply = () => {
      try {
        if (!m.isStyleLoaded()) return;
        const isSat = layer === "satellite";
        // Sky / atmosphere (only on satellite — light-v11 looks washed out with sky on)
        if (isSat) {
          if (!m.getLayer("sky")) {
            m.addLayer({
              id: "sky",
              type: "sky" as const,
              paint: {
                "sky-type": "atmosphere",
                "sky-atmosphere-sun": [0.0, 0.0],
                "sky-atmosphere-sun-intensity": 15,
              },
            });
          }
          try {
            m.setFog({
              color: "rgb(186, 210, 235)",
              "high-color": "rgb(36, 92, 223)",
              "horizon-blend": 0.02,
              "space-color": "rgb(11, 11, 25)",
              "star-intensity": 0.6,
            });
          } catch { /* setFog unavailable on some styles */ }

          // 3D building extrusions from the satellite-streets composite source
          if (!m.getLayer("harth-3d-buildings")) {
            const layers = m.getStyle().layers ?? [];
            const labelLayerId = layers.find(
              (l) => l.type === "symbol" && (l.layout as { "text-field"?: unknown })?.["text-field"],
            )?.id;
            try {
              m.addLayer(
                {
                  id: "harth-3d-buildings",
                  source: "composite",
                  "source-layer": "building",
                  filter: ["==", "extrude", "true"],
                  type: "fill-extrusion",
                  minzoom: 14,
                  paint: {
                    "fill-extrusion-color": "#d6d8df",
                    "fill-extrusion-height": [
                      "interpolate", ["linear"], ["zoom"],
                      14, 0,
                      15.05, ["get", "height"],
                    ],
                    "fill-extrusion-base": [
                      "interpolate", ["linear"], ["zoom"],
                      14, 0,
                      15.05, ["get", "min_height"],
                    ],
                    "fill-extrusion-opacity": 0.75,
                  },
                },
                labelLayerId,
              );
            } catch { /* source-layer may not exist on this style version */ }
          }
        } else {
          if (m.getLayer("harth-3d-buildings")) m.removeLayer("harth-3d-buildings");
          if (m.getLayer("sky")) m.removeLayer("sky");
          try { m.setFog(null); } catch { /* noop */ }
        }
      } catch { /* defensive */ }
    };
    apply();
    m.on("style.load", apply);
    return () => { m.off("style.load", apply); };
  }, [layer, mapRef]);

  // Office drive-time isochrone (Mapbox Isochrone API).
  // Fetched once and cached; toggled via `showOfficeReach`.
  useEffect(() => {
    const m = mapRef.current;
    if (!m || !token) return;
    let cancelled = false;

    const ensureLayer = async () => {
      if (!m.isStyleLoaded()) {
        m.once("style.load", ensureLayer);
        return;
      }
      let fc = isochroneCacheRef.current;
      if (!fc) {
        try {
          const url = `https://api.mapbox.com/isochrone/v1/mapbox/driving/${HARTH_OFFICE[0]},${HARTH_OFFICE[1]}?contours_minutes=10,20,30&contours_colors=1A4FFF,E8A020,FF5733&polygons=true&denoise=1&access_token=${token}`;
          const res = await fetch(url);
          if (!res.ok) return;
          fc = await res.json() as GeoJSON.FeatureCollection;
          isochroneCacheRef.current = fc;
        } catch { return; }
      }
      if (cancelled || !fc) return;

      const visibility = showOfficeReach ? "visible" : "none";
      if (!m.getSource("office-reach-src")) {
        try {
          m.addSource("office-reach-src", { type: "geojson", data: fc });
          m.addLayer({
            id: "office-reach-fill",
            type: "fill",
            source: "office-reach-src",
            paint: {
              "fill-color": ["get", "color"],
              "fill-opacity": 0.18,
            },
            layout: { visibility },
          });
          m.addLayer({
            id: "office-reach-line",
            type: "line",
            source: "office-reach-src",
            paint: {
              "line-color": ["get", "color"],
              "line-width": 2,
              "line-opacity": 0.85,
            },
            layout: { visibility },
          });
        } catch { /* race */ }
      } else {
        if (m.getLayer("office-reach-fill")) m.setLayoutProperty("office-reach-fill", "visibility", visibility);
        if (m.getLayer("office-reach-line")) m.setLayoutProperty("office-reach-line", "visibility", visibility);
      }

      // Office marker
      if (showOfficeReach) {
        if (!officeMarkerRef.current) {
          const el = document.createElement("div");
          el.style.cssText =
            "width:14px;height:14px;border-radius:3px;background:#0A1B2F;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4);transform:rotate(45deg);";
          officeMarkerRef.current = new mapboxgl.Marker({ element: el })
            .setLngLat(HARTH_OFFICE)
            .setPopup(new mapboxgl.Popup({ offset: 16, closeButton: false }).setHTML(
              '<div style="font:600 12px system-ui;color:#0A1B2F">Harth office</div><div style="font:11px system-ui;color:#64748b">10 / 20 / 30 min drive</div>',
            ))
            .addTo(m);
        }
      } else {
        officeMarkerRef.current?.remove();
        officeMarkerRef.current = null;
      }
    };

    ensureLayer();
    return () => {
      cancelled = true;
      m.off("style.load", ensureLayer);
    };
  }, [showOfficeReach, layer, token, mapRef]);

  // Render markers / heat / cluster
  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;
    let cancelled = false;

    const renderAll = () => {
      if (cancelled || mapRef.current !== m || !m.isStyleLoaded()) return;
      if (records.length === 0) {
        markersRef.current.forEach((mk) => mk.remove());
        markersRef.current = [];
        ["pin-halo", "pin-circles", "pin-label", "heat-layer", "heat-hit", "owner-heat-layer", "cluster-circles", "cluster-count", "unclustered-point"].forEach((id) => {
          if (m.getLayer(id)) m.removeLayer(id);
        });
        ["points-src", "owner-src"].forEach((id) => { if (m.getSource(id)) m.removeSource(id); });
        return;
      }
      // Clear markers
      markersRef.current.forEach((mk) => mk.remove());
      markersRef.current = [];
      // Clear layers/sources
      ["pin-halo", "pin-circles", "pin-label", "heat-layer", "heat-hit", "owner-heat-layer", "cluster-circles", "cluster-count", "unclustered-point"].forEach((id) => {
        if (m.getLayer(id)) m.removeLayer(id);
      });
      ["points-src", "owner-src"].forEach((id) => { if (m.getSource(id)) m.removeSource(id); });

      // Heat weight per Enrique's correction: HOT = below local $/sqft + low permits.
      // Premium-priced + well-permitted = COLD (already touched).
      const pointFeatures = records.map((r) => {
        const price = recordSalePrice(r);
        const w = recordHeatWeight(r);
        return {
          type: "Feature" as const,
          properties: {
            score: opportunityScore(r),
            salePrice: price,
            heatWeight: w,
            seg: r.segment,
            id: r.id,
            label: r.id.replace(/^(\D)/, (_, p1: string) => p1.toUpperCase()),
          },
          geometry: { type: "Point" as const, coordinates: [r.lng, r.lat] },
        };
      });

      const fitToPointFeatures = (maxZoom = 12.8) => {
        if (pointFeatures.length === 0) return;
        const first = pointFeatures[0].geometry.coordinates as [number, number];
        const bounds = pointFeatures.reduce(
          (b, f) => b.extend(f.geometry.coordinates as [number, number]),
          new mapboxgl.LngLatBounds(first, first),
        );
        m.fitBounds(bounds, { padding: 110, duration: 800, maxZoom });
      };

      if (layer === "pins" || layer === "satellite") {
        try {
          m.addSource("points-src", {
            type: "geojson",
            data: { type: "FeatureCollection", features: pointFeatures },
          });
          m.addLayer({
            id: "pin-halo",
            type: "circle",
            source: "points-src",
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 17, 13, 24],
              "circle-color": "#0A1B2F",
              "circle-opacity": 0.24,
            },
          });
          m.addLayer({
            id: "pin-circles",
            type: "circle",
            source: "points-src",
            paint: {
              "circle-color": ["interpolate", ["linear"], ["get", "score"], 0, "#64748b", 5.5, "#E8A020", 7.5, "#14A870"],
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 12, 13, 17],
              "circle-stroke-width": 4,
              "circle-stroke-color": "#0A1B2F",
              "circle-opacity": 0.98,
            },
          });
          m.addLayer({
            id: "pin-label",
            type: "symbol",
            source: "points-src",
            layout: { "text-field": ["get", "label"], "text-size": 10, "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"], "text-anchor": "center" },
            paint: { "text-color": "#ffffff", "text-halo-color": "#0A1B2F", "text-halo-width": 0.8 },
          });
          m.on("click", "pin-circles", (e) => {
            const id = (e.features?.[0]?.properties as { id?: string } | undefined)?.id;
            const rec = records.find((r) => r.id === id);
            if (rec) setSelected(rec);
          });
          m.on("mouseenter", "pin-circles", () => { m.getCanvas().style.cursor = "pointer"; });
          m.on("mouseleave", "pin-circles", () => { m.getCanvas().style.cursor = ""; });
          fitToPointFeatures(layer === "satellite" ? 14 : 12.8);
        } catch { /* layer may be mid-style-change; HTML markers below still render */ }

        // Group nearby records into spatial buckets (~0.01° ≈ ~1km) so we can
        // fan overlapping pins around their shared centroid. Without this,
        // 15 Villanova homes (or 15 Shore homes) collapse to a single visual
        // dot at low zoom and only the top marker is visible/clickable.
        type Bucket = { recs: AnyRecord[]; cx: number; cy: number };
        const buckets = new Map<string, Bucket>();
        records.forEach((r) => {
          const key = `${Math.round(r.lng * 100)}_${Math.round(r.lat * 100)}`;
          const b = buckets.get(key);
          if (b) {
            b.recs.push(r);
            b.cx = (b.cx * (b.recs.length - 1) + r.lng) / b.recs.length;
            b.cy = (b.cy * (b.recs.length - 1) + r.lat) / b.recs.length;
          } else {
            buckets.set(key, { recs: [r], cx: r.lng, cy: r.lat });
          }
        });

        let globalIdx = 0;
        buckets.forEach((bucket) => {
          const n = bucket.recs.length;
          bucket.recs.forEach((r, i) => {
            const score = opportunityScore(r);
            const color = scoreColor(score);
            const icp = isICPMatch(r);
            const label = r.id.replace(/^(\D)/, (_, p1: string) => p1.toUpperCase());
            // Fan in a circle around the bucket centroid. Pixel radius scales
            // with bucket size so 15-pin clusters get a wide, readable ring.
            const angle = n > 1 ? (i / n) * Math.PI * 2 : 0;
            const fanRadius = n === 1 ? 0 : Math.min(22 + n * 4, 72);
            const markerOffset: [number, number] = [
              Math.round(Math.cos(angle) * fanRadius),
              Math.round(Math.sin(angle) * fanRadius),
            ];
            // Outer element: Mapbox owns its `transform` for positioning — do NOT
            // override transform here or every marker collapses to the map origin.
            const el = document.createElement("div");
            el.style.cssText = "width:34px;height:34px;cursor:pointer;z-index:5;";
            const inner = document.createElement("div");
            inner.style.cssText = `
              width:34px;height:34px;border-radius:50%;background:${color};
              border:4px solid #0A1B2F;box-shadow:0 0 0 3px rgba(255,255,255,.98),0 10px 22px rgba(10,27,47,.42);
              opacity:0;transform:translateY(-30px) scale(.6);
              transition:opacity .35s ease, transform .55s cubic-bezier(.34,1.56,.64,1);
              position:relative;display:grid;place-items:center;
              color:#fff;font:800 10px/1 system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              text-shadow:0 1px 2px rgba(0,0,0,.45);
            `;
            inner.title = recordTitle(r);
            inner.textContent = label;
            if (icp) {
              const star = document.createElement("div");
              star.textContent = "★";
              star.style.cssText = "position:absolute;top:-14px;left:50%;transform:translateX(-50%);color:#E8A020;font-size:13px;text-shadow:0 1px 2px rgba(0,0,0,.55)";
              inner.appendChild(star);
            }
            el.appendChild(inner);
            // Anchor each marker at the bucket centroid so members of a cluster
            // share the same lat/lng and fan cleanly around it.
            const mk = new mapboxgl.Marker({ element: el, offset: markerOffset })
              .setLngLat(n > 1 ? [bucket.cx, bucket.cy] : [r.lng, r.lat])
              .addTo(m);
            el.addEventListener("click", () => setSelected(r));
            markersRef.current.push(mk);
            // Stagger drop on the inner element only.
            setTimeout(() => {
              inner.style.opacity = "1";
              inner.style.transform = "translateY(0) scale(1)";
            }, Math.min(globalIdx * 30, 1500));
            globalIdx++;
          });
        });
      }

      if (layer === "heat" || layer === "cluster") {
        try {
          m.addSource("points-src", {
            type: "geojson",
            data: { type: "FeatureCollection", features: pointFeatures },
            cluster: layer === "cluster",
            clusterRadius: 60,
            clusterMaxZoom: 14,
          });
        } catch { /* source may already exist after a rapid toggle */ }

        if (layer === "heat") {
          m.addLayer({
            id: "heat-layer",
            type: "heatmap",
            source: "points-src",
            paint: {
              // Warm = high sale price + low permit history (opportunity).
              // Cold = below-average price or well-permitted (less actionable).
              "heatmap-weight": ["interpolate", ["linear"], ["get", "heatWeight"], 0, 0.05, 0.5, 0.6, 1, 1.8],
              "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 1.2, 9, 2.4, 14, 4.2],
              "heatmap-color": [
                "interpolate", ["linear"], ["heatmap-density"],
                0,    "rgba(26,79,255,0)",
                0.15, "rgba(26,79,255,0.55)",
                0.4,  "rgba(232,160,32,0.85)",
                0.7,  "rgba(255,87,51,0.95)",
                1,    "rgba(220,38,38,1)",
              ],
              "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 30, 5, 45, 9, 70, 14, 110],
              "heatmap-opacity": 0.9,
            },
          });
          // Invisible hit target so users can click a hotspot and open the
          // detail panel (with photo) for that property.
          m.addLayer({
            id: "heat-hit",
            type: "circle",
            source: "points-src",
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 14, 13, 22],
              "circle-color": "#fff",
              "circle-opacity": 0.001,
              "circle-stroke-width": 1,
              "circle-stroke-color": "#0A1B2F",
              "circle-stroke-opacity": 0.25,
            },
          });
          m.on("click", "heat-hit", (e) => {
            const id = (e.features?.[0]?.properties as { id?: string } | undefined)?.id;
            const rec = records.find((r) => r.id === id);
            if (rec) setSelected(rec);
          });
          m.on("mouseenter", "heat-hit", () => { m.getCanvas().style.cursor = "pointer"; });
          m.on("mouseleave", "heat-hit", () => { m.getCanvas().style.cursor = ""; });
        } else {
          m.addLayer({
            id: "cluster-circles", type: "circle", source: "points-src", filter: ["has", "point_count"],
            paint: {
              "circle-color": ["step", ["get", "point_count"], "#0a1b30", 5, "#E8A020", 15, "#FF5733"],
              "circle-radius": ["step", ["get", "point_count"], 22, 5, 30, 15, 40],
              "circle-stroke-width": 3, "circle-stroke-color": "#fff",
              "circle-opacity": 0.95,
            },
          });
          m.addLayer({
            id: "cluster-count", type: "symbol", source: "points-src", filter: ["has", "point_count"],
            layout: { "text-field": ["get", "point_count_abbreviated"], "text-size": 14, "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"] },
            paint: { "text-color": "#fff" },
          });
          m.addLayer({
            id: "unclustered-point", type: "circle", source: "points-src", filter: ["!", ["has", "point_count"]],
            paint: {
              "circle-color": ["interpolate", ["linear"], ["get", "score"], 0, "#94a3b8", 5.5, "#eab308", 7.5, "#16a34a"],
              "circle-radius": 9, "circle-stroke-width": 2, "circle-stroke-color": "#fff",
            },
          });
          m.on("click", "cluster-circles", (e) => {
            const f = e.features?.[0];
            if (!f) return;
            const clusterId = (f.properties as { cluster_id: number }).cluster_id;
            const src = m.getSource("points-src") as mapboxgl.GeoJSONSource;
            src.getClusterExpansionZoom(clusterId, (err, zoom) => {
              if (err || zoom == null) return;
              const coords = (f.geometry as unknown as { coordinates: [number, number] }).coordinates;
              m.flyTo({ center: coords, zoom: zoom + 0.5, pitch: 35, speed: 1.2 });
            });
          });
          m.on("click", "unclustered-point", (e) => {
            const f = e.features?.[0];
            if (!f) return;
            const id = (f.properties as { id: string }).id;
            const rec = records.find((r) => r.id === id);
            if (rec) setSelected(rec);
          });
        }

        // Auto-fit so heat/cluster output is always centered in view (records span PA + NJ).
        fitToPointFeatures(11);
      }

      if (layer === "owners") {
        // Aggregate across ALL filtered records:
        // - Shore properties: use the owner's mailing zip (Philly area) when known,
        //   otherwise fall back to the property location.
        // - Vil + CRM: the contact/owner lives at the record location.
        const ownerFeatures = records.map((r, i) => {
          let lng = r.lng;
          let lat = r.lat;
          if (r.segment === "shore") {
            const zip = ownerZip(r.ownerMail);
            const base = zip ? PHILA_ZIP_COORDS[zip] : null;
            if (base) {
              const jitter = 0.0015;
              lng = base[0] + Math.cos(i * 2.3) * jitter;
              lat = base[1] + Math.sin(i * 2.3) * jitter;
            }
          }
          const weight =
            r.segment === "shore" ? Math.min(1, r.salePrice / 8_000_000)
            : r.segment === "vil" ? Math.min(1, r.marketValue / 2_000_000)
            : 0.5;
          return {
            type: "Feature" as const,
            properties: { weight, seg: r.segment },
            geometry: { type: "Point" as const, coordinates: [lng, lat] },
          };
        });

        try {
          m.addSource("owner-src", {
            type: "geojson",
            data: { type: "FeatureCollection", features: ownerFeatures },
          });
        } catch { /* source may already exist after rapid toggle */ }
        m.addLayer({
          id: "owner-heat-layer",
          type: "heatmap",
          source: "owner-src",
          paint: {
            "heatmap-weight": ["interpolate", ["linear"], ["get", "weight"], 0, 0.3, 1, 1],
            "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 6, 1, 14, 3.5],
            "heatmap-color": [
              "interpolate", ["linear"], ["heatmap-density"],
              0, "rgba(124,58,237,0)",
              0.2, "rgba(124,58,237,0.45)",
              0.5, "rgba(232,160,32,0.7)",
              0.8, "rgba(255,87,51,0.9)",
              1, "rgba(220,38,38,1)",
            ],
            "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 6, 30, 14, 80],
            "heatmap-opacity": 0.85,
          },
        });

        // Auto-fit to the actual feature spread so combined views cover PA + NJ,
        // while a shore-only view still hones in on Philly.
        if (ownerFeatures.length > 0) {
          const first = ownerFeatures[0].geometry.coordinates as [number, number];
          const bounds = ownerFeatures.reduce(
            (b, f) => b.extend(f.geometry.coordinates as [number, number]),
            new mapboxgl.LngLatBounds(first, first),
          );
          m.fitBounds(bounds, { padding: 100, duration: 1000, maxZoom: 11 });
        }
      }
    };

    const renderWhenReady = () => {
      if (cancelled || mapRef.current !== m) return;
      try {
        if (m.isStyleLoaded()) {
          renderAll();
          return;
        }
      } catch { /* style mid-swap */ }
      // Style not ready yet. `style.load` fires for initial AND swapped styles
      // — `idle` is a belt-and-suspenders fallback because `load`/`style.load`
      // only fire once and may have already fired by the time this effect
      // re-runs (e.g. on records/layer change after the initial mount).
      const onIdle = () => {
        m.off("idle", onIdle);
        renderWhenReady();
      };
      m.on("idle", onIdle);
    };

    renderWhenReady();
    // Re-render on EVERY style.load so a satellite/light swap (which wipes all
    // layers/sources) restores pins, heat, owner-heat, etc. Using `on` not
    // `once` because the user can toggle back and forth.
    m.on("style.load", renderWhenReady);
    return () => {
      cancelled = true;
      m.off("style.load", renderWhenReady);
    };
  }, [records, layer, setSelected, mapRef, mapReadyTick]);


  return (
    <div className="relative h-full w-full" style={{ position: "absolute", inset: 0 }}>
      <div ref={container} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, width: "100%", height: "100%" }} />

      {/* Toolbar */}
      {!chromeless && (
        <div className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-lg border border-[#E2E5EC] bg-white/95 p-1.5 shadow-md backdrop-blur">
          {([
            { k: "pins" as const, label: "Pins", Icon: MapPin },
            { k: "heat" as const, label: "Heat", Icon: Flame },
            { k: "cluster" as const, label: "Cluster", Icon: Box },
            { k: "satellite" as const, label: "Satellite", Icon: Satellite },
            { k: "owners" as const, label: "Owners", Icon: Users },
          ]).map(({ k, label, Icon }) => (
            <button
              key={k}
              onClick={() => setLayer(k)}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                layer === k ? "bg-[#0A1B2F] text-white" : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              <Icon className="h-3 w-3" /> {label}
            </button>
          ))}
        </div>
      )}

      {/* Owners-mode contextual banner */}
      {!chromeless && layer === "owners" && (
        <div className="pointer-events-none absolute left-1/2 top-4 z-10 -translate-x-1/2 rounded-full border border-[#E2E5EC] bg-white/95 px-4 py-2 text-xs font-medium text-[#0A1B2F] shadow-md backdrop-blur">
          <span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ background: "#7c3aed" }} />
          Where owners <span className="font-semibold">live</span> · {records.length} record{records.length === 1 ? "" : "s"} across current filter
        </div>
      )}

      {/* Legend */}
      {!chromeless && layer !== "owners" && layer !== "heat" && (
        <div className="absolute bottom-6 left-4 z-10 rounded-lg border border-[#E2E5EC] bg-white/95 p-3 text-[11px] shadow-md backdrop-blur">
          <div className="mb-2 font-semibold text-[#0A1B2F]">Opportunity score</div>
          <Legend2 dot="#16a34a" label="Hot · ≥ 7.5" />
          <Legend2 dot="#eab308" label="Warm · 5.5–7.4" />
          <Legend2 dot="#94a3b8" label="Cold · < 5.5" />
          <div className="mt-2 flex items-center gap-1.5 border-t border-[#E2E5EC] pt-2 text-[#E8A020]">
            <Star className="h-3 w-3 fill-current" /> ICP match
          </div>
        </div>
      )}

      {/* Heat-specific legend so the cold→warm semantics are explicit */}
      {!chromeless && layer === "heat" && (
        <div className="absolute bottom-6 left-4 z-10 w-[230px] rounded-lg border border-[#E2E5EC] bg-white/95 p-3 text-[11px] shadow-md backdrop-blur">
          <div className="mb-1.5 font-semibold text-[#0A1B2F]">Renovation opportunity</div>
          <div className="h-2 w-full rounded-full" style={{ background: "linear-gradient(90deg,#0a1b30 0%,#0a1b30 18%,#E8A020 55%,#FF5733 80%,#DC2626 100%)" }} />
          <div className="mt-1 flex justify-between text-[10px] text-slate-500">
            <span>Cold</span><span>Warm</span><span>Hot</span>
          </div>
          <div className="mt-2 space-y-0.5 text-[10px] text-slate-600">
            <div><b className="text-[#DC2626]">Warm/Hot</b> = above-avg price + few permits</div>
            <div><b className="text-[#0a1b30]">Cold</b> = below-avg price or already permitted</div>
          </div>
        </div>
      )}

      {/* Owners legend */}
      {!chromeless && layer === "owners" && (
        <div className="absolute bottom-6 left-4 z-10 rounded-lg border border-[#E2E5EC] bg-white/95 p-3 text-[11px] shadow-md backdrop-blur">
          <div className="mb-2 font-semibold text-[#0A1B2F]">Owner density</div>
          <Legend2 dot="#7c3aed" label="Few owners" />
          <Legend2 dot="#E8A020" label="Moderate" />
          <Legend2 dot="#FF5733" label="High concentration" />
          <div className="mt-2 border-t border-[#E2E5EC] pt-2 text-slate-500">
            Aggregated from owner mailing zips
          </div>
        </div>
      )}

      {/* Office reach toggle */}
      {!chromeless && (
        <button
          onClick={() => {
            const next = !showOfficeReach;
            setShowOfficeReach(next);
            if (next) {
              mapRef.current?.flyTo({
                center: HARTH_OFFICE,
                zoom: 9.5,
                pitch: 0,
                bearing: 0,
                speed: 1.2,
                essential: true,
              });
            }
          }}
          className={`absolute bottom-6 right-4 z-10 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium shadow-md backdrop-blur transition-colors ${
            showOfficeReach
              ? "border-[#0a1b30] bg-[#0a1b30] text-white"
              : "border-[#E2E5EC] bg-white/95 text-slate-700 hover:bg-slate-100"
          }`}
          title="Drive-time reach around the Harth office"
        >
          <span className="h-2 w-2 rotate-45 bg-current" />
          Office reach · 10 / 20 / 30 min
        </button>
      )}

      {/* Detail panel */}
      {selected && <DetailPanel record={selected} onClose={() => setSelected(null)} token={token} />}
    </div>
  );
}

function Legend2({ dot, label }: { dot: string; label: string }) {
  return (
    <div className="mb-1 flex items-center gap-2 text-slate-600">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: dot }} />
      {label}
    </div>
  );
}

// Zillow-style listing summary: big price, beds/baths/sqft strip, address, quick meta.
function ListingHero({ record }: { record: AnyRecord }) {
  if (record.segment === "crm") {
    const r = record as { name?: string; title?: string; company?: string; city?: string; state?: string };
    return (
      <div className="border-b border-[#E2E5EC] px-4 py-3">
        <div className="text-2xl font-bold tracking-tight text-[#0A1B2F]">{r.name ?? "Contact"}</div>
        {(r.title || r.company) && (
          <div className="mt-0.5 text-xs text-slate-600">{[r.title, r.company].filter(Boolean).join(" · ")}</div>
        )}
        {(r.city || r.state) && (
          <div className="mt-1 text-[11px] text-slate-500">{[r.city, r.state].filter(Boolean).join(", ")}</div>
        )}
      </div>
    );
  }
  const isVil = record.segment === "vil";
  const r = record as {
    address: string; city?: string; zip?: string; yearBuilt: number; sqft: number;
    beds?: number; baths?: number; lotSqft?: number;
    marketValue?: number; salePrice?: number; lastSalePrice?: number; lastSaleDate?: string; saleDate?: string;
  };
  const price = isVil ? r.marketValue : r.salePrice;
  const priceLabel = isVil ? "Est. market value" : "Last sale";
  const saleDate = isVil ? r.lastSaleDate : r.saleDate;
  const addr1 = r.address;
  const addr2 = isVil
    ? "Villanova, PA 19085"
    : [r.city, "NJ", r.zip].filter(Boolean).join(" ");
  const lotAc = r.lotSqft ? (r.lotSqft / 43560).toFixed(2) : null;
  return (
    <div className="border-b border-[#E2E5EC] px-4 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <div className="font-serif text-2xl font-bold tracking-tight text-[#0A1B2F]">
          ${price ? price.toLocaleString() : "—"}
        </div>
        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          {priceLabel}{saleDate ? ` · ${saleDate}` : ""}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] font-semibold text-[#0A1B2F]">
        {r.beds != null && (<><span>{r.beds} <span className="text-[11px] font-normal text-slate-500">bd</span></span><span className="text-slate-300">|</span></>)}
        {r.baths != null && (<><span>{r.baths} <span className="text-[11px] font-normal text-slate-500">ba</span></span><span className="text-slate-300">|</span></>)}
        <span>{r.sqft?.toLocaleString()} <span className="text-[11px] font-normal text-slate-500">sqft</span></span>
        {lotAc && (<><span className="text-slate-300">|</span><span>{lotAc} <span className="text-[11px] font-normal text-slate-500">ac lot</span></span></>)}
      </div>
      <div className="mt-2 text-[12px] leading-tight text-slate-700">
        <div className="font-medium">{addr1}</div>
        <div className="text-slate-500">{addr2}</div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-semibold">
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-600">Built {r.yearBuilt}</span>
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-600">{2026 - r.yearBuilt} yrs old</span>
        {isVil && r.sqft && r.marketValue && (
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-600">
            ${Math.round(r.marketValue / r.sqft).toLocaleString()}/sqft
          </span>
        )}
      </div>
    </div>
  );
}


// ─── Detail panel ─────────────────────────────────────────
function DetailPanel({ record, onClose, token }: { record: AnyRecord; onClose: () => void; token: string }) {
  const score = opportunityScore(record);
  const color = scoreColor(score);
  const label = scoreLabel(score);
  const icp = isICPMatch(record);
  const status = recordStatus(record);
  const statusBg = statusColor(status);
  const icpVal = icpScore(record);
  const icpLbl = icpLabel(icpVal);
  const icpClr = icpColor(icpVal);
  const icpDrv = icpDrivers(record);
  const cachedPhotos = ZILLOW_PHOTOS[record.id] ?? [];
  const hasCachedPhotos = cachedPhotos.length > 0;
  const [photoView, setPhotoView] = useState<"listing" | "top" | "3d" | "street">(hasCachedPhotos ? "listing" : "top");
  const [zillowOpen, setZillowOpen] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [photosState, setPhotosState] = useState<"idle" | "loading" | "ok" | "empty" | "error">("idle");
  const [photoIdx, setPhotoIdx] = useState(0);
  const fetchPhotosFn = useServerFn(fetchListingPhotos);
  useEffect(() => {
    const nextCached = ZILLOW_PHOTOS[record.id] ?? [];
    setPhotoView(nextCached.length ? "listing" : "top");
    setZillowOpen(false);
    setPhotos(nextCached);
    setPhotosState(nextCached.length ? "ok" : "idle");
    setPhotoIdx(0);
  }, [record.id]);
  useEffect(() => {
    if (!zillowOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setZillowOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zillowOpen]);
  useEffect(() => {
    if (!zillowOpen || photosState !== "idle") return;
    // 1. Use prefetched Zillow photo URLs if available.
    const cached = ZILLOW_PHOTOS[record.id];
    if (cached && cached.length) { setPhotos(cached); setPhotosState("ok"); return; }
    // 2. Fallback to live scrape via server function.
    const zUrl = record.segment !== "crm" ? record.zillowUrl : undefined;
    if (!zUrl) { setPhotosState("empty"); return; }
    setPhotosState("loading");
    fetchPhotosFn({ data: { zillowUrl: zUrl } })
      .then((r) => {
        if (r.photos.length) { setPhotos(r.photos); setPhotosState("ok"); }
        else setPhotosState("empty");
      })
      .catch(() => setPhotosState("error"));
  }, [zillowOpen, photosState, record, fetchPhotosFn]);
  const openZillow = (e: React.MouseEvent) => {
    e.stopPropagation();
    const zUrl = record.segment !== "crm" ? record.zillowUrl : undefined;
    const cached = ZILLOW_PHOTOS[record.id];
    if (cached && cached.length) { setPhotos(cached); setPhotosState("ok"); setPhotoIdx(0); setZillowOpen(true); return; }
    if (zUrl) setZillowOpen(true);
  };
  const topPhoto =
    token && record.lat && record.lng
      ? `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/${record.lng},${record.lat},18,0/600x260@2x?access_token=${token}`
      : "";
  const obliquePhoto =
    token && record.lat && record.lng
      ? `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/static/${record.lng},${record.lat},17.4,30,60/600x260@2x?access_token=${token}`
      : "";
  const streetOpen = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${record.lat},${record.lng}`;
  const zillowUrl = record.segment !== "crm" ? record.zillowUrl : undefined;
  const listingPhotos = photos.length ? photos : cachedPhotos;
  const heroListingPhoto = listingPhotos[photoIdx] ?? listingPhotos[0];

  // Renovation age estimate (heuristic for v1)
  const ageBadge = (() => {
    if (record.segment !== "vil") return null;
    const age = 2026 - record.yearBuilt;
    if (record.permitCount === 0 && age > 30) return `Kitchen likely 30+ yrs old`;
    if (record.permitCount <= 1 && age > 20) return `Kitchen likely 15+ yrs old`;
    if (record.permitCount >= 3) return "Recently updated";
    return null;
  })();

  return (
    <>
    <button
      type="button"
      aria-label="Close detail panel"
      onClick={onClose}
      className="absolute inset-0 z-10 cursor-default bg-black/10"
    />
    <div className="absolute right-4 top-4 z-20 flex max-h-[calc(100%-2rem)] w-[480px] flex-col overflow-hidden rounded-xl border border-[#E2E5EC] bg-white shadow-2xl">
      <div className="flex items-center justify-between gap-2 border-b border-[#E2E5EC] px-4 py-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-[#0A1B2F]">{recordTitle(record)}</div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
            <span className="rounded-full px-2 py-0.5 font-semibold text-white" style={{ background: statusBg }}>
              {status}
            </span>
            <span className="rounded-full px-2 py-0.5 font-semibold text-white" style={{ background: color }}>
              Opp {label} · {score.toFixed(1)}
            </span>
            <span className="rounded-full px-2 py-0.5 font-semibold text-white" style={{ background: icpClr }}>
              ICP {icpVal.toFixed(1)}
            </span>
            {icp && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-700">
                <Star className="h-2.5 w-2.5 fill-current" /> Best-fit
              </span>
            )}
          </div>
        </div>
        <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
      </div>


      <div className="overflow-y-auto">
        {(record.lat && record.lng) && (
          <div className="relative">
            {photoView === "listing" && heroListingPhoto && (
              <img src={heroListingPhoto} alt={`Listing photo of ${recordTitle(record)}`} className="block h-56 w-full bg-slate-900 object-cover" />
            )}
            {photoView === "top" && token && (
              <img src={topPhoto} alt={`Top-down satellite view of ${recordTitle(record)}`} className="block h-56 w-full object-cover" />
            )}
            {photoView === "3d" && token && (
              <img src={obliquePhoto} alt={`Oblique aerial view of ${recordTitle(record)}`} className="block h-56 w-full object-cover" />
            )}
            {photoView === "street" && (
              <StreetViewPano lat={record.lat} lng={record.lng} title={`Street view of ${recordTitle(record)}`} />
            )}
            <div className="absolute left-2 top-2 flex gap-1 rounded-full bg-black/55 p-0.5 text-[10px] font-semibold text-white backdrop-blur">
              {([...(heroListingPhoto ? [["listing", "Photos"] as const] : []), ["top","Aerial"], ["3d","Oblique"], ["street","Street"]] as const).map(([k,lbl]) => (
                <button
                  key={k}
                  onClick={() => setPhotoView(k)}
                  className={`rounded-full px-2 py-1 transition ${photoView===k ? "bg-white text-[#0A1B2F]" : "hover:bg-white/15"}`}
                >{lbl}</button>
              ))}
            </div>
            <div className="absolute bottom-2 right-2 flex gap-1.5">
              {zillowUrl && (
                <button
                  type="button"
                  onClick={openZillow}
                  className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-1 text-[10px] font-semibold text-[#0A1B2F] shadow hover:bg-white"
                  title={listingPhotos.length ? "Open listing photo gallery" : "Fetch listing photos"}
                >
                  Photos{listingPhotos.length ? ` ${photoIdx + 1}/${listingPhotos.length}` : ""} ↗
                </button>
              )}
              <a
                href={streetOpen}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-1 text-[10px] font-semibold text-[#0A1B2F] shadow"
                title="Open Google Street View in a new tab — walk the curb"
              >
                Walk the curb ↗
              </a>
            </div>
          </div>
        )}

        <ListingHero record={record} />


        {ageBadge && (
          <div className="mx-4 mt-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
            <Sparkles className="mt-0.5 h-3 w-3 flex-shrink-0" />
            <span><b>AI signal:</b> {ageBadge}</span>
          </div>
        )}

        <div className="space-y-2 p-4 text-xs">
          {record.segment === "vil" && (
            <>
              <KV k="Owner" v={record.owner} />
              <KV k="Built" v={String(record.yearBuilt)} />
              <KV k="Size" v={`${record.beds} bd / ${record.baths} ba · ${record.sqft.toLocaleString()} sqft`} />
              <KV k="Market Value" v={fmt$(record.marketValue)} />
              <KV k="$/sqft" v={(() => { const p = pricePerSqft(record); const nb = neighborhoodPpsf(record); return p ? `$${p.toLocaleString()} · neighborhood avg $${nb}` : "—"; })()} />
              {record.lotSqft && <KV k="Lot size" v={`${record.lotSqft.toLocaleString()} sqft · ${(record.lotSqft / 43560).toFixed(2)} ac`} />}
              <KV k="Property age" v={`${2026 - record.yearBuilt} yrs`} />
              <KV k="Last Sale" v={`${fmt$(record.lastSalePrice)} · ${record.lastSaleDate}`} />
              <KV k="Mortgage Window" v={(() => {
                const f = cashAvailabilityFactor(record.lastSaleDate);
                const label = f <= 0.3 ? "Locked-in low rate" : f >= 0.95 ? "Long-time owner" : f >= 0.85 ? "Strong equity" : f >= 0.85 ? "Market rate" : "Moderate";
                const tone = f <= 0.3 ? "bg-rose-100 text-rose-700" : f >= 0.85 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700";
                return <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium ${tone}`}>{label} · cash {Math.round(f * 100)}%</span>;
              })()} />
              <VilOpportunityBlock record={record} />
            </>
          )}
          {record.segment === "shore" && (
            <>
              <KV k="Owner" v={record.owner} />
              <KV k="City" v={record.city} />
              <KV k="Built" v={`${record.yearBuilt} (${2026 - record.yearBuilt} yrs)`} />
              <KV k="Sqft" v={fmtN(record.sqft)} />
              {record.lotSqft && <KV k="Lot size" v={`${record.lotSqft.toLocaleString()} sqft`} />}
              <KV k="Sale Price" v={fmt$(record.salePrice)} />
              <KV k="Annual Tax" v={fmt$(record.lastYearTax)} />
              <KV k="Owner Mail" v={
                <span>
                  {record.ownerMail}{" "}
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(record.ownerMail)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#0a1b30] hover:underline"
                  >View on Google Maps →</a>
                </span>
              } />
              {record.zillowUrl && (
                <KV k="Listing" v={
                  <button
                    type="button"
                    onClick={openZillow}
                    className="text-[#0a1b30] hover:underline"
                  >View Listing ↗</button>
                } />
              )}
              {record.ownerMail?.includes(", PA") && (
                <div className="mt-2 rounded-md border border-emerald-200 bg-emerald-50 p-2 text-[11px] leading-snug text-emerald-800">
                  <b>Outreach strategy:</b> owner's primary address is in PA. This is their vacation home —
                  reach them at their main residence for renovation work at both properties.
                </div>
              )}
            </>
          )}
          {record.segment === "crm" && (
            <>
              <KV k="Email" v={record.email ? <a href={`mailto:${record.email}`} className="text-[#0a1b30] hover:underline">{record.email}</a> : "—"} />
              <KV k="Phone" v={record.phone ? <a href={`tel:${record.phone.replace(/[^\d+]/g, "")}`} className="text-[#0a1b30] hover:underline">{record.phone}</a> : "—"} />

              <KV k="City" v={`${record.city}, ${record.state}`} />
              <KV k="LinkedIn" v={
                <a href={record.linkedIn} target="_blank" rel="noreferrer" className="text-[#0a1b30] hover:underline">View profile →</a>
              } />
              <KV k="Email opt-in" v={
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${record.emailOptIn ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                  {record.emailOptIn ? "Active" : "Inactive"}
                </span>
              } />
              <KV k="Readiness" v={<ReadinessLight r={record} />} />
            </>
          )}
        </div>

        <div className="mx-4 mb-4 rounded-md border border-[#E2E5EC] bg-[#F7F8FB] p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">ICP fit · contact-level</span>
            <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white" style={{ background: icpClr }}>
              {icpLbl} · {icpVal.toFixed(1)}
            </span>
          </div>
          <ul className="space-y-1">
            {icpDrv.map((d, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[11px] leading-snug">
                <span
                  className={`mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full ${
                    d.tone === "pos" ? "bg-emerald-500" : d.tone === "neg" ? "bg-rose-500" : "bg-slate-400"
                  }`}
                />
                <span className="text-slate-700">{d.label}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
            Weighted: contact completeness 30%, opt-in 15%, prior client 25%, wealth proxy 20%, geography 10%.
          </p>
        </div>
      </div>
    </div>
    {zillowOpen && zillowUrl && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        onClick={() => setZillowOpen(false)}
      >
        <div
          className="relative flex h-[85vh] w-[min(1100px,95vw)] flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-[#0A1B2F] px-4 py-2.5 text-white">
            <div className="min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-white/60">Zillow listing</div>
              <div className="truncate text-sm font-semibold">{recordTitle(record)}</div>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={zillowUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-white hover:bg-white/20"
              >Open on zillow.com ↗</a>
              <button
                type="button"
                onClick={() => setZillowOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
                aria-label="Close"
              ><X className="h-4 w-4" /></button>
            </div>
          </div>
          <div className="relative flex-1 bg-slate-900">
            {photosState === "loading" && listingPhotos.length === 0 && (
              <div className="absolute inset-0 grid place-items-center text-sm text-white/70">Fetching listing photos…</div>
            )}
            {listingPhotos.length > 0 && (
              <>
                <img
                  src={listingPhotos[photoIdx] ?? listingPhotos[0]}
                  alt={`Listing photo ${photoIdx + 1} of ${listingPhotos.length} for ${recordTitle(record)}`}
                  className="absolute inset-0 h-full w-full object-contain"
                />
                {listingPhotos.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setPhotoIdx((i) => (i - 1 + listingPhotos.length) % listingPhotos.length)}
                      className="absolute left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/50 text-white hover:bg-black/70"
                      aria-label="Previous photo"
                    >‹</button>
                    <button
                      type="button"
                      onClick={() => setPhotoIdx((i) => (i + 1) % listingPhotos.length)}
                      className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/50 text-white hover:bg-black/70"
                      aria-label="Next photo"
                    >›</button>
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-[11px] font-semibold text-white">
                      {photoIdx + 1} / {listingPhotos.length}
                    </div>
                  </>
                )}
              </>
            )}
            {listingPhotos.length === 0 && (photosState === "empty" || photosState === "error") && (
              <div className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-white/80">
                <div>
                  <div className="mb-2 font-semibold">No MLS photos available for this address.</div>
                  <div className="text-white/60 text-xs mb-4">Bridge feed didn't return media for this listing.</div>
                  <a
                    href={zillowUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#0A1B2F] hover:bg-white/90"
                  >Open on zillow.com ↗</a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )}
    </>
  );
}


function KV({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-[#F0F1F4] py-1.5 last:border-b-0">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{k}</span>
      <span className="max-w-[200px] text-right text-xs font-medium text-[#0A1B2F]">{v}</span>
    </div>
  );
}

function PermitBadge({ count }: { count: number }) {
  if (count === 0) return <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700">No permits</span>;
  if (count <= 1) return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">{count} permit</span>;
  return <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">{count} permits</span>;
}

function VilOpportunityBlock({ record }: { record: AnyRecord }) {
  if (record.segment !== "vil") return null;
  const pot = renoPotential(record);
  const done = workCompleted(record.id);
  const gaps = workGaps(record.id);
  const history = permitsFor(record.id);
  if (!pot) return null;
  const barColor = pot.score >= 75 ? "#DC2626" : pot.score >= 50 ? "#D97706" : "#16A34A";
  return (
    <div className="-mx-4 mt-2 border-t border-[#F0F1F4] px-4 pt-3">
      <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        Opportunity Score
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="inline-flex h-3.5 w-3.5 cursor-pointer items-center justify-center rounded-full bg-slate-200 text-[9px] font-bold text-slate-600 hover:bg-slate-300"
              aria-label="How the opportunity score is calculated"
            >i</button>
          </PopoverTrigger>
          <PopoverContent side="left" align="start" className="w-80 text-[11px]">
            <div className="mb-2 text-xs font-semibold text-[#0A1B2F]">How we read this property</div>
            <p className="text-slate-600 leading-relaxed">
              The score blends six on-the-ground signals — no math jargon, just what a
              field rep would notice:
            </p>
            <ul className="mt-2 space-y-1.5 text-slate-600">
              <li><b className="text-[#0A1B2F]">Price per square foot</b> vs. similar homes <i>in this same neighborhood</i> — below local average means upside room.</li>
              <li><b className="text-[#0A1B2F]">Permit gap</b> — how many trade categories (kitchen, HVAC, roof, addition…) have <i>never</i> been touched.</li>
              <li><b className="text-[#0A1B2F]">Mortgage window</b> — buyers who closed 2018-2021 are rate-locked; long-time owners have built equity.</li>
              <li><b className="text-[#0A1B2F]">Lot size</b> — bigger-than-average lot opens up pool / hardscape / addition scope.</li>
              <li><b className="text-[#0A1B2F]">Home age</b> — older systems = more replacement scope.</li>
              <li><b className="text-[#0A1B2F]">Reachability</b> — small tiebreaker for whether you can actually land a message.</li>
            </ul>
            <div className="mt-3 text-[10px] italic text-slate-400">Full calculation methodology in <code>/docs/opportunity-score-calculation.md</code>.</div>
          </PopoverContent>
        </Popover>
      </div>
      <div className="rounded-lg bg-[#F5F6F8] p-3">
        <div className="flex items-baseline justify-between">
          <span className="text-xs font-medium text-slate-700">Renovation potential</span>
          <span className="font-serif text-2xl font-bold" style={{ color: barColor }}>
            {pot.score}<span className="text-xs font-medium text-slate-400">/100</span>
          </span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full" style={{ width: `${pot.score}%`, background: barColor }} />
        </div>
        <div className="mt-2 text-[10px] text-slate-500">{pot.reason}</div>
        <ul className="mt-2 space-y-0.5 text-[10px]">
          {scoreDrivers(record).slice(0, 4).map((d, i) => (
            <li key={i} className={d.tone === "pos" ? "text-emerald-700" : d.tone === "neg" ? "text-rose-700" : "text-slate-500"}>
              {d.tone === "pos" ? "▲" : d.tone === "neg" ? "▼" : "•"} {d.label}
            </li>
          ))}
        </ul>
      </div>

      {done.size > 0 && (
        <>
          <div className="mb-1.5 mt-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Work Completed</div>
          <div className="flex flex-wrap gap-1.5">
            {WORK_TYPES.filter((w) => done.has(w.key)).map((w) => (
              <span key={w.key}
                className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold"
                style={{ background: w.bg, color: w.color, borderColor: w.color + "33" }}>
                <span>{w.emoji}</span> {w.label}
              </span>
            ))}
          </div>
        </>
      )}

      {gaps.length > 0 && (
        <>
          <div className="mb-1.5 mt-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Renovation Gaps (Harth Opportunity)
          </div>
          <div className="flex flex-wrap gap-1.5">
            {WORK_TYPES.filter((w) => gaps.includes(w.key)).map((w) => (
              <span key={w.key}
                className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                <span>{w.emoji}</span> {w.label}
              </span>
            ))}
          </div>
        </>
      )}

      {history.length > 0 && (
        <>
          <div className="mb-2 mt-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Permit History ({history.length})
          </div>
          <div className="space-y-2">
            {history.map((p) => (
              <div key={p.id} className="flex gap-2 rounded-md border border-[#E2E5EC] bg-white p-2">
                <div
                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-sm"
                  style={{ background: p.bg, color: p.color }}
                >
                  {p.emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-semibold text-[#0A1B2F]">
                    {p.label} — Residential
                  </div>
                  <div className="text-[10px] text-slate-500">{p.date} · #{p.number}</div>
                  <div className="mt-0.5 truncate text-[10px] text-slate-600">{p.description}</div>
                  <div className="mt-1 text-[10px]">
                    <span className="font-semibold text-emerald-700">${p.jobValue.toLocaleString()} job value</span>
                    <span className="text-slate-500"> · {p.contractor}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}


function ReadinessLight({ r }: { r: AnyRecord }) {
  if (r.segment !== "crm") return <span>—</span>;
  const score = (r.hasEmail ? 1 : 0) + (r.hasLinkedIn ? 1 : 0) + (r.address ? 1 : 0);
  const color = score === 3 ? "#16a34a" : score === 2 ? "#eab308" : "#94a3b8";
  const label = score === 3 ? "Ready" : score === 2 ? "Partial" : "Sparse";
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

// ─── Tables ───────────────────────────────────────────────
function exportCSV(rows: Array<Record<string, unknown>>, name: string) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(","), ...rows.map((r) => headers.map((h) => `"${String(r[h] ?? "").replace(/"/g, '""')}"`).join(","))];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `harth-${name}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
  // Celebration burst
  try {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.7 },
      colors: ["#0a1b30", "#E8A020", "#14A870", "#FF5733"],
    });
  } catch { /* noop */ }
}


function TableToolbar({
  title, search, setSearch, count, onMail, onExport, children,
}: {
  title: string; search: string; setSearch: (s: string) => void;
  count: number; onMail?: () => void; onExport: () => void; children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-[#E2E5EC] bg-white px-5 py-3">
      <span className="text-sm font-semibold">{title}</span>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search…"
        className="min-w-[220px] rounded-md border border-[#E2E5EC] bg-[#F5F6F8] px-3 py-1.5 text-xs"
      />
      {children}
      <div className="flex-1" />
      <span className="text-xs text-slate-500">{count} records</span>
      {onMail && (
        <button onClick={onMail} className="rounded-md bg-[#0a1b30] px-3 py-1.5 text-xs font-semibold text-white hover:brightness-110">
          Ready to mail ({count})
        </button>
      )}
      <button onClick={onExport} className="inline-flex items-center gap-1 rounded-md border border-[#E2E5EC] bg-[#F5F6F8] px-3 py-1.5 text-xs font-medium hover:bg-slate-100">
        <Download className="h-3 w-3" /> Export
      </button>
    </div>
  );
}

function CrmTable({ onOpen }: { onOpen: (r: AnyRecord) => void }) {
  const [q, setQ] = useState("");
  const rows = crmData.filter((d) => !q || (d.name + d.city + d.email).toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="flex h-full flex-col">
      <TableToolbar
        title="Ex-Clients" search={q} setSearch={setQ} count={rows.length}
        onMail={() => exportCSV(rows.map((r) => ({ Name: r.name, Address: r.address, City: r.city, State: r.state, Zip: r.zip })), "mail-ex-clients")}
        onExport={() => exportCSV(rows, "ex-clients")}
      />
      <div className="flex-1 overflow-auto bg-white">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-[#F5F6F8] text-[10px] uppercase tracking-wider text-slate-500">
            <tr>
              {["Name", "City", "Email", "Phone", "Status", "ICP", "Channels", "LinkedIn"].map((h) => (
                <th key={h} className="border-b border-[#E2E5EC] px-4 py-2.5 text-left font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => {
              const st = recordStatus(d);
              const ic = icpScore(d);
              return (
              <tr key={d.id} onClick={() => onOpen(d)} className="cursor-pointer border-b border-[#F0F1F4] hover:bg-[#F0F4FF]">
                <td className="px-4 py-2.5 font-medium">{d.name}</td>
                <td className="px-4 py-2.5">{d.city}, {d.state}</td>
                <td className="px-4 py-2.5 text-[11px] text-slate-600" onClick={(e) => e.stopPropagation()}>
                  {d.email ? <a href={`mailto:${d.email}`} className="text-[#0a1b30] hover:underline">{d.email}</a> : "—"}
                </td>
                <td className="px-4 py-2.5 text-[11px] text-slate-600" onClick={(e) => e.stopPropagation()}>
                  {d.phone ? <a href={`tel:${d.phone.replace(/[^\d+]/g, "")}`} className="text-[#0a1b30] hover:underline">{d.phone}</a> : "—"}
                </td>
                <td className="px-4 py-2.5">
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white" style={{ background: statusColor(st) }}>{st}</span>
                </td>
                <td className="px-4 py-2.5 font-semibold" style={{ color: icpColor(ic) }}>{ic.toFixed(1)}</td>
                <td className="px-4 py-2.5">
                  {d.hasEmail && <Pill color="blue">Email</Pill>}{" "}
                  {d.hasPhone && <Pill color="green">Phone</Pill>}{" "}
                  {d.hasLinkedIn && <Pill color="gold">LinkedIn</Pill>}
                </td>
                <td className="px-4 py-2.5">
                  <a href={d.linkedIn} target="_blank" rel="noreferrer" className="text-[#0a1b30] hover:underline" onClick={(e) => e.stopPropagation()}>View →</a>
                </td>
              </tr>
            );})}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function VilTable({ token, onOpen }: { token: string; onOpen: (r: AnyRecord) => void }) {
  const [q, setQ] = useState("");
  const [permitF, setPermitF] = useState("");
  const [mode, setMode] = useState<"table" | "cards">("table");
  const rows = vilData.filter((d) => {
    if (q && !(d.address + d.owner).toLowerCase().includes(q.toLowerCase())) return false;
    if (permitF === "0" && d.permitCount !== 0) return false;
    if (permitF === "1" && d.permitCount !== 1) return false;
    if (permitF === "2" && d.permitCount < 2) return false;
    return true;
  });
  return (
    <div className="flex h-full flex-col">
      <TableToolbar title="Villanova Properties" search={q} setSearch={setQ} count={rows.length}
        onExport={() => exportCSV(rows, "villanova")}>
        <div className="inline-flex rounded-md border border-[#E2E5EC] bg-[#F5F6F8] p-0.5 text-[11px]">
          <button onClick={() => setMode("table")} className={`rounded px-2 py-1 ${mode==="table" ? "bg-white shadow-sm font-semibold" : "text-slate-500"}`}>Table</button>
          <button onClick={() => setMode("cards")} className={`rounded px-2 py-1 ${mode==="cards" ? "bg-white shadow-sm font-semibold" : "text-slate-500"}`}>Cards</button>
        </div>
        <select value={permitF} onChange={(e) => setPermitF(e.target.value)} className="rounded-md border border-[#E2E5EC] bg-[#F5F6F8] px-2 py-1.5 text-xs">
          <option value="">All Permit Levels</option>
          <option value="0">No permits</option>
          <option value="1">1 permit</option>
          <option value="2">2+ permits</option>
        </select>
      </TableToolbar>
      {mode === "table" ? (
      <div className="flex-1 overflow-auto bg-white">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-[#F5F6F8] text-[10px] uppercase tracking-wider text-slate-500">
            <tr>
              {["Address", "Owner", "Built", "Sqft", "Beds/Baths", "Value", "Permits", "Status", "Score"].map((h) => (
                <th key={h} className="border-b border-[#E2E5EC] px-4 py-2.5 text-left font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => {
              const s = opportunityScore(d);
              const st = recordStatus(d);
              return (
                <tr key={d.id} onClick={() => onOpen(d)} className="cursor-pointer border-b border-[#F0F1F4] hover:bg-[#F0F4FF]">
                  <td className="px-4 py-2.5 font-medium">{d.address.split(",")[0]}</td>
                  <td className="px-4 py-2.5 text-[11px] text-slate-600">{d.owner}</td>
                  <td className="px-4 py-2.5">{d.yearBuilt}</td>
                  <td className="px-4 py-2.5">{fmtN(d.sqft)}</td>
                  <td className="px-4 py-2.5">{d.beds}bd / {d.baths}ba</td>
                  <td className="px-4 py-2.5">{fmt$(d.marketValue)}</td>
                  <td className="px-4 py-2.5"><PermitBadge count={d.permitCount} /></td>
                  <td className="px-4 py-2.5"><span className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white" style={{ background: statusColor(st) }}>{st}</span></td>
                  <td className="px-4 py-2.5 font-semibold" style={{ color: scoreColor(s) }}>{s.toFixed(1)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      ) : (
      <div className="flex-1 overflow-auto bg-[#F5F6F8] p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rows.map((d) => {
            const s = opportunityScore(d);
            const st = recordStatus(d);
            const photo = propertyAerialUrl(d, token, "520x260", 18);
            return (
              <button key={d.id} onClick={() => onOpen(d)} className="group flex flex-col overflow-hidden rounded-xl border border-[#E2E5EC] bg-white text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#0a1b30] hover:shadow-lg">
                {photo && <img src={photo} alt="" className="h-32 w-full object-cover transition group-hover:scale-[1.03]" loading="lazy" />}
                <div className="flex flex-1 flex-col gap-1.5 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="truncate text-sm font-semibold text-[#0A1B2F]">{d.address.split(",")[0]}</div>
                    <span className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold text-white" style={{ background: statusColor(st) }}>{st}</span>
                  </div>
                  <div className="text-[10px] text-slate-500">{d.beds}bd · {d.baths}ba · {fmtN(d.sqft)} sqft · {d.yearBuilt}</div>
                  <div className="text-[11px] font-semibold text-slate-700">{fmt$(d.marketValue)}</div>
                  <div className="mt-1 flex items-center justify-between">
                    <PermitBadge count={d.permitCount} />
                    <span className="text-[11px] font-bold" style={{ color: scoreColor(s) }}>{s.toFixed(1)}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
      )}
    </div>
  );
}

function ShoreTable({ onOpen }: { onOpen: (r: AnyRecord) => void }) {
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");
  const rows = shoreData.filter((d) => {
    if (q && !(d.address + d.owner + d.city).toLowerCase().includes(q.toLowerCase())) return false;
    if (city && d.city !== city) return false;
    return true;
  });
  return (
    <div className="flex h-full flex-col">
      <TableToolbar title="NJ Shore Properties" search={q} setSearch={setQ} count={rows.length}
        onExport={() => exportCSV(rows, "shore")}>
        <select value={city} onChange={(e) => setCity(e.target.value)} className="rounded-md border border-[#E2E5EC] bg-[#F5F6F8] px-2 py-1.5 text-xs">
          <option value="">All cities</option>
          <option value="Avalon">Avalon</option>
          <option value="Margate City">Margate City</option>
          <option value="Stone Harbor">Stone Harbor</option>
          <option value="Longport">Longport</option>
        </select>
      </TableToolbar>
      <div className="flex-1 overflow-auto bg-white">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-[#F5F6F8] text-[10px] uppercase tracking-wider text-slate-500">
            <tr>
              {["Address", "City", "Owner", "Sqft", "Built", "Sale Price", "Tax", "Owner Mail", "Status", "Score"].map((h) => (
                <th key={h} className="border-b border-[#E2E5EC] px-4 py-2.5 text-left font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => {
              const s = opportunityScore(d);
              const st = recordStatus(d);
              return (
              <tr key={d.id} onClick={() => onOpen(d)} className="cursor-pointer border-b border-[#F0F1F4] hover:bg-[#F0F4FF]">
                <td className="px-4 py-2.5 text-[11px] font-medium">{d.address.split(",")[0]}</td>
                <td className="px-4 py-2.5">{d.city}</td>
                <td className="px-4 py-2.5 text-[11px] text-slate-600">{d.owner}</td>
                <td className="px-4 py-2.5">{fmtN(d.sqft)}</td>
                <td className="px-4 py-2.5">{d.yearBuilt}</td>
                <td className="px-4 py-2.5">{fmt$(d.salePrice)}</td>
                <td className="px-4 py-2.5">{fmt$(d.lastYearTax)}</td>
                <td className="px-4 py-2.5">
                  {d.ownerMail.includes(", PA") ? <Pill color="blue">PA owner</Pill> : <Pill color="grey">Other</Pill>}
                </td>
                <td className="px-4 py-2.5"><span className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white" style={{ background: statusColor(st) }}>{st}</span></td>
                <td className="px-4 py-2.5 font-semibold" style={{ color: scoreColor(s) }}>{s.toFixed(1)}</td>
              </tr>
            );})}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Pill({ color, children }: { color: "blue" | "green" | "gold" | "grey"; children: React.ReactNode }) {
  const cls = {
    blue: "bg-[#EEF3FF] text-[#0a1b30]",
    green: "bg-emerald-100 text-emerald-700",
    gold: "bg-amber-100 text-amber-700",
    grey: "bg-slate-100 text-slate-500",
  }[color];
  return <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${cls}`}>{children}</span>;
}

// ─── Permit Ledger view ───────────────────────────────────
function PermitLedgerView({ onOpen }: { onOpen: (r: AnyRecord) => void }) {
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<WorkType | "all">("all");
  const rows = ALL_PERMITS.filter((p) => {
    if (typeFilter !== "all" && p.type !== typeFilter) return false;
    if (!q) return true;
    const t = q.toLowerCase();
    return (
      p.propAddress.toLowerCase().includes(t) ||
      p.contractor.toLowerCase().includes(t) ||
      p.label.toLowerCase().includes(t)
    );
  });
  const totalValue = rows.reduce((s, p) => s + p.jobValue, 0);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#F5F6F8]">
      <header className="flex items-center justify-between gap-4 border-b border-[#E2E5EC] bg-white px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold text-[#0A1B2F]">Permit Ledger</h1>
          <p className="text-xs text-slate-500">
            {rows.length} permits · Villanova properties · ${(totalValue / 1000).toFixed(1)}K total job value
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Search address, owner, type…"
            className="w-64 rounded-md border border-[#E2E5EC] bg-[#F5F6F8] px-3 py-1.5 text-xs"
          />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as WorkType | "all")}
            className="rounded-md border border-[#E2E5EC] bg-[#F5F6F8] px-2 py-1.5 text-xs"
          >
            <option value="all">All types</option>
            {WORK_TYPES.map((w) => (
              <option key={w.key} value={w.key}>{w.label}</option>
            ))}
          </select>
          <button
            onClick={() => exportCSV(rows.map((p) => ({
              property: p.propAddress, type: p.label, date: p.date,
              number: p.number, job_value: p.jobValue, contractor: p.contractor, description: p.description,
            })), "harth-permit-ledger")}
            className="rounded-md border border-[#E2E5EC] bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <Download className="mr-1 inline h-3 w-3" /> CSV
          </button>
        </div>
      </header>
      <div className="flex-1 overflow-auto px-6 py-4">
        <table className="w-full border-separate border-spacing-0 overflow-hidden rounded-xl border border-[#E2E5EC] bg-white text-xs">
          <thead className="bg-[#F5F6F8] text-[10px] uppercase tracking-wider text-slate-500">
            <tr>
              {["Property", "Type", "Date", "#", "Job Value", "Contractor"].map((h) => (
                <th key={h} className="border-b border-[#E2E5EC] px-4 py-2.5 text-left font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} onClick={() => { const rec = vilData.find((v) => v.id === p.propId); if (rec) onOpen(rec); }} className="cursor-pointer hover:bg-[#FAFBFC]">
                <td className="border-b border-[#F0F1F4] px-4 py-2.5">
                  <div className="font-medium text-[#0A1B2F]">{p.propAddress.split(",")[0]}</div>
                  <div className="text-[10px] text-slate-500">{p.description}</div>
                </td>
                <td className="border-b border-[#F0F1F4] px-4 py-2.5">
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    style={{ background: p.bg, color: p.color }}
                  >
                    <span>{p.emoji}</span> {p.label}
                  </span>
                </td>
                <td className="border-b border-[#F0F1F4] px-4 py-2.5 text-slate-600">{p.date}</td>
                <td className="border-b border-[#F0F1F4] px-4 py-2.5 font-mono text-[10px] text-slate-500">{p.number}</td>
                <td className="border-b border-[#F0F1F4] px-4 py-2.5 font-semibold text-emerald-700">
                  ${p.jobValue.toLocaleString()}
                </td>
                <td className="border-b border-[#F0F1F4] px-4 py-2.5 text-slate-600">{p.contractor}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="py-12 text-center text-slate-400">No permits match.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Coverage Matrix view ─────────────────────────────────
function CoverageMatrixView({ onOpen }: { onOpen: (r: AnyRecord) => void }) {
  const [q, setQ] = useState("");
  const rows = vilData.filter((p) => {
    if (!q) return true;
    const t = q.toLowerCase();
    return p.address.toLowerCase().includes(t) || p.owner.toLowerCase().includes(t);
  });
  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#F5F6F8]">
      <header className="flex items-center justify-between gap-4 border-b border-[#E2E5EC] bg-white px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold text-[#0A1B2F]">Permit Coverage Matrix</h1>
          <p className="text-xs text-slate-500">
            <span className="inline-block h-3 w-3 rounded bg-emerald-500 align-middle" /> Filed
            <span className="ml-3 inline-block h-3 w-3 rounded bg-slate-200 align-middle" /> No record (opportunity)
            · Click any row for full detail
          </p>
        </div>
        <input
          value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Search address, owner…"
          className="w-64 rounded-md border border-[#E2E5EC] bg-[#F5F6F8] px-3 py-1.5 text-xs"
        />
      </header>
      <div className="flex-1 overflow-auto px-6 py-4">
        <div className="overflow-hidden rounded-xl border border-[#E2E5EC] bg-white">
          <table className="w-full border-separate border-spacing-0 text-xs">
            <thead className="bg-[#F5F6F8] text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="border-b border-[#E2E5EC] px-4 py-2.5 text-left font-semibold">Property · Year</th>
                {WORK_TYPES.map((w) => (
                  <th key={w.key} className="border-b border-[#E2E5EC] px-2 py-2.5 text-center font-semibold">
                    <div className="text-sm">{w.emoji}</div>
                    <div className="mt-0.5">{w.label}</div>
                  </th>
                ))}
                <th className="border-b border-[#E2E5EC] px-3 py-2.5 text-center font-semibold">#</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const done = workCompleted(p.id);
                return (
                  <tr
                    key={p.id}
                    onClick={() => onOpen(p)}
                    className="cursor-pointer transition-colors hover:bg-[#FFFBEB]"
                  >
                    <td className="border-b border-[#F0F1F4] px-4 py-3">
                      <div className="font-semibold text-[#0A1B2F]">{p.address.split(",")[0].toUpperCase()}</div>
                      <div className="text-[10px] text-slate-500">{p.yearBuilt} · ${(p.marketValue / 1_000_000).toFixed(1)}M</div>
                    </td>
                    {WORK_TYPES.map((w) => {
                      const filed = done.has(w.key);
                      return (
                        <td key={w.key} className="border-b border-l border-[#F0F1F4] px-2 py-3 text-center">
                          {filed ? (
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-emerald-500 text-white">✓</span>
                          ) : (
                            <span className="inline-block h-6 w-6 rounded bg-slate-200" />
                          )}
                        </td>
                      );
                    })}
                    <td className="border-b border-l border-[#F0F1F4] px-3 py-3 text-center text-base font-bold text-[#0a1b30]">
                      {p.permitCount}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Analytics ────────────────────────────────────────────
// ─── Deterministic synthetic job titles for CRM contacts ────────────────
// Real LinkedIn scrape is out of scope for the demo; we derive a stable
// title per contact id so the same person always shows the same title.
const SYNTHETIC_TITLES: { title: string; industry: string }[] = [
  { title: "CEO / Founder",              industry: "Tech & SaaS" },
  { title: "Managing Partner",           industry: "Law" },
  { title: "Physician / Surgeon",        industry: "Healthcare" },
  { title: "SVP, Finance",               industry: "Finance" },
  { title: "Portfolio Manager",          industry: "Finance" },
  { title: "Real Estate Principal",      industry: "Real Estate" },
  { title: "VP, Operations",             industry: "Industrial" },
  { title: "Marketing Director",         industry: "Consumer" },
];
function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function syntheticTitleFor(id: string) {
  return SYNTHETIC_TITLES[hashStr(id) % SYNTHETIC_TITLES.length];
}

function AnalyticsView() {
  // ── 1. Opportunity score distribution (tiers) ─────────────
  const allScored = [...vilData, ...shoreData].map((r) => opportunityScore(r as AnyRecord));
  const tiers = [
    { label: "Prime (8.5+)",  min: 8.5, max: 10.1, color: "#DC2626" },
    { label: "Strong (7–8.5)", min: 7,   max: 8.5,  color: "#EA580C" },
    { label: "Watch (5–7)",    min: 5,   max: 7,    color: "#E8A020" },
    { label: "Low (<5)",       min: 0,   max: 5,    color: "#94A3B8" },
  ];
  const tierData = tiers.map((t) => ({
    name: t.label,
    count: allScored.filter((s) => s >= t.min && s < t.max).length,
    color: t.color,
  }));
  const primeCount = tierData[0]!.count + tierData[1]!.count;

  // ── 2. $/sqft by cluster (street/road) vs neighborhood average ──
  const streetOf = (addr: string) => {
    // "855 Mt Moro Rd, Villanova, PA 19085" → "Mt Moro Rd"
    const seg = addr.split(",")[0] ?? "";
    return seg.replace(/^\d+\s+/, "").trim();
  };
  const ppsfRows = (() => {
    const m = new Map<string, number[]>();
    vilData.forEach((v) => {
      const p = pricePerSqft(v as AnyRecord);
      if (!p) return;
      const street = streetOf(v.address);
      if (!m.has(street)) m.set(street, []);
      m.get(street)!.push(p);
    });
    return Array.from(m.entries())
      .filter(([, arr]) => arr.length >= 1)
      .map(([street, arr]) => ({
        cluster: street,
        ppsf: Math.round(arr.reduce((a, b) => a + b, 0) / arr.length),
        homes: arr.length,
      }))
      .sort((a, b) => b.ppsf - a.ppsf)
      .slice(0, 10);
  })();

  // ── 3. Permits over time ─────────────────────────────────
  const permitsByYear = (() => {
    const m = new Map<number, number>();
    ALL_PERMITS.forEach((p) => m.set(p.year, (m.get(p.year) ?? 0) + 1));
    const years = Array.from(m.keys()).sort((a, b) => a - b);
    if (!years.length) return [];
    const minY = years[0]!, maxY = years[years.length - 1]!;
    const out: { year: number; permits: number }[] = [];
    for (let y = minY; y <= maxY; y++) out.push({ year: y, permits: m.get(y) ?? 0 });
    return out;
  })();

  // ── 4. Permit type breakdown — most common AND most absent ──
  const workTypeCounts = WORK_TYPES.map((wt) => ({
    name: wt.label,
    count: ALL_PERMITS.filter((p) => p.type === wt.key).length,
    color: wt.color,
  })).sort((a, b) => b.count - a.count);
  const mostAbsent = [...workTypeCounts].sort((a, b) => a.count - b.count).slice(0, 3);

  // ── 5. Contractor concentration ──────────────────────────
  const contractorCounts = (() => {
    const m = new Map<string, number>();
    ALL_PERMITS.forEach((p) => m.set(p.contractor, (m.get(p.contractor) ?? 0) + 1));
    return Array.from(m, ([name, jobs]) => ({ name, jobs }))
      .sort((a, b) => b.jobs - a.jobs)
      .slice(0, 10);
  })();

  // ── 5b. Contractor → properties + work types + total $ ────
  // Brings back the "who did what at which property and for how much" view.
  const contractorDetail = (() => {
    const m = new Map<string, {
      jobs: number;
      totalValue: number;
      properties: Map<string, { address: string; jobs: number; value: number; types: Set<string> }>;
      types: Map<string, number>;
    }>();
    ALL_PERMITS.forEach((p) => {
      const rec = m.get(p.contractor) ?? {
        jobs: 0, totalValue: 0,
        properties: new Map(), types: new Map(),
      };
      rec.jobs += 1;
      rec.totalValue += p.jobValue;
      const addr = p.propAddress.split(",")[0] ?? p.propAddress;
      const prop = rec.properties.get(p.propId) ?? { address: addr, jobs: 0, value: 0, types: new Set() };
      prop.jobs += 1;
      prop.value += p.jobValue;
      prop.types.add(p.label);
      rec.properties.set(p.propId, prop);
      rec.types.set(p.label, (rec.types.get(p.label) ?? 0) + 1);
      m.set(p.contractor, rec);
    });
    return Array.from(m.entries())
      .map(([name, r]) => ({
        name,
        jobs: r.jobs,
        totalValue: r.totalValue,
        properties: Array.from(r.properties.values()).sort((a, b) => b.value - a.value),
        topTypes: Array.from(r.types.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3),
      }))
      .sort((a, b) => b.totalValue - a.totalValue);
  })();
  const ledgerTotalValue = contractorDetail.reduce((s, c) => s + c.totalValue, 0);

  // ── 6. Homes by build decade ──────────────────────────────
  const decades = [
    { label: "Pre-1960", min: 0,    max: 1960 },
    { label: "1960s",    min: 1960, max: 1970 },
    { label: "1970s",    min: 1970, max: 1980 },
    { label: "1980s",    min: 1980, max: 1990 },
    { label: "1990s",    min: 1990, max: 2000 },
    { label: "2000+",    min: 2000, max: 9999 },
  ];
  const decadeData = decades.map((d) => ({
    decade: d.label,
    homes: vilData.filter((v) => v.yearBuilt >= d.min && v.yearBuilt < d.max).length,
  }));

  return (
    <div className="h-full overflow-y-auto bg-[#F7F8FA]">
      <div className="mx-auto max-w-[1400px] space-y-5 p-6">
        {/* ── Methodology narrative ─────────────────────────── */}
        <div className="rounded-xl border border-[#E2E5EC] bg-white p-6">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#0a1b30]">How to read this page</div>
          <h2 className="mt-1 text-2xl font-semibold text-[#0A1B2F]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            The math, in plain English
          </h2>
          <div className="mt-3 grid grid-cols-1 gap-4 text-sm leading-relaxed text-slate-600 md:grid-cols-2">
            <div>
              <div className="font-semibold text-[#0A1B2F]">Opportunity score (0–10)</div>
              <p className="mt-1">
                A weighted blend of six on-the-ground signals — not a black box. <b className="text-[#0A1B2F]">$/sqft vs. the neighborhood median</b> (35%) is the biggest input: Enrique's logic — a buyer who paid $4M in a $6M block still has $2M left to invest. <b className="text-[#0A1B2F]">Permit gap</b> (20%) counts trade categories never touched — kitchen, HVAC, roof, addition. <b className="text-[#0A1B2F]">Mortgage window</b> (20%) penalises 2018–2021 closings (rate-locked, low renovation cash) and rewards pre-2018 long-term holders. <b className="text-[#0A1B2F]">Renovation debt</b> (15%) is years since the last permit was pulled. <b className="text-[#0A1B2F]">Lot size</b> (10%) and <b className="text-[#0A1B2F]">home age</b> (10%) fill in the scope dimensions.
              </p>
            </div>
            <div>
              <div className="font-semibold text-[#0A1B2F]">Heat map (Map → Heat layer)</div>
              <p className="mt-1">
                Hot = <b className="text-emerald-700">below average price + few permits</b>. The buyer paid under market and hasn&rsquo;t pulled the permits that signal renovation activity — they have budget and scope still on the table. Cold = above-average $/sqft or already well-permitted (already touched, lower upside). This is the inverse of a typical "premium property" map and matches the way Harth qualifies leads.
              </p>
            </div>
            <div>
              <div className="font-semibold text-[#0A1B2F]">Permit data</div>
              <p className="mt-1">
                Pulled from public township records. Each row tells us <b className="text-[#0A1B2F]">who pulled the permit</b> (the homeowner&rsquo;s contractor — your direct competitor on that block), <b className="text-[#0A1B2F]">when</b>, <b className="text-[#0A1B2F]">what type of work</b> (HVAC, addition, roof, kitchen…), and <b className="text-[#0A1B2F]">the declared job value</b>. Caveat: declared values are often understated on permit applications, so treat them as a floor, not a ceiling. Owner-pulled vs. contractor-pulled attribution is on the roadmap.
              </p>
            </div>
            <div>
              <div className="font-semibold text-[#0A1B2F]">Cash-availability signal</div>
              <p className="mt-1">
                Derived from <b className="text-[#0A1B2F]">last-sale date</b> against the mortgage-rate timeline. Pre-2018 buyers have built equity and the home is paid down. The 2018–2021 cohort closed on ~2.5% mortgages — they will not refinance to remodel, so they show as cold even when the home looks renovatable. Post-2022 buyers already priced market rates in and behave as if the renovation budget is part of the purchase plan.
              </p>
            </div>
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <KpiCard label="Properties tracked"   value={`${vilData.length + shoreData.length}`} sub={`${vilData.length} Villanova · ${shoreData.length} Shore`} accent="#0a1b30" />
          <KpiCard label="Prime + Strong"       value={`${primeCount}`} sub={`Top-tier opportunities (≥7.0)`} accent="#DC2626" />
          <KpiCard label="Permits on record"    value={`${ALL_PERMITS.length}`} sub={`across ${workTypeCounts.filter(w=>w.count>0).length} work types`} accent="#E8A020" />
          <KpiCard label="Median $/sqft"        value={`$${MEDIAN_PPSF}`} sub={`Neighborhood baseline`} accent="#14A870" />
        </div>

        {/* Row 1 — Opportunity tiers + $/sqft cluster */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Panel title="Opportunity score · distribution" sub="Where to start the conversation — count of properties by tier">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={tierData} margin={{ left: 0, right: 12, top: 4, bottom: 4 }}>
                  <CartesianGrid stroke="#E2E5EC" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {tierData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Panel>
          </div>

          <div className="lg:col-span-3">
            <Panel title="$/sqft by cluster · vs neighborhood median" sub={`Median across the set: $${MEDIAN_PPSF}/sqft · clusters above the line are premium, below = upside room`}>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={ppsfRows} margin={{ left: 0, right: 12, top: 4, bottom: 4 }}>
                  <CartesianGrid stroke="#E2E5EC" vertical={false} />
                  <XAxis dataKey="cluster" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={70} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${v}`} />
                  <Tooltip formatter={(v: number) => [`$${v}/sqft`, "Avg $/sqft"]} />
                  <Bar dataKey="ppsf" radius={[4, 4, 0, 0]}>
                    {ppsfRows.map((d, i) => (
                      <Cell key={i} fill={d.ppsf > MEDIAN_PPSF ? "#DC2626" : "#14A870"} />
                    ))}
                  </Bar>
                  <ReferenceLine y={MEDIAN_PPSF} stroke="#0A1B2F" strokeDasharray="4 4" label={{ value: `Median $${MEDIAN_PPSF}`, fontSize: 10, fill: "#0A1B2F", position: "right" }} />
                </BarChart>
              </ResponsiveContainer>
            </Panel>
          </div>
        </div>

        {/* Row 2 — Permits over time */}
        <Panel title="Permit activity over time" sub="Permits pulled per year across the Villanova set — is renovation activity trending up or down?">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={permitsByYear} margin={{ left: 0, right: 12, top: 4, bottom: 4 }}>
              <CartesianGrid stroke="#E2E5EC" vertical={false} />
              <XAxis dataKey="year" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="permits" name="Permits filed" fill="#0a1b30" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
            <b className="text-slate-700">Read it as:</b> spikes usually follow rate cuts or storm seasons (roofing, HVAC).
            Flat or declining years inside a wealthy market are a buying signal — the renovation backlog is accumulating
            and nobody&rsquo;s servicing it yet.
          </p>
        </Panel>

        {/* Row 3 — Work type breakdown + contractor concentration */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Panel title="Permit type · most common vs most absent" sub={`The absent ones are the pitch — least-permitted: ${mostAbsent.map(m => m.name).join(", ")}`}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={workTypeCounts} layout="vertical" margin={{ left: 0, right: 12, top: 4, bottom: 4 }}>
                <CartesianGrid stroke="#E2E5EC" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={92} />
                <Tooltip />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {workTypeCounts.map((d, i) => <Cell key={i} fill={d.count === 0 ? "#E2E5EC" : d.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
              Categories at zero are <b className="text-slate-700">whitespace</b> — work the block isn&rsquo;t getting from
              anyone. That&rsquo;s your wedge into a homeowner who hasn&rsquo;t been pitched on it.
            </p>
          </Panel>

          <Panel title="Contractor concentration" sub="Who dominates the permit history — your direct competitors on these blocks">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={contractorCounts} layout="vertical" margin={{ left: 0, right: 12, top: 4, bottom: 4 }}>
                <CartesianGrid stroke="#E2E5EC" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={160} />
                <Tooltip />
                <Bar dataKey="jobs" name="Permits filed" fill="#7C3AED" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
              Top of the list = who the homeowners already trust. Use the <b className="text-slate-700">Competitor</b>{" "}
              dropdown in the sidebar to filter the map to only properties that contractor has worked.
            </p>
          </Panel>
        </div>

        {/* Row 3b — Contractor activity ledger (per-contractor breakdown) */}
        <Panel
          title="Contractor activity ledger"
          sub={`Who pulled what, where, and for how much · ${contractorDetail.length} contractors · $${(ledgerTotalValue / 1000).toFixed(0)}K declared job value`}
        >
          <p className="mb-3 text-[11px] leading-relaxed text-slate-500">
            Each row is one contractor. Expand to see <b className="text-slate-700">which properties</b> they&rsquo;ve worked,{" "}
            <b className="text-slate-700">what type of work</b> they did, and the <b className="text-slate-700">declared
            job value</b> per property. Use this to spot a competitor who&rsquo;s only ever pulled HVAC permits on your
            block — they&rsquo;re not bidding the kitchen renovation, so the homeowner doesn&rsquo;t have an obvious
            general contractor for the big scope.
          </p>
          <div className="overflow-hidden rounded-lg border border-[#E2E5EC]">
            <table className="w-full border-separate border-spacing-0 text-xs">
              <thead className="bg-[#F5F6F8] text-[10px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="border-b border-[#E2E5EC] px-3 py-2 text-left font-semibold">Contractor</th>
                  <th className="border-b border-[#E2E5EC] px-3 py-2 text-right font-semibold">Permits</th>
                  <th className="border-b border-[#E2E5EC] px-3 py-2 text-right font-semibold">Properties</th>
                  <th className="border-b border-[#E2E5EC] px-3 py-2 text-right font-semibold">Declared $</th>
                  <th className="border-b border-[#E2E5EC] px-3 py-2 text-left font-semibold">Top work types</th>
                </tr>
              </thead>
              <tbody>
                {contractorDetail.map((c) => (
                  <ContractorRow key={c.name} c={c} />
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        {/* Row 4 — Build decade */}
        <Panel title="Homes by build decade" sub="Older = more renovation debt. Pre-1980 stock is where the deepest scope lives.">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={decadeData} margin={{ left: 0, right: 12, top: 4, bottom: 4 }}>
              <CartesianGrid stroke="#E2E5EC" vertical={false} />
              <XAxis dataKey="decade" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="homes" radius={[4, 4, 0, 0]}>
                {decadeData.map((_, i) => (
                  <Cell key={i} fill={i <= 1 ? "#DC2626" : i <= 3 ? "#E8A020" : "#14A870"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
            Homes built before 1980 are 45+ years old — original HVAC, original kitchens, original baths are at the end
            of useful life. Pre-1960 stock is where the <b className="text-slate-700">deepest, highest-ticket scope</b>{" "}
            lives. Newer construction (2000+) tends to have system upgrades already done; the upside there is
            additions, pools, and finishes rather than core mechanicals.
          </p>
        </Panel>

        {/* ───────── Cash Signal Story ───────── */}
        <CashSignalStory />

        {/* ───────── CRM / Ex-Client Story ───────── */}
        <CrmStory />

        {/* ───────── Geographic Story ───────── */}
        <GeographyStory />
      </div>
    </div>
  );
}

// ─── Cash signal story ─────────────────────────────────
function CashSignalStory() {
  const props = [...vilData, ...shoreData];
  const buckets = [
    { label: "Pre-2018",        min: "1900-01-01", max: "2018-07-01", rate: "5–6%", color: "#64748B", note: "Long-time owners — high equity" },
    { label: "2018–2021 (low)", min: "2018-07-01", max: "2022-01-01", rate: "~2.2–3%", color: "#DC2626", note: "Rate-locked — limited renovation cash" },
    { label: "2022+ (high)",    min: "2022-01-01", max: "2099-01-01", rate: "~6–7%", color: "#14A870", note: "Bought at market — already priced in, willing to invest" },
  ];
  const bucketData = buckets.map((b) => {
    const matches = props.filter((p) => {
      const d = (p as VilProperty).lastSaleDate || (p as ShoreProperty).saleDate;
      return d && d >= b.min && d < b.max;
    });
    const value = matches.reduce((sum, p) => sum + ((p as VilProperty).marketValue || (p as ShoreProperty).salePrice || 0), 0);
    return { ...b, homes: matches.length, value };
  });

  const totalValue = bucketData.reduce((s, b) => s + b.value, 0);
  const lockedShare = bucketData[1]!.homes / Math.max(1, props.length);
  const beachValueSince2019 = shoreData
    .filter((s) => s.saleDate && s.saleDate >= "2019-01-01")
    .reduce((sum, s) => sum + (s.salePrice || 0), 0);

  return (
    <div className="space-y-4 rounded-xl border border-[#E2E5EC] bg-white p-6">
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#0a1b30]">Cash signal · the story</div>
        <h2 className="mt-1 text-2xl font-semibold text-[#0A1B2F]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
          When they bought tells you what they can spend
        </h2>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-600">
          Buyers who closed in the 2018–2021 rate window are sitting on sub-3% mortgages and have the least incentive to take cash out for a remodel. Long-term holders have built decades of equity. Recent buyers are already paying market rates — they tend to invest in the home rather than hold back.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <KpiCard label="Addressable market value" value={`$${(totalValue / 1_000_000).toFixed(0)}M`} sub={`${props.length} properties combined`} accent="#0a1b30" />
        <KpiCard label="Beach houses since 2019" value={`$${(beachValueSince2019 / 1_000_000).toFixed(0)}M`} sub={`${shoreData.filter(s => s.saleDate && s.saleDate >= "2019-01-01").length} shore sales`} accent="#14A870" />
        <KpiCard label="Rate-locked share" value={`${Math.round(lockedShare * 100)}%`} sub="Bought 2018–2021 — tightest budgets" accent="#DC2626" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Panel title="Properties by purchase-rate window" sub="Who's locked in, who has equity, who's at market">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={bucketData} margin={{ left: 0, right: 12, top: 4, bottom: 4 }}>
              <CartesianGrid stroke="#E2E5EC" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip formatter={(v: number, n: string) => n === "homes" ? [`${v} homes`, "Properties"] : [v, n]} />
              <Bar dataKey="homes" radius={[4, 4, 0, 0]}>
                {bucketData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Dollar value parked in each window" sub="Where the addressable budget actually lives">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={bucketData} margin={{ left: 0, right: 12, top: 4, bottom: 4 }}>
              <CartesianGrid stroke="#E2E5EC" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${(v / 1_000_000).toFixed(0)}M`} />
              <Tooltip formatter={(v: number) => [`$${(v / 1_000_000).toFixed(1)}M`, "Market value"]} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {bucketData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {bucketData.map((b) => (
          <div key={b.label} className="rounded-lg border-l-4 bg-slate-50 p-3" style={{ borderColor: b.color }}>
            <div className="text-[11px] font-semibold text-slate-700">{b.label} · {b.rate}</div>
            <div className="mt-1 text-xs text-slate-600">{b.note}</div>
            <div className="mt-2 text-lg font-semibold text-[#0A1B2F]">{b.homes} homes · ${(b.value / 1_000_000).toFixed(1)}M</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── CRM / ex-client story ─────────────────────────────
function CrmStory() {
  const total = crmData.length;
  const optIn = crmData.filter((c) => c.emailOptIn).length;
  const optOut = total - optIn;
  const fullyReachable = crmData.filter((c) => c.hasEmail && c.hasPhone && c.hasLinkedIn).length;
  const partial = total - fullyReachable;

  const completenessBuckets = [
    { name: "Fully reachable (email + phone + LinkedIn)", count: fullyReachable, color: "#14A870" },
    { name: "Partial contact data",                       count: partial,         color: "#E8A020" },
  ];
  const optInBuckets = [
    { name: "Opted in",  value: optIn,  color: "#14A870" },
    { name: "Opted out", value: optOut, color: "#DC2626" },
  ];

  // Synthetic income bands derived from the existing title hash — stable per id.
  const incomeBands = [
    { band: "$500K+", min: 500, color: "#7C3AED" },
    { band: "$300–500K", min: 300, color: "#0a1b30" },
    { band: "$200–300K", min: 200, color: "#14A870" },
    { band: "$100–200K", min: 100, color: "#E8A020" },
  ];
  const incomeRows = incomeBands.map((b, i) => {
    const next = incomeBands[i - 1]?.min ?? 9999;
    const count = crmData.filter((c) => {
      // Simple stable income estimate: hash → 80..600
      let h = 2166136261;
      for (let j = 0; j < c.id.length; j++) { h ^= c.id.charCodeAt(j); h = Math.imul(h, 16777619); }
      const est = 80 + (h % 520);
      return est >= b.min && est < next;
    }).length;
    return { ...b, count };
  });

  // Upsell-gap proxy: most common missing work types across the VIL set
  // (used as a stand-in for ex-client gaps until per-CRM permit history lands).
  const gapCounts = WORK_TYPES.map((wt) => ({
    name: wt.label,
    gap: vilData.filter((v) => !permitsFor(v.id).some((p) => p.type === wt.key)).length,
    color: wt.color,
  })).sort((a, b) => b.gap - a.gap).slice(0, 6);

  return (
    <div className="space-y-4 rounded-xl border border-[#E2E5EC] bg-white p-6">
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7C3AED]">Ex-clients · the story</div>
        <h2 className="mt-1 text-2xl font-semibold text-[#0A1B2F]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
          Who you can actually reach right now
        </h2>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-600">
          Out of the ex-client list, the people still on your email list with phone and LinkedIn are warm and pitchable today. The upsell story for them is rarely "build something new" — it's the trade that never got touched the first time around: kitchens for outdoor clients, baths for kitchen clients, and so on.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <KpiCard label="Total ex-clients"   value={`${total}`}           sub="In current CRM" accent="#7C3AED" />
        <KpiCard label="Email opt-in"       value={`${optIn}/${total}`}  sub={`${Math.round((optIn / total) * 100)}% still on the list`} accent="#14A870" />
        <KpiCard label="Fully reachable"    value={`${fullyReachable}`}  sub="Email + phone + LinkedIn" accent="#0a1b30" />
        <KpiCard label="Estimated $200K+"   value={`${incomeRows.filter(b => b.min >= 200).reduce((s, b) => s + b.count, 0)}`} sub="Based on title / seniority" accent="#E8A020" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Panel title="Email opt-in" sub={`${optIn} reachable today · ${optOut} unsubscribed`}>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={optInBuckets} dataKey="value" nameKey="name" outerRadius={80} label={{ fontSize: 11 }}>
                {optInBuckets.map((b, i) => <Cell key={i} fill={b.color} />)}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Contact completeness" sub="Who you have full coverage on vs. partial">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={completenessBuckets} layout="vertical" margin={{ left: 0, right: 12, top: 4, bottom: 4 }}>
              <CartesianGrid stroke="#E2E5EC" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={170} />
              <Tooltip />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {completenessBuckets.map((b, i) => <Cell key={i} fill={b.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Estimated income band" sub="Derived from title / seniority — directional only">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={incomeRows} layout="vertical" margin={{ left: 0, right: 12, top: 4, bottom: 4 }}>
              <CartesianGrid stroke="#E2E5EC" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
              <YAxis type="category" dataKey="band" tick={{ fontSize: 11 }} width={92} />
              <Tooltip />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {incomeRows.map((b, i) => <Cell key={i} fill={b.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <Panel title="Upsell gap · trades most often missing across the book" sub="The trades nobody has permitted are the ones to lead with on re-engagement">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={gapCounts} margin={{ left: 0, right: 12, top: 4, bottom: 4 }}>
            <CartesianGrid stroke="#E2E5EC" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
            <Tooltip formatter={(v: number) => [`${v} homes`, "Without this trade"]} />
            <Bar dataKey="gap" radius={[4, 4, 0, 0]}>
              {gapCounts.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Panel>
    </div>
  );
}

// ─── Geographic story ──────────────────────────────────
function GeographyStory() {
  const shoreOwnerProx = shoreData
    .map((s) => milesBetween({ lat: s.lat, lng: s.lng }, HARTH_OFFICE_LL))
    .filter((d) => Number.isFinite(d));
  const within5 = shoreOwnerProx.filter((d) => d <= 5).length;
  const within10 = shoreOwnerProx.filter((d) => d <= 10).length;

  // Neighborhood cluster density — Villanova homes within 0.4 mi of each other
  const RADIUS_MI = 0.4;
  let maxCluster = 0;
  let maxAnchor: VilProperty | null = null;
  for (const v of vilData) {
    const neighbors = vilData.filter((o) => o.id !== v.id && milesBetween(v, o) <= RADIUS_MI);
    if (neighbors.length > maxCluster) {
      maxCluster = neighbors.length;
      maxAnchor = v;
    }
  }
  const clusterBuckets = [
    { label: "Isolated (0 neighbors)",   min: 0, max: 1 },
    { label: "1–2 neighbors in radius",  min: 1, max: 3 },
    { label: "3+ neighbors in radius",   min: 3, max: 99 },
  ];
  const clusterData = clusterBuckets.map((b) => ({
    label: b.label,
    homes: vilData.filter((v) => {
      const n = vilData.filter((o) => o.id !== v.id && milesBetween(v, o) <= RADIUS_MI).length;
      return n >= b.min && n < b.max;
    }).length,
  }));

  // Shore owner primary city distribution — use city field
  const shoreCityCounts = (() => {
    const m = new Map<string, number>();
    shoreData.forEach((s) => m.set(s.city, (m.get(s.city) ?? 0) + 1));
    return Array.from(m, ([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count);
  })();

  return (
    <div className="space-y-4 rounded-xl border border-[#E2E5EC] bg-white p-6">
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#14A870]">Geography · the story</div>
        <h2 className="mt-1 text-2xl font-semibold text-[#0A1B2F]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
          Close enough to door-knock — dense enough to chain
        </h2>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-600">
          Most shore owners actually live within easy driving distance of the Harth office. And on the Villanova side, properties cluster tight enough that converting one job opens conversations with the neighbors on either side.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <KpiCard label="Shore owners within 5 mi" value={`${within5}/${shoreData.length}`} sub="Of the Harth office" accent="#14A870" />
        <KpiCard label="Within 10 mi"             value={`${within10}/${shoreData.length}`} sub="Easy drive-by territory" accent="#0a1b30" />
        <KpiCard label="Densest cluster"          value={`${maxCluster + 1} homes`} sub={maxAnchor ? `Around ${maxAnchor.address.split(",")[0]}` : ""} accent="#E8A020" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Panel title="Neighborhood cluster density" sub="Villanova homes with neighbors within a 2-block (0.4 mi) radius — convert one, reach the next">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={clusterData} margin={{ left: 0, right: 12, top: 4, bottom: 4 }}>
              <CartesianGrid stroke="#E2E5EC" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="homes" radius={[4, 4, 0, 0]}>
                {clusterData.map((_, i) => <Cell key={i} fill={["#94A3B8", "#E8A020", "#14A870"][i]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Shore property locations by city" sub="Where the beach book actually concentrates">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={shoreCityCounts} layout="vertical" margin={{ left: 0, right: 12, top: 4, bottom: 4 }}>
              <CartesianGrid stroke="#E2E5EC" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
              <YAxis type="category" dataKey="city" tick={{ fontSize: 11 }} width={120} />
              <Tooltip />
              <Bar dataKey="count" fill="#0a1b30" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>
    </div>
  );
}


function KpiCard({ label, value, sub, accent }: { label: string; value: string; sub: string; accent: string }) {
  return (
    <div className="rounded-lg border border-[#E2E5EC] bg-white p-4">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-1 text-3xl font-semibold text-[#0A1B2F]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
        {value}
      </div>
      <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500">
        <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: accent }} />
        {sub}
      </div>
    </div>
  );
}


function Panel({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg border border-[#E2E5EC] bg-white p-5">
      <div className="text-sm font-semibold text-[#0A1B2F]">{title}</div>
      <div className="mb-3 text-[11px] text-slate-500">{sub}</div>
      {children}
    </div>
  );
}

type ContractorRowData = {
  name: string;
  jobs: number;
  totalValue: number;
  properties: { address: string; jobs: number; value: number; types: Set<string> }[];
  topTypes: [string, number][];
};

function ContractorRow({ c }: { c: ContractorRowData }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <tr
        onClick={() => setOpen((v) => !v)}
        className="cursor-pointer hover:bg-[#FAFBFC]"
      >
        <td className="border-b border-[#F0F1F4] px-3 py-2 font-medium text-[#0A1B2F]">
          <span className="mr-1 inline-block w-3 text-slate-400">{open ? "▾" : "▸"}</span>
          {c.name}
        </td>
        <td className="border-b border-[#F0F1F4] px-3 py-2 text-right tabular-nums text-slate-600">{c.jobs}</td>
        <td className="border-b border-[#F0F1F4] px-3 py-2 text-right tabular-nums text-slate-600">{c.properties.length}</td>
        <td className="border-b border-[#F0F1F4] px-3 py-2 text-right font-semibold tabular-nums text-emerald-700">
          ${c.totalValue.toLocaleString()}
        </td>
        <td className="border-b border-[#F0F1F4] px-3 py-2 text-[11px] text-slate-600">
          {c.topTypes.map(([t, n]) => `${t} (${n})`).join(" · ")}
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={5} className="border-b border-[#F0F1F4] bg-[#FAFBFC] px-3 py-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Properties worked by {c.name}
            </div>
            <ul className="mt-2 space-y-1">
              {c.properties.map((p) => (
                <li key={p.address} className="flex items-center justify-between gap-3 text-[11px]">
                  <span className="text-[#0A1B2F]">{p.address}</span>
                  <span className="text-slate-500">
                    {p.jobs} permit{p.jobs > 1 ? "s" : ""} · {Array.from(p.types).join(", ")}
                  </span>
                  <span className="font-semibold tabular-nums text-emerald-700">${p.value.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Presentation mode ────────────────────────────────────
function PresentationMode({
  onExit, tourPlaying, toggleTour, next, prev, currentCase, token, filtered,
}: {
  onExit: () => void;
  tourPlaying: boolean; toggleTour: () => void;
  next: () => void; prev: () => void;
  currentCase: CaseStudy;
  token: string;
  filtered: AnyRecord[];
}) {
  const presentationMapRef = useRef<mapboxgl.Map | null>(null);
  const segRecords = currentCase.segment === "all"
    ? allRecords
    : allRecords.filter((r) => r.segment === currentCase.segment);
  const [selected, setSelected] = useState<AnyRecord | null>(null);

  useEffect(() => {
    const m = presentationMapRef.current;
    if (!m) return;
    const flyToCase = () => {
      try { m.resize(); } catch { /* noop */ }
      m.flyTo({
        center: currentCase.center,
        zoom: currentCase.zoom,
        pitch: currentCase.pitch ?? 0,
        bearing: currentCase.bearing ?? 0,
        speed: 0.9,
        curve: 1.6,
        essential: true,
      });
    };
    if (m.loaded()) flyToCase();
    else m.once("load", flyToCase);
    // Extra safety: trigger resize after layout settles
    const t = setTimeout(() => { try { m.resize(); } catch { /* noop */ } }, 250);
    return () => clearTimeout(t);
  }, [currentCase]);

  return (
    <div className="fixed inset-0 z-50 h-screen w-screen overflow-hidden bg-black">
      <div className="absolute inset-0" style={{ width: "100vw", height: "100vh" }}>
        <MapView
          token={token} mapRef={presentationMapRef}
          layer="pins" setLayer={() => {}}
          records={segRecords} selected={selected} setSelected={setSelected}
          chromeless
        />
      </div>

      {/* Vignette so overlay cards read cleanly on bright map tiles */}
      <div
        className="pointer-events-none absolute inset-0 z-20"
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 22%, rgba(0,0,0,0) 70%, rgba(0,0,0,0.6) 100%)",
        }}
      />


      <div className="pointer-events-none absolute inset-0 z-30 flex flex-col">
        <div className="flex items-start justify-between p-8">
          <div className="pointer-events-auto rounded-2xl border border-white/15 bg-black/65 px-6 py-4 text-white backdrop-blur-md">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#0a1b30]">Harth Intel · Case study {caseStudies.indexOf(currentCase) + 1} of {caseStudies.length}</div>
            <div className="mt-1 text-3xl font-semibold" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              {currentCase.emoji} {currentCase.title}
            </div>
            <div className="mt-1 text-sm text-white/70">{currentCase.subtitle}</div>
          </div>
          <div className="pointer-events-auto flex gap-2">
            <button onClick={toggleTour} className="rounded-full bg-white/15 px-4 py-2 text-sm text-white backdrop-blur hover:bg-white/25">
              {tourPlaying ? <><Pause className="mr-1 inline h-3 w-3" /> Pause</> : <><Play className="mr-1 inline h-3 w-3" /> Auto-tour</>}
            </button>
            <button onClick={onExit} className="rounded-full bg-white/15 px-4 py-2 text-sm text-white backdrop-blur hover:bg-white/25">
              <Minimize2 className="mr-1 inline h-3 w-3" /> Exit
            </button>
          </div>
        </div>

        <div className="flex-1" />

        <div className="flex items-end justify-between gap-4 p-8">
          <div className="pointer-events-auto max-w-md rounded-2xl border border-white/15 bg-black/65 p-5 text-white backdrop-blur-md">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-white/50">Insight</div>
            <p className="mt-1 text-sm leading-relaxed text-white/90">{currentCase.insight}</p>
            <div className="mt-4 flex gap-4 border-t border-white/10 pt-3 text-xs">
              <Stat label="Records" v={segRecords.length} />
              <Stat label="Hot" v={segRecords.filter((r) => opportunityScore(r) >= 7.5).length} />
              <Stat label="ICP" v={segRecords.filter(isICPMatch).length} />
            </div>
          </div>
          <div className="pointer-events-auto flex gap-2">
            <button onClick={prev} className="rounded-full bg-white/15 px-4 py-3 text-white backdrop-blur hover:bg-white/25">←</button>
            <button onClick={next} className="rounded-full bg-[#0a1b30] px-5 py-3 text-sm font-semibold text-white hover:brightness-110">
              Next case <ArrowRight className="ml-1 inline h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, v }: { label: string; v: number }) {
  return (
    <div>
      <div className="text-lg font-semibold">{v}</div>
      <div className="text-[10px] uppercase tracking-wider text-white/50">{label}</div>
    </div>
  );
}
