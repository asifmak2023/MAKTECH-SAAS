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
        draft: { bg: "#262626", fg: "#d4d4d4", border: "#3a3a3a", dot: "#a3a3a3" },
        pending_approval: { bg: "rgba(245,158,11,0.16)", fg: "#fcd34d", border: "rgba(252,211,77,0.4)", dot: "#fbbf24" },
        pending: { bg: "rgba(245,158,11,0.16)", fg: "#fcd34d", border: "rgba(252,211,77,0.4)", dot: "#fbbf24" },
        approved: { bg: "rgba(16,185,129,0.16)", fg: "#6ee7b7", border: "rgba(110,231,183,0.4)", dot: "#34d399" },
        submitted: { bg: "rgba(14,165,233,0.16)", fg: "#7dd3fc", border: "rgba(125,211,252,0.4)", dot: "#38bdf8" },
        failed: { bg: "rgba(244,63,94,0.16)", fg: "#fda4af", border: "rgba(253,164,175,0.4)", dot: "#fb7185" },
        rejected: { bg: "rgba(244,63,94,0.16)", fg: "#fda4af", border: "rgba(253,164,175,0.4)", dot: "#fb7185" },
        paid: { bg: "#ffffff", fg: "#000000", border: "#ffffff", dot: "#000000" },
        active: { bg: "#ffffff", fg: "#000000", border: "#ffffff", dot: "#000000" },
        resolved: { bg: "#ffffff", fg: "#000000", border: "#ffffff", dot: "#000000" },
        unpaid: { bg: "#1b1b1b", fg: "#f5f5f5", border: "#f5f5f5", dot: "#f5f5f5" },
        trial: { bg: "#1b1b1b", fg: "#f5f5f5", border: "#f5f5f5", dot: "#f5f5f5" },
        archived: { bg: "#262626", fg: "#a3a3a3", border: "#3a3a3a", dot: "#767676" },
        refunded: { bg: "#262626", fg: "#a3a3a3", border: "#3a3a3a", dot: "#767676" },
        cancelled: { bg: "#262626", fg: "#a3a3a3", border: "#3a3a3a", dot: "#767676" },
        expired: { bg: "#262626", fg: "#a3a3a3", border: "#3a3a3a", dot: "#767676" },
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
    ? { bg: "#1b1b1b", fg: "#d4d4d4", border: "#262626", dot: "#a3a3a3" }
    : { bg: "#f5f5f5", fg: "#262626", border: "#e5e5e5", dot: "#767676" };
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

  if (palette === "asifent" && ["paid", "active", "resolved"].includes(status)) {
    return dark
      ? { bg: "#4c9aff", fg: "#0b1220", border: "#4c9aff", dot: "#0b1220" }
      : { bg: "#0067c0", fg: "#ffffff", border: "#0067c0", dot: "#ffffff" };
  }

  return tone;
}

export function isInvoiceEditable(status: string) {
  return ["draft", "failed", "rejected"].includes(status);
}

export function mutedOn(c: Colors) {
  return c.textMuted;
}
