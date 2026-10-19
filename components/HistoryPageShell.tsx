"use client";

import { useRouter } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

type Props = {
  user: User;
  children: React.ReactNode;
};

export function HistoryPageShell({ user, children }: Props) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader user={user} onSignOut={() => void handleSignOut()} />
      <main className="mx-auto w-full max-w-2xl flex-1 p-4">{children}</main>
    </div>
  );
}
