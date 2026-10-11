"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setLoading(true);
    try {
      const supabase = createClient();
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage("Аккаунт создан. Если Supabase требует подтверждение email — проверьте почту.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/");
        router.refresh();
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Ошибка входа");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-4">
      <Card>
        <CardHeader>
          <CardTitle>{mode === "login" ? "Вход" : "Регистрация"}</CardTitle>
          <p className="text-sm text-muted-foreground">
            Email и пароль — для сохранения истории чата с AI-гидом.
          </p>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={(e) => void submit(e)}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {message && <p className="text-sm text-muted-foreground">{message}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Подождите…" : mode === "login" ? "Войти" : "Зарегистрироваться"}
            </Button>
          </form>
          <Button
            type="button"
            variant="link"
            className="mt-2 px-0"
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
          >
            {mode === "login" ? "Нет аккаунта — регистрация" : "Уже есть аккаунт — войти"}
          </Button>
          <Link
            href="/"
            className={cn(buttonVariants({ variant: "ghost" }), "mt-2 flex w-full")}
          >
            На главную
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
