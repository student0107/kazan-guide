import { NextResponse } from "next/server";

type Point = { lat: number; lng: number };

const ORS_WALKING_URL =
  "https://api.openrouteservice.org/v2/directions/foot-walking/geojson";

export async function POST(request: Request) {
  const key = process.env.ORS_API_KEY?.trim();
  if (!key) {
    return NextResponse.json(
      { error: "OpenRouteService key not configured" },
      { status: 503 }
    );
  }

  let body: { points?: Point[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const points = body.points;
  if (!Array.isArray(points) || points.length < 2) {
    return NextResponse.json(
      { error: "At least two points required" },
      { status: 400 }
    );
  }
  if (points.length > 25) {
    return NextResponse.json({ error: "Too many waypoints" }, { status: 400 });
  }

  for (const p of points) {
    if (
      typeof p?.lat !== "number" ||
      typeof p?.lng !== "number" ||
      !Number.isFinite(p.lat) ||
      !Number.isFinite(p.lng)
    ) {
      return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
    }
  }

  const coordinates = points.map((p) => [p.lng, p.lat]);

  let orsRes: Response;
  try {
    orsRes = await fetch(ORS_WALKING_URL, {
      method: "POST",
      headers: {
        Authorization: key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ coordinates }),
    });
  } catch (err) {
    console.error("ORS fetch failed", err);
    return NextResponse.json({ error: "Routing service unavailable" }, { status: 502 });
  }

  if (!orsRes.ok) {
    const text = await orsRes.text();
    console.error("ORS error", orsRes.status, text.slice(0, 500));
    return NextResponse.json({ error: "Routing failed" }, { status: 502 });
  }

  let geo: {
    features?: Array<{
      geometry?: { coordinates?: [number, number][] };
      properties?: { summary?: { distance?: number; duration?: number } };
    }>;
  };
  try {
    geo = await orsRes.json();
  } catch {
    return NextResponse.json({ error: "Invalid routing response" }, { status: 502 });
  }

  const feature = geo.features?.[0];
  const rawCoords = feature?.geometry?.coordinates;
  if (
    !feature ||
    !Array.isArray(rawCoords) ||
    rawCoords.length === 0
  ) {
    return NextResponse.json({ error: "Empty route" }, { status: 502 });
  }

  const line: [number, number][] = rawCoords.map(([lng, lat]) => [lat, lng]);
  const summaryRaw = feature.properties?.summary;

  return NextResponse.json({
    source: "walking" as const,
    coordinates: line,
    summary:
      typeof summaryRaw?.distance === "number" &&
      typeof summaryRaw?.duration === "number"
        ? { distanceM: summaryRaw.distance, durationS: summaryRaw.duration }
        : null,
  });
}
