import { NextResponse } from "next/server";
import { ALL_POI } from "@/lib/poi/data";

export async function GET() {
  return NextResponse.json(ALL_POI);
}
