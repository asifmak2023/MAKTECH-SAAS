import { Colors, PaletteId } from "./theme";

export function formatStatus(status: string) {
  return (status || "").replaceAll("_", " ");
}

export function money(value?: number | string | null) {
  return Number(value || 0).toLocaleString("en-PK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export type ChipTone = {
  bg: string;
  fg: string;
  border: string;
  dot: string;
};

export function statusChip(status: string, dark: boolean, palette: PaletteId = "fbr"): ChipTone {
  const map: Record<string, ChipTone> = dark
    ? {
        draft: { bg: "#313033", fg: "#E6E1E5", border: "#49454F", dot: "#CAC4D0" },
        pending_approval: { bg: "rgba(245,158,11,0.16)", fg: "#fcd34d", border: "rgba(252,211,77,0.4)", dot: "#fbbf24" },
        pending: { bg: "rgba(245,158,11,0.16)", fg: "#fcd34d", border: "rgba(252,211,77,0.4)", dot: "#fbbf24" },
        approved: { bg: "rgba(16,185,129,0.16)", fg: "#6ee7b7", border: "rgba(110,231,183,0.4)", dot: "#34d399" },
        submitted: { bg: "rgba(14,165,233,0.16)", fg: "#7dd3fc", border: "rgba(125,211,252,0.4)", dot: "#38bdf8" },
        failed: { bg: "rgba(244,63,94,0.16)", fg: "#fda4af", border: "rgba(253,164,175,0.4)", dot: "#fb7185" },
        rejected: { bg: "rgba(244,63,94,0.16)", fg: "#fda4af", border: "rgba(253,164,175,0.4)", dot: "#fb7185" },
        paid: { bg: "#E6E1E5", fg: "#1C1B1F", border: "#E6E1E5", dot: "#1C1B1F" },
        active: { bg: "#E6E1E5", fg: "#1C1B1F", border: "#E6E1E5", dot: "#1C1B1F" },
        resolved: { bg: "#E6E1E5", fg: "#1C1B1F", border: "#E6E1E5", dot: "#1C1B1F" },
        unpaid: { bg: "#313033", fg: "#E6E1E5", border: "#49454F", dot: "#CAC4D0" },
        trial: { bg: "#313033", fg: "#E6E1E5", border: "#49454F", dot: "#CAC4D0" },
        archived: { bg: "#313033", fg: "#CAC4D0", border: "#49454F", dot: "#938F99" },
        refunded: { bg: "#313033", fg: "#CAC4D0", border: "#49454F", dot: "#938F99" },
        cancelled: { bg: "#313033", fg: "#CAC4D0", border: "#49454F", dot: "#938F99" },
        expired: { bg: "#313033", fg: "#CAC4D0", border: "#49454F", dot: "#938F99" },
      }
    : {
        draft: { bg: "#f5f5f5", fg: "#262626", border: "#e5e5e5", dot: "#767676" },
        pending_approval: { bg: "#fffbeb", fg: "#92400e", border: "#fcd34d", dot: "#f59e0b" },
        pending: { bg: "#fffbeb", fg: "#92400e", border: "#fcd34d", dot: "#f59e0b" },
        approved: { bg: "#ecfdf5", fg: "#047857", border: "#6ee7b7", dot: "#10b981" },
        submitted: { bg: "#f0f9ff", fg: "#0369a1", border: "#7dd3fc", dot: "#0ea5e9" },
        failed: { bg: "#fff1f2", fg: "#be123c", border: "#fda4af", dot: "#f43f5e" },
        rejected: { bg: "#fff1f2", fg: "#be123c", border: "#fda4af", dot: "#f43f5e" },
        paid: { bg: "#000000", fg: "#ffffff", border: "#000000", dot: "#ffffff" },
        active: { bg: "#000000", fg: "#ffffff", border: "#000000", dot: "#ffffff" },
        resolved: { bg: "#000000", fg: "#ffffff", border: "#000000", dot: "#ffffff" },
        unpaid: { bg: "#ffffff", fg: "#000000", border: "#000000", dot: "#000000" },
        trial: { bg: "#ffffff", fg: "#000000", border: "#000000", dot: "#000000" },
        archived: { bg: "#f5f5f5", fg: "#767676", border: "#e5e5e5", dot: "#767676" },
        refunded: { bg: "#f5f5f5", fg: "#767676", border: "#e5e5e5", dot: "#767676" },
        cancelled: { bg: "#f5f5f5", fg: "#767676", border: "#e5e5e5", dot: "#767676" },
        expired: { bg: "#f5f5f5", fg: "#767676", border: "#e5e5e5", dot: "#767676" },
      };

  const fallback = dark
    ? { bg: "#313033", fg: "#E6E1E5", border: "#49454F", dot: "#CAC4D0" }
    : { bg: "#E6E1E5", fg: "#1C1B1F", border: "#CAC4D0", dot: "#49454F" };
  const tone = map[status] || fallback;

  if (palette === "glacier") {
    if (["paid", "active", "resolved"].includes(status)) {
      return { bg: "rgba(125,211,252,0.22)", fg: "#e8f4ff", border: "rgba(125,211,252,0.45)", dot: "#7dd3fc" };
    }
    if (["unpaid", "trial", "open", "past_due"].includes(status)) {
      return { bg: "#101726", fg: "#e8f4ff", border: "rgba(125,211,252,0.35)", dot: "#7dd3fc" };
    }
    if (["draft", "archived", "refunded", "cancelled", "expired"].includes(status)) {
      return { bg: "#101726", fg: "#94a3b8", border: "rgba(125,211,252,0.18)", dot: "#94a3b8" };
    }
  }

  if (["paid", "active", "resolved"].includes(status) && palette !== "fbr" && palette !== "editorial" && palette !== "glacier") {
    const accents: Record<string, { light: ChipTone; dark: ChipTone }> = {
      asifent: {
        light: { bg: "#0061A4", fg: "#ffffff", border: "#0061A4", dot: "#ffffff" },
        dark: { bg: "#9ECAFF", fg: "#003258", border: "#9ECAFF", dot: "#003258" },
      },
      mehndi: {
        light: { bg: "#7A5900", fg: "#ffffff", border: "#7A5900", dot: "#ffffff" },
        dark: { bg: "#FBBF24", fg: "#3F2E00", border: "#FBBF24", dot: "#3F2E00" },
      },
      karachi: {
        light: { bg: "#006A6A", fg: "#ffffff", border: "#006A6A", dot: "#ffffff" },
        dark: { bg: "#4CDADA", fg: "#003738", border: "#4CDADA", dot: "#003738" },
      },
      rosewood: {
        light: { bg: "#9C4146", fg: "#ffffff", border: "#9C4146", dot: "#ffffff" },
        dark: { bg: "#FFB3B5", fg: "#5F131C", border: "#FFB3B5", dot: "#5F131C" },
      },
      indigo: {
        light: { bg: "#4355B9", fg: "#ffffff", border: "#4355B9", dot: "#ffffff" },
        dark: { bg: "#BAC3FF", fg: "#08218A", border: "#BAC3FF", dot: "#08218A" },
      },
    };
    const accent = accents[palette];
    if (accent) return dark ? accent.dark : accent.light;
  }

  return tone;
}

export function isInvoiceEditable(status: string) {
  return ["draft", "failed", "rejected"].includes(status);
}

export function mutedOn(c: Colors) {
  return c.textMuted;
}
