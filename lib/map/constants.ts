/** Центр Казани */
export const KAZAN_CENTER = { lat: 55.796, lng: 49.106 } as const;

/** Ограничение карты: юго-запад и северо-восток */
export const KAZAN_BOUNDS: [[number, number], [number, number]] = [
  [55.72, 48.95],
  [55.88, 49.28],
];

export const DEFAULT_ZOOM = 13;

const CARTO_VOYAGER_TILE =
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

const cartoBasemapsKey = process.env.NEXT_PUBLIC_CARTO_BASEMAPS_KEY?.trim();

/** Carto raster tiles require `?key=` since 2026; key from .env.local / Vercel. */
export const OSM_TILE_URL = cartoBasemapsKey
  ? `${CARTO_VOYAGER_TILE}?key=${encodeURIComponent(cartoBasemapsKey)}`
  : CARTO_VOYAGER_TILE;

export const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';
