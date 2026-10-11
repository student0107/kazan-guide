"use client";

import { useEffect, useRef, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import Link from "next/link";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  poiIds?: string[];
};

type Props = {
  sessionId: string | null;
  onSessionId: (id: string) => void;
  onHighlightPoi: (ids: string[]) => void;
  anchorLat: number;
  anchorLng: number;
  initialMessages?: ChatMessage[];
  isLoggedIn: boolean;
};

export function ChatPanel({
  sessionId,
  onSessionId,
  onHighlightPoi,
  anchorLat,
  anchorLng,
  initialMessages = [],
  isLoggedIn,
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    if (!isLoggedIn) return;

    setError(null);
    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          sessionId,
          anchorLat,
          anchorLng,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Ошибка запроса");
      }
      if (data.sessionId) onSessionId(data.sessionId);
      const assistant: ChatMessage = {
        role: "assistant",
        content: data.reply,
        poiIds: data.poiIds ?? [],
      };
      setMessages((m) => [...m, assistant]);
      if (data.poiIds?.length) onHighlightPoi(data.poiIds);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Не удалось отправить";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  if (!isLoggedIn) {
    return (
      <Card className="flex h-full flex-col shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">AI-гид</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>Войдите, чтобы спрашивать «где поесть» и сохранять историю диалогов.</p>
          <Link
            href="/login"
            className={cn(buttonVariants(), "mt-4 inline-flex")}
          >
            Войти или зарегистрироваться
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex h-full min-h-[320px] flex-col shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">AI-гид по Казани</CardTitle>
        <p className="text-xs text-muted-foreground">
          Советы только по местам из нашей базы. Не навигатор.
        </p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-2 overflow-hidden pb-4">
        <ScrollArea className="flex-1 rounded-md border p-3">
          <div className="space-y-3 pr-2">
            {messages.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Например: «где поесть рядом с Кремлём» или «куда сходить вечером»
              </p>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`rounded-lg px-3 py-2 text-sm ${
                  m.role === "user"
                    ? "ml-8 bg-primary text-primary-foreground"
                    : "mr-4 bg-muted"
                }`}
              >
                {m.content}
              </div>
            ))}
            {loading && (
              <p className="text-sm text-muted-foreground">Думаю…</p>
            )}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ваш вопрос…"
            disabled={loading}
            maxLength={500}
          />
          <Button type="submit" disabled={loading || !input.trim()}>
            Отправить
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
