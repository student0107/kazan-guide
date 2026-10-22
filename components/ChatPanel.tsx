"use client";

import { useEffect, useRef, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import Link from "next/link";
import { ChatAssistantPlaces } from "@/components/ChatAssistantPlaces";
import { MessageCircle } from "lucide-react";

const CHAT_SUGGESTIONS = [
  "Где поесть у Кремля?",
  "Куда сходить вечером?",
  "Что посмотреть за полдня?",
  "Кафе на Баумана",
] as const;

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  poiIds?: string[];
};

type Props = {
  sessionId: string | null;
  onSessionId: (id: string) => void;
  onHighlightPoi: (ids: string[]) => void;
  onAddToRoute: (id: string) => void;
  anchorLat: number;
  anchorLng: number;
  initialMessages?: ChatMessage[];
  isLoggedIn: boolean;
};

export function ChatPanel({
  sessionId,
  onSessionId,
  onHighlightPoi,
  onAddToRoute,
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

  async function send(messageText?: string) {
    const text = (messageText ?? input).trim();
    if (!text || loading) return;
    if (!isLoggedIn) return;

    setError(null);
    if (!messageText) setInput("");
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
      <Card className="flex h-full flex-col shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageCircle className="size-4 text-primary" aria-hidden />
            AI-гид
          </CardTitle>
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

  function SuggestionChips({ className }: { className?: string }) {
    return (
      <div className={cn("flex flex-wrap gap-2", className)}>
        {CHAT_SUGGESTIONS.map((label) => (
          <Button
            key={label}
            type="button"
            variant="outline"
            size="sm"
            disabled={loading}
            className="h-auto whitespace-normal py-1.5 text-left text-xs"
            onClick={() => void send(label)}
          >
            {label}
          </Button>
        ))}
      </div>
    );
  }

  return (
    <Card className="flex h-full min-h-[320px] flex-col shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageCircle className="size-4 text-primary" aria-hidden />
          AI-гид по Казани
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Советы только по местам из нашей базы. Не навигатор.
        </p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-2 overflow-hidden pb-4">
        <ScrollArea className="flex-1 rounded-md border p-3">
          <div className="space-y-3 pr-2">
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Выберите пример или задайте свой вопрос:
                </p>
                <SuggestionChips />
              </div>
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
                {m.role === "assistant" && m.poiIds && m.poiIds.length > 0 && (
                  <ChatAssistantPlaces
                    poiIds={m.poiIds}
                    onHighlightPoi={onHighlightPoi}
                    onAddToRoute={onAddToRoute}
                  />
                )}
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
        <SuggestionChips />
      </CardContent>
    </Card>
  );
}
