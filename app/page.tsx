import { Suspense } from "react";
import { HomeClient } from "@/components/HomeClient";

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-muted-foreground">
          Загрузка…
        </div>
      }
    >
      <HomeClient />
    </Suspense>
  );
}
