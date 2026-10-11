"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { PoiFilters } from "@/components/PoiFilters";
import { RouteList } from "@/components/RouteList";
import { ChatPanel, type ChatMessage } from "@/components/ChatPanel";
import { ALL_POI } from "@/lib/poi/data";
import { getPoiById } from "@/lib/poi/data";
import type { PoiCategory } from "@/lib/poi/types";
import { KAZAN_CENTER } from "@/lib/map/constants";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { useSearchParams } from "next/navigation";

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
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 p-4 lg:flex-row">
        <section className="flex flex-1 flex-col gap-3 lg:min-w-0">
          <PoiFilters
            active={categories}
            onToggle={toggleCategory}
            onShowAll={() => setCategories(new Set(["sight", "cafe", "bar"]))}
          />
          <div className="h-[min(55vh,520px)] min-h-[360px] overflow-hidden rounded-lg border">
            <MapView
              pois={filteredPois}
              routeIds={routeIds}
              highlightIds={highlightIds}
              onAddToRoute={addToRoute}
              onRemoveFromRoute={removeFromRoute}
            />
          </div>
          <RouteList
            routePois={routePois}
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
            anchorLat={anchor.lat}
            anchorLng={anchor.lng}
            initialMessages={initialChat}
          />
        </aside>
      </main>
    </div>
  );
}
