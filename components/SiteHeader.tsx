"use client";

import Link from "next/link";
import { Landmark } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { User } from "@supabase/supabase-js";

type Props = {
  user: User | null;
  onSignOut: () => void;
};

export function SiteHeader({ user, onSignOut }: Props) {
  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <Link
            href="/"
            className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground"
          >
            <Landmark className="size-4" aria-hidden />
            <span className="sr-only">На главную</span>
          </Link>
          <div className="min-w-0">
            <Link href="/" className="text-xl font-semibold tracking-tight">
              Казань: карта и AI-гид
            </Link>
            <span
              className="mt-0.5 block h-0.5 w-12 rounded-full bg-primary"
              aria-hidden
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Карта и гид по городу
            </p>
            <p className="text-[11px] text-muted-foreground/80">
              Линия маршрута — демо, не навигация
            </p>
          </div>
        </div>
        <nav className="flex items-center gap-2">
          {user ? (
            <>
              <Link
                href="/history"
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
              >
                История
              </Link>
              <span className="hidden max-w-[140px] truncate text-sm text-muted-foreground sm:inline">
                {user.email}
              </span>
              <Button type="button" variant="outline" size="sm" onClick={onSignOut}>
                Выйти
              </Button>
            </>
          ) : (
            <Link href="/login" className={cn(buttonVariants({ size: "sm" }))}>
              Войти
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
