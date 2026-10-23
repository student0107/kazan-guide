"use client";

import { useEffect, useMemo, useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  KAZAN_BOUNDS,
  KAZAN_CENTER,
  DEFAULT_ZOOM,
  OSM_ATTRIBUTION,
  OSM_TILE_URL,
} from "@/lib/map/constants";
import type { LatLngTuple } from "@/lib/map/waypoints";
import type { Poi, PoiCategory } from "@/lib/poi/types";

const MAP_COLOR_FALLBACK = {
  mapAccent: "#c2410c",
  sight: "#2563eb",
  cafe: "#16a34a",
  bar: "#9333ea",
} as const;

const TAG_LABELS: Record<string, string> = {
  must_see: "Главное",
};

function readMapColors(): Record<PoiCategory | "mapAccent", string> {
  if (typeof document === "undefined") {
    return { ...MAP_COLOR_FALLBACK };
  }
  const root = getComputedStyle(document.documentElement);
  const pick = (name: string, fallback: string) =>
    root.getPropertyValue(name).trim() || fallback;
  return {
    mapAccent: pick("--map-accent", MAP_COLOR_FALLBACK.mapAccent),
    sight: pick("--poi-sight", MAP_COLOR_FALLBACK.sight),
    cafe: pick("--poi-cafe", MAP_COLOR_FALLBACK.cafe),
    bar: pick("--poi-bar", MAP_COLOR_FALLBACK.bar),
  };
}

function useMapColors() {
  const [colors, setColors] = useState(readMapColors);
  useEffect(() => {
    setColors(readMapColors());
  }, []);
  return colors;
}

function MapLoadingPlaceholder() {
  return (
    <div className="flex h-full min-h-[360px] items-center justify-center rounded-lg bg-muted text-sm text-muted-foreground">
      Загрузка карты…
    </div>
  );
}

/** Leaflet needs a stable DOM container; defer until after client layout (incl. soft navigation). */
function useLeafletMountReady() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const frame = requestAnimationFrame(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      setReady(false);
    };
  }, []);
  return ready;
}

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
  routeLine: LatLngTuple[];
  routeLineLoading?: boolean;
  highlightIds: Set<string>;
  onAddToRoute: (id: string) => void;
  onRemoveFromRoute: (id: string) => void;
};

export default function MapView({
  pois,
  routeIds,
  routeLine,
  routeLineLoading = false,
  highlightIds,
  onAddToRoute,
  onRemoveFromRoute,
}: Props) {
  const leafletReady = useLeafletMountReady();
  const colors = useMapColors();
  const categoryColor: Record<PoiCategory, string> = useMemo(
    () => ({
      sight: colors.sight,
      cafe: colors.cafe,
      bar: colors.bar,
    }),
    [colors]
  );

  const routeSet = useMemo(() => new Set(routeIds), [routeIds]);

  const highlightKey = useMemo(
    () => [...highlightIds].sort().join(","),
    [highlightIds]
  );

  const highlightPositions = useMemo((): [number, number][] => {
    return pois
      .filter((p) => highlightIds.has(p.id))
      .map((p) => [p.lat, p.lng] as [number, number]);
  }, [pois, highlightIds]);

  if (!leafletReady) {
    return <MapLoadingPlaceholder />;
  }

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
      {routeLine.length >= 2 && (
        <>
          <Polyline
            positions={routeLine}
            pathOptions={{
              color: colors.mapAccent,
              weight: 4,
              opacity: routeLineLoading ? 0.55 : 1,
              dashArray: routeLineLoading ? "8 8" : undefined,
            }}
          />
          <FitBoundsOnRoute positions={routeLine} />
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
        const icon = makeIcon(categoryColor[p.category], visual);
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
                <p className="text-sm text-muted-foreground">{p.description}</p>
                {p.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {p.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {TAG_LABELS[tag] ?? tag}
                      </Badge>
                    ))}
                  </div>
                )}
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
