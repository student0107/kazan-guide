"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatWalkingSummary } from "@/lib/map/format-route-summary";
import type { RouteSummary } from "@/lib/map/use-walking-route";
import type { Poi } from "@/lib/poi/types";
import { Route, X } from "lucide-react";

type Props = {
  routePois: Poi[];
  routeLoading?: boolean;
  routeSource?: "walking" | "straight";
  routeSummary?: RouteSummary | null;
  routeUsedFallback?: boolean;
  onRemove: (id: string) => void;
  onClear: () => void;
};

export function RouteList({
  routePois,
  routeLoading = false,
  routeSource = "straight",
  routeSummary = null,
  routeUsedFallback = false,
  onRemove,
  onClear,
}: Props) {
  return (
    <Card className="shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <Route className="size-4 text-primary" aria-hidden />
          Маршрут
        </CardTitle>
        {routePois.length > 0 && (
          <Button type="button" variant="ghost" size="sm" onClick={onClear}>
            Очистить
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {routePois.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Добавьте точки с карты или из чата. Маршрут строится пешком по
            улицам (OpenRouteService). Без ключа в настройках — линия по
            прямой.
          </p>
        ) : (
          <>
            {routePois.length >= 2 && (
              <div className="space-y-1 text-sm text-muted-foreground">
                {routeLoading && <p>Строим маршрут по улицам…</p>}
                {!routeLoading &&
                  routeSource === "walking" &&
                  routeSummary && (
                    <>
                      <p>
                        {formatWalkingSummary(
                          routeSummary.distanceM,
                          routeSummary.durationS
                        )}
                      </p>
                      <p className="text-xs">
                        Маршрут:{" "}
                        <a
                          href="https://openrouteservice.org"
                          className="underline underline-offset-2"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          openrouteservice.org
                        </a>
                      </p>
                    </>
                  )}
                {!routeLoading && routeUsedFallback && (
                  <p className="text-amber-800 dark:text-amber-200">
                    Не удалось построить путь по улицам — показана линия по
                    прямой между точками.
                  </p>
                )}
              </div>
            )}
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
          </>
        )}
      </CardContent>
    </Card>
  );
}
