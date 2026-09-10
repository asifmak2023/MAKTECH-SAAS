export const PAKISTAN_PROVINCES = [
  "Sindh",
  "Punjab",
  "Balochistan",
  "KPK",
  "Gilgit Baltistan",
  "Other",
] as const;

export function provinceOptions(current?: string | null): string[] {
  if (current && !(PAKISTAN_PROVINCES as readonly string[]).includes(current)) {
    return [current, ...PAKISTAN_PROVINCES];
  }
  return [...PAKISTAN_PROVINCES];
}

export function mergeOption(list: string[], value: string | null | undefined): string[] {
  if (!value) return list;
  return list.includes(value) ? list : [value, ...list];
}
