"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PoiCategory } from "@/lib/poi/types";

const LABELS: Record<PoiCategory, string> = {
  sight: "Достопримечательности",
  cafe: "Кафе",
  bar: "Бары",
};

type Props = {
  active: Set<PoiCategory>;
  onToggle: (category: PoiCategory) => void;
  onShowAll: () => void;
};

export function PoiFilters({ active, onToggle, onShowAll }: Props) {
  const allOn = active.size === 3;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted-foreground">Фильтр:</span>
      {(Object.keys(LABELS) as PoiCategory[]).map((cat) => {
        const on = active.has(cat);
        return (
          <Button
            key={cat}
            type="button"
            size="sm"
            variant={on ? "default" : "outline"}
            onClick={() => onToggle(cat)}
          >
            {LABELS[cat]}
          </Button>
        );
      })}
      {!allOn && (
        <Button type="button" size="sm" variant="ghost" onClick={onShowAll}>
          Показать все
        </Button>
      )}
      <Badge variant="secondary" className="ml-auto">
        {active.size === 3 ? "Все типы" : `${active.size} тип(а)`}
      </Badge>
    </div>
  );
}
