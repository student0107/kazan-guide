"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Poi } from "@/lib/poi/types";
import { X } from "lucide-react";

type Props = {
  routePois: Poi[];
  onRemove: (id: string) => void;
  onClear: () => void;
};

export function RouteList({ routePois, onRemove, onClear }: Props) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium">Маршрут</CardTitle>
        {routePois.length > 0 && (
          <Button type="button" variant="ghost" size="sm" onClick={onClear}>
            Очистить
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {routePois.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Добавьте точки с карты или из чата. Линия соединяет их по прямой
            (демо, не по дорогам).
          </p>
        ) : (
          <ol className="space-y-2">
            {routePois.map((p, i) => (
              <li
                key={p.id}
                className="flex items-start justify-between gap-2 text-sm"
              >
                <span>
                  <span className="text-muted-foreground">{i + 1}.</span>{" "}
                  {p.name}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  aria-label={`Убрать ${p.name}`}
                  onClick={() => onRemove(p.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
