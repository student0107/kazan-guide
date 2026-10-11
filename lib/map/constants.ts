/** Центр Казани */
export const KAZAN_CENTER = { lat: 55.796, lng: 49.106 } as const;

/** Ограничение карты: юго-запад и северо-восток */
export const KAZAN_BOUNDS: [[number, number], [number, number]] = [
  [55.72, 48.95],
  [55.88, 49.28],
];

export const DEFAULT_ZOOM = 13;

export const OSM_TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
export const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
