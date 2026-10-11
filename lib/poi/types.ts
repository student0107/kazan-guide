export type PoiCategory = "sight" | "cafe" | "bar";

export type Poi = {
  id: string;
  name: string;
  category: PoiCategory;
  lat: number;
  lng: number;
  description: string;
  tags: string[];
};
