"use client";

import Link from "next/link";
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
        <div>
          <Link href="/" className="text-lg font-semibold tracking-tight">
            Казань: карта и AI-гид
          </Link>
          <p className="text-xs text-muted-foreground">
            Демо — не навигатор, без времени в пути
          </p>
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
