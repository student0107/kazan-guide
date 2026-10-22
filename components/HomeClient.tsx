"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { HomeHero } from "@/components/HomeHero";
import { PoiFilters } from "@/components/PoiFilters";
import { RouteList } from "@/components/RouteList";
import { DemoRouteButton } from "@/components/DemoRouteButton";
import { DEMO_ROUTE_IDS } from "@/lib/demo/route-ids";
import { ChatPanel, type ChatMessage } from "@/components/ChatPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin } from "lucide-react";
import { ALL_POI } from "@/lib/poi/data";
import { getPoiById } from "@/lib/poi/data";
import type { PoiCategory } from "@/lib/poi/types";
import { KAZAN_CENTER } from "@/lib/map/constants";
import { useWalkingRoute } from "@/lib/map/use-walking-route";
import { poiWaypoints } from "@/lib/map/waypoints";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { useSearchParams } from "next/navigation";

const DISTRICTS = [
  {
    title: "Центр / Кремль",
    text: "Белокаменный кремль и вид на Кул-Шариф. Хорошая точка, чтобы начать прогулку.",
  },
  {
    title: "Баумана",
    text: "Пешеходная улица с кафе и магазинами. Удобно перекусить между достопримечательностями.",
  },
  {
    title: "Старо-Татарская слобода",
    text: "Тихие улочки, деревянные дома и мечети у озера Кабан. Другой ритм города рядом с центром.",
  },
];

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[360px] items-center justify-center rounded-lg bg-muted text-sm text-muted-foreground">
      Загрузка карты…
    </div>
  ),
});

