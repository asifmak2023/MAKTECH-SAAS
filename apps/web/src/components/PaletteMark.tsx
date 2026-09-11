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
        <rect x="2" y="2" width="9" height="9" rx="2" fill="#0067c0" />
        <rect x="13" y="2" width="9" height="9" rx="2" fill="#4c9aff" />
        <rect x="2" y="13" width="9" height="9" rx="2" fill="#4c9aff" />
        <rect x="13" y="13" width="9" height="9" rx="2" fill="#0059a6" />
      </svg>
    );
  }

  if (id === "editorial") {
    return (
      <svg {...common} fill="none">
        <rect x="2" y="2" width="20" height="20" rx="3" fill="#005da7" />
        <rect x="6" y="6" width="12" height="2.2" fill="#ffffff" />
        <rect x="6" y="11" width="9" height="1.8" fill="#d4e3ff" />
        <rect x="6" y="15.5" width="7" height="1.8" fill="#d4e3ff" />
      </svg>
    );
  }

  if (id === "glacier") {
    return (
      <svg {...common} fill="none">
        <rect x="1" y="1" width="22" height="22" rx="6" fill="#0a0e1a" stroke="#7dd3fc" strokeWidth="1.4" />
        <path d="M12 4.5 18.2 12 12 19.5 5.8 12Z" fill="#7dd3fc" />
        <path d="M12 8.2 15.2 12 12 15.8 8.8 12Z" fill="#0a0e1a" />
      </svg>
    );
  }

  return (
    <svg {...common} fill="none">
      <rect x="2" y="2" width="20" height="20" fill="#000000" />
      <rect x="7" y="7" width="10" height="10" fill="#ffffff" />
    </svg>
  );
}
