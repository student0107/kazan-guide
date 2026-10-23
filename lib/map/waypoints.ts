/** Точки маршрута в порядке следования: [широта, долгота] для Leaflet. */
export type LatLngTuple = [number, number];

export function poiWaypoints(
  routeIds: string[],
  pois: { id: string; lat: number; lng: number }[]
): LatLngTuple[] {
  return routeIds
    .map((id) => pois.find((p) => p.id === id))
    .filter(Boolean)
    .map((p) => [p!.lat, p!.lng] as LatLngTuple);
}
