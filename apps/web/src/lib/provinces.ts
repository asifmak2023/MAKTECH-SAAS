export const PAKISTAN_PROVINCES = [
  "Sindh",
  "Punjab",
  "Balochistan",
  "KPK",
  "Gilgit Baltistan",
  "Other",
] as const;

export type PakistanProvince = (typeof PAKISTAN_PROVINCES)[number];

export function provinceOptions(current?: string | null): string[] {
  if (current && !PAKISTAN_PROVINCES.includes(current as PakistanProvince)) {
    return [current, ...PAKISTAN_PROVINCES];
  }
  return [...PAKISTAN_PROVINCES];
}
