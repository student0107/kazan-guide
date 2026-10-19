import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { HistoryPageShell } from "@/components/HistoryPageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** Данные сессии зависят от cookies — не prerender */
export const instant = false;

export default async function HistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: sessions } = await supabase
    .from("chat_sessions")
    .select("id, title, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <HistoryPageShell user={user}>
      <h1 className="mb-4 text-xl font-semibold">История диалогов</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Сохранённые сессии</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!sessions?.length && (
            <p className="text-sm text-muted-foreground">
              Пока пусто. Задайте вопрос AI-гиду на главной после входа.
            </p>
          )}
          {sessions?.map((s) => (
            <Link
              key={s.id}
              href={`/?session=${s.id}`}
              className="block rounded-lg border p-3 transition-colors hover:bg-muted"
            >
              <p className="font-medium">{s.title}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(s.created_at).toLocaleString("ru-RU", {
                  timeZone: "Europe/Moscow",
                })}
              </p>
            </Link>
          ))}
        </CardContent>
      </Card>
    </HistoryPageShell>
  );
}
