import type { Poi, PoiCategory } from "./types";
import { ALL_POI } from "./data";

const CAFE_KEYWORDS = [
  "есть",
  "поесть",
  "кафе",
  "обед",
  "ужин",
  "завтрак",
  "кофе",
  "чай",
  "перекус",
  "кухн",
  "ресторан",
];
const BAR_KEYWORDS = ["бар", "выпить", "пиво", "коктейл", "вино", "паб", "ночь"];
const SIGHT_KEYWORDS = [
  "посмотреть",
  "достоприм",
  "музей",
  "экскурс",
  "прогул",
  "фото",
  "кремл",
  "мечет",
  "театр",
  "памятник",
  "куда сходить",
  "интересн",
];

export function inferCategoriesFromText(text: string): PoiCategory[] | null {
  const lower = text.toLowerCase();
  const categories = new Set<PoiCategory>();
  if (CAFE_KEYWORDS.some((k) => lower.includes(k))) categories.add("cafe");
  if (BAR_KEYWORDS.some((k) => lower.includes(k))) categories.add("bar");
  if (SIGHT_KEYWORDS.some((k) => lower.includes(k))) categories.add("sight");
  if (categories.size === 0) return null;
  return [...categories];
}

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export type SearchPoiOptions = {
  query: string;
  categories?: PoiCategory[] | null;
  anchorLat?: number;
  anchorLng?: number;
  limit?: number;
};

export function searchPoi(options: SearchPoiOptions): Poi[] {
  const {
    query,
    categories = inferCategoriesFromText(query),
    anchorLat,
    anchorLng,
    limit = 8,
  } = options;

  const lower = query.toLowerCase().trim();
  const tokens = lower.split(/\s+/).filter((t) => t.length > 2);

  let list = ALL_POI.filter((p) => {
    if (categories && categories.length > 0 && !categories.includes(p.category)) {
      return false;
    }
    if (!lower) return true;
    const hay = `${p.name} ${p.description}`.toLowerCase();
    if (tokens.length === 0) return true;
    return tokens.some((t) => hay.includes(t));
  });

  if (list.length === 0 && categories) {
    list = ALL_POI.filter((p) => categories.includes(p.category));
  }

  if (list.length === 0) {
    list = [...ALL_POI];
  }

  const lat = anchorLat ?? 55.796;
  const lng = anchorLng ?? 49.106;

  list.sort(
    (a, b) =>
      haversineKm(lat, lng, a.lat, a.lng) -
      haversineKm(lat, lng, b.lat, b.lng)
  );

  return list.slice(0, limit);
}

/** Найти id мест, упомянутых в тексте ответа модели */
export function matchPoiIdsInText(text: string, candidates: Poi[]): string[] {
  const lower = text.toLowerCase();
  const ids: string[] = [];
  for (const p of candidates) {
    if (lower.includes(p.name.toLowerCase())) {
      ids.push(p.id);
    }
  }
  return ids;
}
