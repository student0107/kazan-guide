import poiJson from "@/data/poi.json";
import type { Poi } from "./types";

export const ALL_POI: Poi[] = poiJson as Poi[];

export function getPoiById(id: string): Poi | undefined {
  return ALL_POI.find((p) => p.id === id);
}
