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

  if (id === "mehndi") {
    return (
      <svg {...common} fill="none">
        <circle cx="12" cy="12" r="11" fill="#FFDEA3" />
        <circle cx="12" cy="12" r="6" fill="#7A5900" />
      </svg>
    );
  }

  if (id === "karachi") {
    return (
      <svg {...common} fill="none">
        <circle cx="12" cy="12" r="11" fill="#6FF7F6" />
        <circle cx="12" cy="12" r="6" fill="#006A6A" />
      </svg>
    );
  }

  if (id === "rosewood") {
    return (
      <svg {...common} fill="none">
        <circle cx="12" cy="12" r="11" fill="#FFDADA" />
        <circle cx="12" cy="12" r="6" fill="#9C4146" />
      </svg>
    );
  }

  if (id === "indigo") {
    return (
      <svg {...common} fill="none">
        <circle cx="12" cy="12" r="11" fill="#DEE0FF" />
        <circle cx="12" cy="12" r="6" fill="#4355B9" />
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
