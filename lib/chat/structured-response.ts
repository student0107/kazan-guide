import type { Poi } from "@/lib/poi/types";
import { matchPoiIdsInText } from "@/lib/poi/search";

export type StructuredChatPayload = {
  reply: string;
  poi_ids: string[];
};

function extractJsonObject(raw: string): string {
  const trimmed = raw.trim();
  const fence = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/i);
  if (fence) return fence[1].trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);
  return trimmed;
}

/** Разбор JSON от модели; при ошибке — plain text + matchPoiIdsInText. */
export function parseStructuredChatResponse(
  raw: string,
  candidates: Poi[]
): { reply: string; poiIds: string[] } {
  const allowed = new Set(candidates.map((p) => p.id));
  const fallbackReply =
    raw.trim() || "Не удалось получить ответ. Попробуйте ещё раз.";

  try {
    const parsed = JSON.parse(extractJsonObject(raw)) as Partial<
      StructuredChatPayload & { poiIds?: string[] }
    >;
    const reply = String(parsed.reply ?? "").trim();
    const idsSource = parsed.poi_ids ?? parsed.poiIds;
    const poiIds = Array.isArray(idsSource)
      ? [...new Set(idsSource.map(String).filter((id) => allowed.has(id)))]
      : [];

    if (reply) {
      return { reply, poiIds };
    }
  } catch {
    // plain-text fallback below
  }

  return {
    reply: fallbackReply,
    poiIds: matchPoiIdsInText(fallbackReply, candidates),
  };
}
