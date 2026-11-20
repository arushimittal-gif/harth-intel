import { useEffect, useRef, useState } from "react";

// Global loader for the Google Maps JS API (singleton).
let mapsPromise: Promise<any> | null = null;
function loadMaps(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("SSR"));
  if ((window as any).google?.maps?.StreetViewPanorama) {
    return Promise.resolve((window as any).google);
  }
  if (mapsPromise) return mapsPromise;
  const key = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as string | undefined;
  const channel = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID as string | undefined;
  if (!key) return Promise.reject(new Error("missing-key"));
  mapsPromise = new Promise((resolve, reject) => {
    (window as any).__lovableMapsInit = () => resolve((window as any).google);
    const s = document.createElement("script");
    const params = new URLSearchParams({ key, loading: "async", callback: "__lovableMapsInit" });
    if (channel) params.set("channel", channel);
    s.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    s.async = true;
    s.onerror = () => reject(new Error("script-load-failed"));
    document.head.appendChild(s);
  });
  return mapsPromise;
}

export function StreetViewPano({ lat, lng, title }: { lat: number; lng: number; title: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "none" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    loadMaps()
      .then((g) => {
        if (cancelled || !ref.current) return;
        const svc = new g.maps.StreetViewService();
        svc.getPanorama(
          { location: { lat, lng }, radius: 80, source: g.maps.StreetViewSource.OUTDOOR },
          (data: any, status: any) => {
            if (cancelled || !ref.current) return;
            if (status !== g.maps.StreetViewStatus.OK || !data?.location) {
              setState("none");
              return;
            }
            const heading = g.maps.geometry?.spherical
              ? g.maps.geometry.spherical.computeHeading(data.location.latLng!, new g.maps.LatLng(lat, lng))
              : 0;
            new g.maps.StreetViewPanorama(ref.current, {
              pano: data.location.pano,
              pov: { heading, pitch: 0 },
              zoom: 0,
              addressControl: false,
              fullscreenControl: true,
              motionTracking: false,
              motionTrackingControl: false,
              showRoadLabels: false,
            });
            setState("ready");
          }
        );
      })
      .catch(() => !cancelled && setState("error"));
    return () => {
      cancelled = true;
    };
  }, [lat, lng]);

  return (
    <div className="relative h-56 w-full bg-slate-100" aria-label={title}>
      <div ref={ref} className="absolute inset-0" />
      {state !== "ready" && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-500">
          {state === "loading" && "Loading Street View…"}
          {state === "none" && "No Street View imagery here"}
          {state === "error" && "Street View unavailable"}
        </div>
      )}
    </div>
  );
}
