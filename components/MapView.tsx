"use client";

import { useEffect, useMemo } from "react";
import {
  MapContainer,
  Marker,
  Popup,
  Polyline,
  TileLayer,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import {
  KAZAN_BOUNDS,
  KAZAN_CENTER,
  DEFAULT_ZOOM,
  OSM_ATTRIBUTION,
  OSM_TILE_URL,
} from "@/lib/map/constants";
import type { Poi, PoiCategory } from "@/lib/poi/types";

const HIGHLIGHT_ACCENT = "#ea580c";

const CATEGORY_COLOR: Record<PoiCategory, string> = {
  sight: "#2563eb",
  cafe: "#16a34a",
  bar: "#9333ea",
};

type MarkerVisual = "default" | "route" | "highlight";

const MARKER_ICON_CLASS = "leaflet-div-icon poi-marker-icon";

function makeIcon(color: string, visual: MarkerVisual) {
  if (visual === "highlight") {
    return L.divIcon({
      className: MARKER_ICON_CLASS,
      html: `<span class="poi-marker-dot poi-marker-dot--highlight" style="background:${color}"></span>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
  }
  if (visual === "route") {
    return L.divIcon({
      className: MARKER_ICON_CLASS,
      html: `<span class="poi-marker-dot poi-marker-dot--route" style="background:${color}"></span>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });
  }
  return L.divIcon({
    className: MARKER_ICON_CLASS,
    html: `<span class="poi-marker-dot" style="background:${color}"></span>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
}

function FitBoundsOnRoute({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length >= 2) {
      map.fitBounds(L.latLngBounds(positions), { padding: [40, 40], maxZoom: 15 });
    }
  }, [map, positions]);
  return null;
}

/** Лёгкий pan к рекомендациям без сильного зума — остальные точки остаются в кадре. */
function PanToHighlights({
  positions,
  triggerKey,
}: {
  positions: [number, number][];
  triggerKey: string;
}) {
  const map = useMap();
  useEffect(() => {
    if (!triggerKey || positions.length === 0) return;
    const bounds = L.latLngBounds(positions);
    const center = bounds.getCenter();
    const zoom = map.getZoom();
    map.flyTo(center, zoom, { duration: 0.6 });
  }, [map, positions, triggerKey]);
  return null;
}

type Props = {
  pois: Poi[];
  routeIds: string[];
  highlightIds: Set<string>;
  onAddToRoute: (id: string) => void;
  onRemoveFromRoute: (id: string) => void;
};

export default function MapView({
  pois,
  routeIds,
  highlightIds,
  onAddToRoute,
  onRemoveFromRoute,
}: Props) {
  const routeSet = useMemo(() => new Set(routeIds), [routeIds]);

  const routePositions = useMemo((): [number, number][] => {
    return routeIds
      .map((id) => pois.find((p) => p.id === id))
      .filter(Boolean)
      .map((p) => [p!.lat, p!.lng] as [number, number]);
  }, [routeIds, pois]);

  const highlightKey = useMemo(
    () => [...highlightIds].sort().join(","),
    [highlightIds]
  );

  const highlightPositions = useMemo((): [number, number][] => {
    return pois
      .filter((p) => highlightIds.has(p.id))
      .map((p) => [p.lat, p.lng] as [number, number]);
  }, [pois, highlightIds]);

  return (
    <MapContainer
      center={[KAZAN_CENTER.lat, KAZAN_CENTER.lng]}
      zoom={DEFAULT_ZOOM}
      maxBounds={KAZAN_BOUNDS}
      minZoom={11}
      className="h-full w-full rounded-lg z-0"
      scrollWheelZoom
    >
      <TileLayer attribution={OSM_ATTRIBUTION} url={OSM_TILE_URL} />
      {highlightKey && highlightPositions.length > 0 && (
        <PanToHighlights
          positions={highlightPositions}
          triggerKey={highlightKey}
        />
      )}
      {routePositions.length >= 2 && (
        <>
          <Polyline positions={routePositions} pathOptions={{ color: HIGHLIGHT_ACCENT, weight: 4 }} />
          <FitBoundsOnRoute positions={routePositions} />
        </>
      )}
      {pois.map((p) => {
        const inRoute = routeSet.has(p.id);
        const highlighted = highlightIds.has(p.id);
        const visual: MarkerVisual = highlighted
          ? "highlight"
          : inRoute
            ? "route"
            : "default";
        const icon = makeIcon(CATEGORY_COLOR[p.category], visual);
        return (
          <Marker
            key={p.id}
            position={[p.lat, p.lng]}
            icon={icon}
            zIndexOffset={highlighted ? 2000 : inRoute ? 1000 : 0}
          >
            <Popup>
              <div className="min-w-[200px] space-y-2">
                <p className="font-medium">{p.name}</p>
                <p className="text-sm text-gray-600">{p.description}</p>
                {inRoute ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => onRemoveFromRoute(p.id)}
                  >
                    Убрать из маршрута
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    className="w-full"
                    onClick={() => onAddToRoute(p.id)}
                  >
                    В маршрут
                  </Button>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
