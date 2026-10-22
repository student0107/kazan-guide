"use client";

import { useEffect, useMemo, useState } from "react";
import type { LatLngTuple } from "@/lib/map/waypoints";

export type RouteSummary = { distanceM: number; durationS: number };

export type WalkingRouteState = {
  linePositions: LatLngTuple[];
  loading: boolean;
  source: "walking" | "straight";
  summary: RouteSummary | null;
  usedFallback: boolean;
};

const emptyState: WalkingRouteState = {
  linePositions: [],
  loading: false,
  source: "straight",
  summary: null,
  usedFallback: false,
};

export function useWalkingRoute(waypoints: LatLngTuple[]): WalkingRouteState {
  const waypointsKey = useMemo(() => JSON.stringify(waypoints), [waypoints]);
  const [state, setState] = useState<WalkingRouteState>(emptyState);

  useEffect(() => {
    const points = JSON.parse(waypointsKey) as LatLngTuple[];
    if (points.length < 2) {
      setState(emptyState);
      return;
    }

    const straight = points;
    let cancelled = false;
    const controller = new AbortController();

    setState({
      linePositions: straight,
      loading: true,
      source: "straight",
      summary: null,
      usedFallback: false,
    });

    void (async () => {
      try {
        const res = await fetch("/api/route", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            points: points.map(([lat, lng]) => ({ lat, lng })),
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error(`route ${res.status}`);
        }

        const data = (await res.json()) as {
          coordinates: LatLngTuple[];
          summary: RouteSummary | null;
        };

        if (cancelled) return;

        setState({
          linePositions:
            Array.isArray(data.coordinates) && data.coordinates.length >= 2
              ? data.coordinates
              : straight,
          loading: false,
          source: "walking",
          summary: data.summary ?? null,
          usedFallback: false,
        });
      } catch (err) {
        if (cancelled || (err instanceof DOMException && err.name === "AbortError")) {
          return;
        }
        setState({
          linePositions: straight,
          loading: false,
          source: "straight",
          summary: null,
          usedFallback: true,
        });
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [waypointsKey]);

  return state;
}
