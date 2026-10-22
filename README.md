# Казань: карта и AI-гид (демо)

Демо-сайт для туристов: карта Казани (OpenStreetMap), маркеры мест, **пеший маршрут по улицам** (OpenRouteService; без ключа — линия по прямой), чат-гид на русском через [polza.ai](https://polza.ai). История диалогов — после входа по email и паролю (Supabase).

## Стек

- Next.js, Leaflet, Supabase Auth + Postgres, polza.ai (OpenAI-compatible API)
- Хостинг: [Vercel](https://vercel.com) (Hobby — бесплатно для личного демо)

## Быстрый старт локально

1. Клонируйте репозиторий и установите зависимости:

```bash
npm install
```

2. Скопируйте `.env.example` в `.env.local` и заполните переменные (см. ниже).

3. В [Supabase](https://supabase.com) создайте проект → **SQL Editor** → выполните файл [`supabase/migrations/001_initial.sql`](supabase/migrations/001_initial.sql).

4. В Supabase **Authentication → Providers** включите только **Email**, отключите Magic Link, если не нужен.

5. Запуск:

```bash
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000).

## Переменные окружения

| Переменная | Где взять |
|------------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | там же, anon public |
| `POLZA_API_KEY` | Личный кабинет polza.ai |
| `POLZA_MODEL` | По умолчанию `openai/gpt-4o-mini` (экономичная текстовая модель) |
| `NEXT_PUBLIC_CARTO_BASEMAPS_KEY` | Бесплатный ключ: [carto.com/basemaps/apikey](https://carto.com/basemaps/apikey/) (подложка карты Voyager) |
| `ORS_API_KEY` | Бесплатная регистрация: [openrouteservice.org](https://openrouteservice.org/dev/#/signup) — пеший маршрут по улицам между точками |

**Оплата:** polza.ai списывает за запросы к модели; Vercel/Supabase/Carto basemaps free tier для демо — 0 ₽. OpenRouteService — бесплатный лимит запросов в день (достаточно для личного демо).

## Деплой на Vercel

1. Залейте проект на GitHub (новый репозиторий → push).
2. [vercel.com](https://vercel.com) → **Add New Project** → импорт репозитория.
3. **Environment Variables** — те же переменные, что в `.env.local` (включая `ORS_API_KEY` для маршрутов по улицам).
4. Deploy. После деплоя проверьте: карта, регистрация, вопрос «где поесть», страница **История**.

В Supabase **Authentication → URL Configuration** добавьте URL сайта Vercel в **Site URL** и **Redirect URLs** (`https://ваш-проект.vercel.app/**`).

## Фото на главной

Блок приветствия ждёт три снимка: `public/hero/slide-1.jpg`, `slide-2.jpg`, `slide-3.jpg`. Файлов в репозитории нет специально: без них показывается терракотовый градиент. Как скачать сжатые картинки и какая лицензия — в [`public/hero/README.md`](public/hero/README.md).

## Данные о местах

Файл [`data/poi.json`](data/poi.json) — ~25 точек (достопримечательности, кафе, бары). Координаты и описания можно править вручную.

## Ограничения демо

- Маршрут пешком, без GPS-навигации «как в Яндекс.Картах»; время и длина — оценка сервиса.
- AI рекомендует только места из `poi.json`.
- Лимит чата: 20 сообщений пользователя в день (МСК).

## Скрипты

- `npm run dev` — разработка
- `npm run build` — production-сборка
- `npm run start` — запуск после build
