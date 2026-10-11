import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchPoi, matchPoiIdsInText } from "@/lib/poi/search";
import { createPolzaClient, getPolzaModel } from "@/lib/polza";

const DAILY_LIMIT = 20;

function moscowDateString(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Moscow",
  }).format(new Date());
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Войдите, чтобы пользоваться чатом" }, { status: 401 });
    }

    const body = await request.json();
    const message = String(body.message ?? "").trim();
    const sessionId = body.sessionId ? String(body.sessionId) : null;
    const anchorLat = Number(body.anchorLat) || 55.796;
    const anchorLng = Number(body.anchorLng) || 49.106;

    if (!message || message.length > 500) {
      return NextResponse.json({ error: "Некорректное сообщение" }, { status: 400 });
    }

    const today = moscowDateString();
    const { data: usageRow } = await supabase
      .from("usage_daily")
      .select("message_count")
      .eq("user_id", user.id)
      .eq("date", today)
      .maybeSingle();

    const count = usageRow?.message_count ?? 0;
    if (count >= DAILY_LIMIT) {
      return NextResponse.json(
        { error: `Лимит ${DAILY_LIMIT} сообщений в день исчерпан` },
        { status: 429 }
      );
    }

    let activeSessionId = sessionId;
    if (activeSessionId) {
      const { data: existing } = await supabase
        .from("chat_sessions")
        .select("id")
        .eq("id", activeSessionId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!existing) activeSessionId = null;
    }

    if (!activeSessionId) {
      const title = message.slice(0, 60) + (message.length > 60 ? "…" : "");
      const { data: created, error: sessionError } = await supabase
        .from("chat_sessions")
        .insert({ user_id: user.id, title })
        .select("id")
        .single();
      if (sessionError || !created) {
        return NextResponse.json({ error: "Не удалось создать диалог" }, { status: 500 });
      }
      activeSessionId = created.id;
    }

    const candidates = searchPoi({
      query: message,
      anchorLat,
      anchorLng,
      limit: 8,
    });

    const poiListText = candidates
      .map(
        (p) =>
          `- id: ${p.id}; название: ${p.name}; тип: ${p.category}; описание: ${p.description}`
      )
      .join("\n");

    const systemPrompt = `Ты дружелюбный гид по Казани для российских туристов.
Правила:
- Рекомендуй ТОЛЬКО места из списка ниже (по их id и названию).
- Не придумывай новые заведения и не давай время в пути — это демо-карта, не навигатор.
- Отвечай кратко на русском, 2–4 предложения.
- Если список пуст или не подходит — честно скажи и предложи переформулировать.

Список мест:
${poiListText || "(нет подходящих мест — скажи об этом)"}`;

    let reply: string;
    try {
      const openai = createPolzaClient();
      const completion = await openai.chat.completions.create({
        model: getPolzaModel(),
        max_tokens: 700,
        temperature: 0.6,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
      });
      reply =
        completion.choices[0]?.message?.content?.trim() ??
        "Не удалось получить ответ. Попробуйте ещё раз.";
    } catch {
      return NextResponse.json(
        { error: "Сервис AI недоступен. Проверьте POLZA_API_KEY." },
        { status: 502 }
      );
    }

    const poiIds = matchPoiIdsInText(reply, candidates);

    await supabase.from("chat_messages").insert([
      { session_id: activeSessionId, role: "user", content: message, poi_ids: [] },
      {
        session_id: activeSessionId,
        role: "assistant",
        content: reply,
        poi_ids: poiIds,
      },
    ]);

    await supabase.from("usage_daily").upsert(
      {
        user_id: user.id,
        date: today,
        message_count: count + 1,
      },
      { onConflict: "user_id,date" }
    );

    return NextResponse.json({
      sessionId: activeSessionId,
      reply,
      poiIds,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Внутренняя ошибка" }, { status: 500 });
  }
}
