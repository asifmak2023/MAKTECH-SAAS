"use client";

import type { PaletteId } from "@/lib/theme";

export default function PaletteMark({
  id,
  size = 16,
  className = "",
}: {
  id: PaletteId;
  size?: number;
  className?: string;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    className,
    "aria-hidden": true as const,
  };

  if (id === "asifent") {
    return (
      <svg {...common} fill="none">
        <circle cx="12" cy="12" r="11" fill="#D1E4FF" />
        <circle cx="12" cy="12" r="6" fill="#0061A4" />
      </svg>
    );
  }

  if (id === "editorial") {
    return (
      <svg {...common} fill="none">
        <circle cx="12" cy="12" r="11" fill="#D4E3FF" />
        <circle cx="12" cy="12" r="6" fill="#005FAF" />
      </svg>
    );
  }

  if (id === "glacier") {
    return (
      <svg {...common} fill="none">
        <circle cx="12" cy="12" r="11" fill="#0A0E1A" stroke="#7DD3FC" strokeWidth="1.4" />
        <circle cx="12" cy="12" r="5.5" fill="#7DD3FC" />
      </svg>
    );
  }

  return (
    <svg {...common} fill="none">
      <circle cx="12" cy="12" r="11" fill="#E6E1E5" />
      <circle cx="12" cy="12" r="6" fill="#1C1B1F" />
    </svg>
  );
}
