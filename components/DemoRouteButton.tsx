"use client";

import { Button } from "@/components/ui/button";

type Props = {
  onApply: () => void;
};

export function DemoRouteButton({ onApply }: Props) {
  return (
    <Button type="button" variant="outline" size="sm" onClick={onApply}>
      День в Казани
    </Button>
  );
}
