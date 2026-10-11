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

const CATEGORY_COLOR: Record<PoiCategory, string> = {
  sight: "#2563eb",
  cafe: "#16a34a",
  bar: "#9333ea",
};

function makeIcon(color: string, highlighted: boolean) {
  const size = highlighted ? 16 : 12;
  return L.divIcon({
    className: "",
    html: `<span style="
      display:block;width:${size}px;height:${size}px;
      background:${color};border:2px solid white;border-radius:50%;
      box-shadow:0 1px 4px rgba(0,0,0,.35);
      ${highlighted ? "transform:scale(1.2);" : ""}
    "></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
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
      {routePositions.length >= 2 && (
        <>
          <Polyline positions={routePositions} pathOptions={{ color: "#ea580c", weight: 4 }} />
          <FitBoundsOnRoute positions={routePositions} />
        </>
      )}
      {pois.map((p) => {
        const inRoute = routeSet.has(p.id);
        const highlighted = highlightIds.has(p.id);
        const icon = makeIcon(CATEGORY_COLOR[p.category], highlighted || inRoute);
        return (
          <Marker key={p.id} position={[p.lat, p.lng]} icon={icon}>
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
