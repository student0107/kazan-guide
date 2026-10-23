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
  "пообедать",
  "поужинать",
];
const BAR_KEYWORDS = [
  "бар",
  "выпить",
  "пиво",
  "коктейл",
  "вино",
  "паб",
  "ночь",
  "вечером",
  "вечер",
];
const SIGHT_KEYWORDS = [
  "посмотреть",
  "достоприм",
  "музей",
  "экскурс",
  "прогул",
  "фото",
  "мечет",
  "театр",
  "памятник",
  "куда сходить",
  "интересн",
  "осмотр",
  "прогуля",
];

/** Подстроки в запросе → id POI (ориентир «рядом с …») */
const LANDMARK_HINTS: Partial<Record<string, string[]>> = {
  kremlin: ["кремл"],
  baumana: ["бауман"],
  "kaban-lakes": ["кабан"],
  "old-tatar-settlement": ["слобод", "тарск"],
  "farmers-palace": ["земледел", "набереж"],
  "family-center": ["загс"],
  "kul-sharif": ["шариф", "куль"],
  "dom-chaya": ["дом чая"],
  "chak-chak-museum-cafe": ["чак-чак", "чак чак"],
};

const STOP_WORDS = new Set([
  "где",
  "рядом",
  "что",
  "как",
  "какой",
  "какая",
  "какие",
  "можно",
  "нужно",
  "хочу",
  "есть",
  "ли",
  "ещё",
  "еще",
  "very",
  "the",
  "в",
  "на",
  "с",
  "у",
  "и",
  "или",
  "а",
  "но",
  "по",
  "до",
  "из",
  "к",
  "ко",
  "для",
  "про",
  "об",
  "от",
  "во",
  "не",
  "да",
  "нет",
  "мне",
  "нам",
  "вас",
  "меня",
  "этот",
  "этой",
  "этом",
  "тут",
  "здесь",
  "лучше",
  "ближ",
  "подскаж",
  "посовет",
  "скажи",
  "расскаж",
  "пожалуй",
]);

export function inferCategoriesFromText(text: string): PoiCategory[] | null {
  return inferResultCategories(text.toLowerCase());
}

function inferResultCategories(lower: string): PoiCategory[] | null {
  const hasCafe = CAFE_KEYWORDS.some((k) => lower.includes(k));
  const hasBar = BAR_KEYWORDS.some((k) => lower.includes(k));
  const hasSight = SIGHT_KEYWORDS.some((k) => lower.includes(k));

  if (hasCafe || hasBar) {
    if (hasBar && !hasCafe) return ["bar"];
    return hasBar ? ["cafe", "bar"] : ["cafe"];
  }
  if (hasSight) return ["sight"];
  return null;
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

function landmarkHintsForPoi(p: Poi): string[] {
  const hints = new Set<string>();
  for (const h of LANDMARK_HINTS[p.id] ?? []) hints.add(h);
  const nameLower = p.name.toLowerCase();
  for (const word of nameLower.split(/[\s,.«»()—-]+/)) {
    if (word.length >= 4) hints.add(word.slice(0, Math.max(4, word.length - 1)));
  }
  return [...hints];
}

/** Ориентир из текста запроса (Кремль, Баумана и т.д.) */
export function findLandmarkInQuery(query: string): Poi | null {
  const lower = query.toLowerCase();
  let best: Poi | null = null;
  let bestHintLen = 0;

  for (const p of ALL_POI) {
    for (const hint of landmarkHintsForPoi(p)) {
      if (hint.length < 3) continue;
      if (lower.includes(hint) && hint.length > bestHintLen) {
        best = p;
        bestHintLen = hint.length;
      }
    }
  }
  return best;
}

function extractContentTokens(lower: string): string[] {
  return lower
    .split(/\s+/)
    .map((t) => t.replace(/[^\p{L}\p{N}-]/gu, ""))
    .filter((t) => t.length > 2 && !STOP_WORDS.has(t));
}

export type PoiWithDistance = Poi & { distanceKm: number };

export type SearchPoiOptions = {
  query: string;
  categories?: PoiCategory[] | null;
  anchorLat?: number;
  anchorLng?: number;
  limit?: number;
};

export function searchPoi(options: SearchPoiOptions): PoiWithDistance[] {
  const {
    query,
    categories: categoriesOverride,
    anchorLat,
    anchorLng,
    limit = 8,
  } = options;

  const lower = query.toLowerCase().trim();
  const categories = categoriesOverride ?? inferResultCategories(lower);
  const landmark = findLandmarkInQuery(lower);

  const lat = landmark?.lat ?? anchorLat ?? 55.796;
  const lng = landmark?.lng ?? anchorLng ?? 49.106;

  let list = ALL_POI.filter((p) => {
    if (categories && categories.length > 0 && !categories.includes(p.category)) {
      return false;
    }
    return true;
  });

  const contentTokens = extractContentTokens(lower);
  if (contentTokens.length > 0) {
    const textMatched = list.filter((p) => {
      const hay = `${p.name} ${p.description}`.toLowerCase();
      return contentTokens.some((t) => hay.includes(t));
    });
    if (textMatched.length > 0) list = textMatched;
  }

  if (list.length === 0 && categories) {
    list = ALL_POI.filter((p) => categories.includes(p.category));
  }

  if (list.length === 0) {
    list = [...ALL_POI];
  }

  list.sort(
    (a, b) =>
      haversineKm(lat, lng, a.lat, a.lng) -
      haversineKm(lat, lng, b.lat, b.lng)
  );

  return list.slice(0, limit).map((p) => ({
    ...p,
    distanceKm: haversineKm(lat, lng, p.lat, p.lng),
  }));
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
