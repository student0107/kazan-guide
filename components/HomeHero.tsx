"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type TouchEvent,
} from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type HeroSlide = {
  src: string;
  alt: string;
  caption?: string;
};

const SLIDES: HeroSlide[] = [
  {
    src: "/hero/slide-1.jpg",
    alt: "Мечеть Кул-Шариф в Казанском Кремле",
    caption: "Кул-Шариф",
  },
  {
    src: "/hero/slide-2.jpg",
    alt: "Башня Казанского Кремля",
    caption: "Башня Кремля",
  },
  {
    src: "/hero/slide-3.jpg",
    alt: "Казанский Кремль с наружной стороны",
    caption: "Казанский Кремль",
  },
];

function scrollToAnchor(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  el.focus({ preventScroll: true });
}

export function HomeHero() {
  const [index, setIndex] = useState(0);
  const [ready, setReady] = useState<boolean[]>(() => SLIDES.map(() => false));
  const touchX = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    SLIDES.forEach((slide, i) => {
      const probe = new window.Image();
      probe.onload = () => {
        if (cancelled) return;
        setReady((prev) => {
          if (prev[i]) return prev;
          const next = [...prev];
          next[i] = true;
          return next;
        });
      };
      probe.onerror = () => {
        if (cancelled) return;
        setReady((prev) => {
          if (!prev[i]) return prev;
          const next = [...prev];
          next[i] = false;
          return next;
        });
      };
      probe.src = slide.src;
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const go = useCallback((delta: number) => {
    setIndex((current) => (current + delta + SLIDES.length) % SLIDES.length);
  }, []);

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      go(1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      go(-1);
    }
  };

  const slide = SLIDES[index];
  const photo = ready[index];

  return (
    <section
      className={cn(
        "hero-welcome relative w-full shrink-0 overflow-hidden",
        photo && "hero-has-photo"
      )}
      aria-roledescription="карусель"
      aria-labelledby="home-hero-title"
      onKeyDown={onKeyDown}
      onTouchStart={(event: TouchEvent<HTMLElement>) => {
        touchX.current = event.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event: TouchEvent<HTMLElement>) => {
        const start = touchX.current;
        touchX.current = null;
        const endX = event.changedTouches[0]?.clientX;
        if (start == null || endX == null) return;
        const delta = endX - start;
        if (delta > 48) go(-1);
        else if (delta < -48) go(1);
      }}
    >
      <div
        className="hero-track flex h-full w-full"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {SLIDES.map((item, i) => (
          <div
            key={item.src}
            className="relative h-full w-full shrink-0"
            aria-hidden={i !== index}
          >
            {ready[i] ? (
              <Image
                src={item.src}
                alt={item.alt}
                fill
                sizes="100vw"
                loading={i === 0 ? "eager" : "lazy"}
                fetchPriority={i === 0 ? "high" : "low"}
                className="object-cover"
                onError={() => {
                  setReady((prev) => {
                    if (!prev[i]) return prev;
                    const next = [...prev];
                    next[i] = false;
                    return next;
                  });
                }}
              />
            ) : null}
            {ready[i] ? (
              <div className="hero-veil pointer-events-none absolute inset-0" />
            ) : null}
          </div>
        ))}
      </div>

      <button
        type="button"
        className="hero-arrow absolute top-1/2 left-2 z-20 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-xl leading-none focus-visible:ring-3 focus-visible:ring-ring/60 md:left-4 md:size-10"
        aria-label="Предыдущий слайд"
        onClick={() => go(-1)}
      >
        <span aria-hidden>‹</span>
      </button>
      <button
        type="button"
        className="hero-arrow absolute top-1/2 right-2 z-20 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-xl leading-none focus-visible:ring-3 focus-visible:ring-ring/60 md:right-4 md:size-10"
        aria-label="Следующий слайд"
        onClick={() => go(1)}
      >
        <span aria-hidden>›</span>
      </button>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col gap-2 px-12 pt-8 pb-2 md:px-16 md:pb-3">
        <div className="hero-copy pointer-events-auto max-w-3xl">
          {slide.caption ? (
            <p className="text-xs font-medium md:text-sm">{slide.caption}</p>
          ) : null}
          <h1
            id="home-hero-title"
            className="text-xl leading-tight font-semibold tracking-tight md:text-4xl lg:text-5xl"
          >
            Добро пожаловать в Казань!
          </h1>
          <p className="hero-lead mt-1 max-w-xl text-xs leading-snug md:text-base">
            Карта мест, маршрут на день и гид в чате.
          </p>
          <div className="mt-2 flex flex-wrap gap-2 md:mt-3">
            <Button
              type="button"
              size="sm"
              onClick={() => scrollToAnchor("map-section")}
            >
              К карте
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => scrollToAnchor("about-kazan")}
            >
              О городе
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => scrollToAnchor("kazan-districts")}
            >
              Районы
            </Button>
          </div>
        </div>
        <div className="pointer-events-auto flex justify-center gap-1.5">
          {SLIDES.map((item, i) => (
            <button
              key={item.src}
              type="button"
              className="hero-dot h-2 shrink-0"
              aria-label={`Слайд ${i + 1} из ${SLIDES.length}${item.caption ? `: ${item.caption}` : ""}`}
              aria-current={i === index ? "true" : undefined}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
        <p className="sr-only" aria-live="polite">
          Слайд {index + 1} из {SLIDES.length}
          {slide.caption ? `: ${slide.caption}` : ""}
        </p>
      </div>
    </section>
  );
}
