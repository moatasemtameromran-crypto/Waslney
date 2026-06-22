import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export interface MapMarker {
  lat: number;
  lng: number;
  label?: string;
  type?: "bus" | "pickup" | "dropoff" | "stop";
}

function makeIcon(type?: string) {
  const emoji = type === "bus" ? "🚌" : type === "pickup" ? "🟢" : type === "dropoff" ? "🔴" : "📍";
  return L.divIcon({
    html: `<div style="font-size:24px;line-height:24px;filter:drop-shadow(0 1px 2px rgba(0,0,0,.7))">${emoji}</div>`,
    className: "",
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -12],
  });
}

// A self-contained Leaflet map. Pass markers (and optionally a polyline path);
// it auto-fits to show everything. Uses emoji divIcons so no marker-image setup
// is needed in the bundler.
export default function MapView({
  markers,
  polyline,
  height = 360,
  center = [30.0444, 31.2357], // Cairo
  zoom = 11,
}: {
  markers: MapMarker[];
  polyline?: [number, number][];
  height?: number;
  center?: [number, number];
  zoom?: number;
}) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!elRef.current || mapRef.current) return;
    const map = L.map(elRef.current, { center, zoom, scrollWheelZoom: true });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    // Map may render before layout settles; nudge it once.
    setTimeout(() => map.invalidateSize(), 100);
    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    const pts: [number, number][] = [];
    for (const m of markers) {
      if (m.lat == null || m.lng == null || isNaN(m.lat) || isNaN(m.lng)) continue;
      const marker = L.marker([m.lat, m.lng], { icon: makeIcon(m.type) });
      if (m.label) marker.bindPopup(m.label);
      marker.addTo(layer);
      pts.push([m.lat, m.lng]);
    }

    if (polyline && polyline.length > 1) {
      L.polyline(polyline, { color: "#fbbf24", weight: 3, opacity: 0.7 }).addTo(layer);
      polyline.forEach((p) => pts.push(p));
    }

    if (pts.length === 1) {
      map.setView(pts[0], 14);
    } else if (pts.length > 1) {
      map.fitBounds(L.latLngBounds(pts), { padding: [30, 30], maxZoom: 15 });
    }
  }, [markers, polyline]);

  return <div ref={elRef} style={{ height }} className="w-full rounded-xl overflow-hidden border border-border z-0" />;
}
