"use client";

import { Button } from "@/components/ui/button";
import { getPoiById } from "@/lib/poi/data";

type Props = {
  poiIds: string[];
  onHighlightPoi: (ids: string[]) => void;
  onAddToRoute: (id: string) => void;
};

export function ChatAssistantPlaces({
  poiIds,
  onHighlightPoi,
  onAddToRoute,
}: Props) {
  const places = poiIds
    .map((id) => ({ id, poi: getPoiById(id) }))
    .filter((x): x is { id: string; poi: NonNullable<ReturnType<typeof getPoiById>> } =>
      Boolean(x.poi)
    );

  if (places.length === 0) return null;

  return (
    <ul className="mt-2 flex flex-col gap-2 border-t border-border/60 pt-2">
      {places.map(({ id, poi }) => (
        <li
          key={id}
          className="flex flex-wrap items-center gap-1.5 rounded-md bg-background/80 px-2 py-1.5"
        >
          <span className="min-w-0 flex-1 text-xs font-medium leading-snug">
            {poi.name}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 shrink-0 px-2 text-xs"
            onClick={() => onHighlightPoi([id])}
          >
            На карте
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-7 shrink-0 px-2 text-xs"
            onClick={() => onAddToRoute(id)}
          >
            + маршрут
          </Button>
        </li>
      ))}
    </ul>
  );
}