export function HomeClient() {
  const searchParams = useSearchParams();
  const sessionParam = searchParams.get("session");

  const [user, setUser] = useState<User | null>(null);
  const [categories, setCategories] = useState<Set<PoiCategory>>(
    () => new Set(["sight", "cafe", "bar"])
  );
  const [routeIds, setRouteIds] = useState<string[]>([]);
  const [highlightIds, setHighlightIds] = useState<Set<string>>(() => new Set());
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);
  const [initialChat, setInitialChat] = useState<ChatMessage[]>([]);

  const supabase = useMemo(() => {
    try {
      return createClient();
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    if (!sessionParam || !user || !supabase) return;
    void (async () => {
      const { data: session } = await supabase
        .from("chat_sessions")
        .select("id")
        .eq("id", sessionParam)
        .single();
      if (!session) return;
      setChatSessionId(session.id);
      const { data: rows } = await supabase
        .from("chat_messages")
        .select("role, content, poi_ids")
        .eq("session_id", session.id)
        .order("created_at", { ascending: true });
      if (rows) {
        const msgs: ChatMessage[] = rows.map((r) => ({
          role: r.role as "user" | "assistant",
          content: r.content,
          poiIds: (r.poi_ids as string[]) ?? [],
        }));
        setInitialChat(msgs);
        const lastWithPoi = [...msgs].reverse().find((m) => m.poiIds?.length);
        if (lastWithPoi?.poiIds) {
          setHighlightIds(new Set(lastWithPoi.poiIds));
        }
      }
    })();
  }, [sessionParam, user, supabase]);

  const filteredPois = useMemo(
    () => ALL_POI.filter((p) => categories.has(p.category)),
    [categories]
  );

  const routePois = useMemo(
    () =>
      routeIds
        .map((id) => getPoiById(id))
        .filter((p): p is NonNullable<typeof p> => Boolean(p)),
    [routeIds]
  );

  const routeWaypoints = useMemo(
    () => poiWaypoints(routeIds, ALL_POI),
    [routeIds]
  );
  const walkingRoute = useWalkingRoute(routeWaypoints);

  const anchor = useMemo(() => {
    const last = routePois[routePois.length - 1];
    return last
      ? { lat: last.lat, lng: last.lng }
      : { lat: KAZAN_CENTER.lat, lng: KAZAN_CENTER.lng };
  }, [routePois]);

  const toggleCategory = useCallback((cat: PoiCategory) => {
    setCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      if (next.size === 0) return new Set(["sight", "cafe", "bar"]);
      return next;
    });
  }, []);

  const addToRoute = useCallback((id: string) => {
    setRouteIds((ids) => (ids.includes(id) ? ids : [...ids, id]));
  }, []);

  const removeFromRoute = useCallback((id: string) => {
    setRouteIds((ids) => ids.filter((x) => x !== id));
  }, []);

  const handleSignOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setChatSessionId(null);
    setInitialChat([]);
  }, [supabase]);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader user={user} onSignOut={() => void handleSignOut()} />
      <HomeHero />
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 p-4 lg:flex-row">
        <section className="flex flex-1 flex-col gap-3 lg:min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <PoiFilters
              active={categories}
              onToggle={toggleCategory}
              onShowAll={() => setCategories(new Set(["sight", "cafe", "bar"]))}
            />
            <div className="ml-auto shrink-0">
              <DemoRouteButton
                onApply={() => setRouteIds([...DEMO_ROUTE_IDS])}
              />
            </div>
          </div>
          <Card className="gap-0 overflow-hidden py-0 shadow-md">
            <CardHeader className="py-3">
              <CardTitle
                id="map-heading"
                tabIndex={-1}
                className="flex items-center gap-2 text-base font-medium outline-none"
              >
                <MapPin className="size-4 text-primary" aria-hidden />
                Карта
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0">
              <div
                id="map-section"
                tabIndex={-1}
                className="h-[min(55vh,520px)] min-h-[360px] scroll-mt-3 overflow-hidden outline-none"
              >
                <MapView
                  key={`map-${user?.id ?? "guest"}`}
                  pois={filteredPois}
                  routeIds={routeIds}
                  routeLine={walkingRoute.linePositions}
                  routeLineLoading={walkingRoute.loading}
                  highlightIds={highlightIds}
                  onAddToRoute={addToRoute}
                  onRemoveFromRoute={removeFromRoute}
                />
              </div>
            </CardContent>
          </Card>
          <RouteList
            routePois={routePois}
            routeLoading={walkingRoute.loading}
            routeSource={walkingRoute.source}
            routeSummary={walkingRoute.summary}
            routeUsedFallback={walkingRoute.usedFallback}
            onRemove={removeFromRoute}
            onClear={() => setRouteIds([])}
          />
        </section>
        <aside className="flex w-full flex-col gap-3 lg:w-[380px] lg:shrink-0">
          <ChatPanel
            isLoggedIn={Boolean(user)}
            sessionId={chatSessionId}
            onSessionId={setChatSessionId}
            onHighlightPoi={(ids) => setHighlightIds(new Set(ids))}
            onAddToRoute={addToRoute}
            anchorLat={anchor.lat}
            anchorLng={anchor.lng}
            initialMessages={initialChat}
          />
        </aside>
      </main>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 pt-1 pb-8">
        <section
          id="about-kazan"
          tabIndex={-1}
          aria-labelledby="about-kazan-title"
          className="scroll-mt-4 outline-none"
        >
          <Card>
            <CardHeader>
              <h2 id="about-kazan-title" className="text-lg font-medium">
                О городе
              </h2>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Казанский Кремль стоит на холме у Волги: белые стены, башни и
                мечеть Кул-Шариф с голубыми куполами. В нескольких минутах
                пешком — улица Баумана: кафе, сувениры и спокойная прогулка по
                центру. От Кремля удобно начать день и без спешки спуститься к
                Баумана.
              </p>
            </CardContent>
          </Card>
        </section>
        <section
          id="kazan-districts"
          tabIndex={-1}
          aria-labelledby="kazan-districts-title"
          className="scroll-mt-4 outline-none"
        >
          <h2 id="kazan-districts-title" className="mb-3 text-lg font-medium">
            Районы
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {DISTRICTS.map((item) => (
              <Card key={item.title} size="sm">
                <CardHeader>
                  <h3 className="font-medium">{item.title}</h3>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {item.text}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
