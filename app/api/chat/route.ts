import { NextResponse } from "next/server";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { createClient } from "@/lib/supabase/server";
import { parseStructuredChatResponse } from "@/lib/chat/structured-response";
import { searchPoi } from "@/lib/poi/search";
import { createPolzaClient, getPolzaModel } from "@/lib/polza";

const DAILY_LIMIT = 20;
/** Последние реплики в контексте модели (пары user/assistant). */
const HISTORY_MESSAGE_LIMIT = 20;

type HistoryRow = { role: string; content: string };

async function loadSessionHistory(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sessionId: string
): Promise<ChatCompletionMessageParam[]> {
  const { data, error } = await supabase
    .from("chat_messages")
    .select("role, content")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(HISTORY_MESSAGE_LIMIT);

  if (error || !data?.length) return [];

  return (data as HistoryRow[])
    .reverse()
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));
}

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

    if (!activeSessionId) {
      return NextResponse.json({ error: "Не удалось создать диалог" }, { status: 500 });
    }

    const candidates = searchPoi({
      query: message,
      anchorLat,
      anchorLng,
      limit: 8,
    });

    const poiListText = candidates
      .map((p) => {
        const dist =
          p.distanceKm < 1
            ? `${Math.round(p.distanceKm * 1000)} м`
            : `${p.distanceKm.toFixed(1)} км`;
        return `- id: ${p.id}; название: ${p.name}; тип: ${p.category}; ~${dist} от точки «рядом»; описание: ${p.description}`;
      })
      .join("\n");

    const allowedIds = candidates.map((p) => p.id).join(", ") || "—";

    const systemPrompt = `Ты дружелюбный AI-гид по Казани для российских туристов.
Правила:
- Если в списке ниже есть подходящие места — порекомендуй 1–3 из них в поле reply (упомяни названия).
- В poi_ids укажи только id из списка, которые реально рекомендуешь; иначе [].
- Не придумывай заведения вне списка. Расстояния (~м/км) — ориентир, не маршрут и не время в пути (это демо-карта, не навигатор).
- Поле reply: кратко на русском, 2–4 предложения.
- Если список пуст — скажи в reply и предложи переформулировать; poi_ids: [].
- На вопросы не про Казань (кто ты, какая модель): одно короткое предложение в reply, poi_ids: [].
- Учитывай предыдущие сообщения: уточнения («ещё вариант», «поближе») относятся к прошлым рекомендациям.

Формат ответа: один JSON-объект без markdown, строго:
{"reply":"текст для пользователя","poi_ids":["id1","id2"]}
Допустимые id сейчас: ${allowedIds}

Список мест:
${poiListText || "(список пуст — попроси уточнить запрос)"}`;

    const historyMessages = await loadSessionHistory(supabase, activeSessionId);

    let reply: string;
    let poiIds: string[];
    try {
      const openai = createPolzaClient();
      const chatMessages: ChatCompletionMessageParam[] = [
        { role: "system", content: systemPrompt },
        ...historyMessages,
        { role: "user", content: message },
      ];

      let rawContent: string | null | undefined;
      try {
        const completion = await openai.chat.completions.create({
          model: getPolzaModel(),
          max_tokens: 800,
          temperature: 0.6,
          response_format: { type: "json_object" },
          messages: chatMessages,
        });
        rawContent = completion.choices[0]?.message?.content;
      } catch {
        const completion = await openai.chat.completions.create({
          model: getPolzaModel(),
          max_tokens: 800,
          temperature: 0.6,
          messages: chatMessages,
        });
        rawContent = completion.choices[0]?.message?.content;
      }

      const parsed = parseStructuredChatResponse(
        rawContent?.trim() ?? "",
        candidates
      );
      reply = parsed.reply;
      poiIds = parsed.poiIds;
    } catch {
      return NextResponse.json(
        { error: "Сервис AI недоступен. Проверьте POLZA_API_KEY." },
        { status: 502 }
      );
    }

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
