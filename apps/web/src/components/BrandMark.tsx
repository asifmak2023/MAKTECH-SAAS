"use client";

import Image from "next/image";
import logo from "./logo.webp";
import { useIsDark, usePalette } from "@/lib/theme";

export default function BrandMark({ size = 40 }: { size?: number }) {
  const dark = useIsDark();
  const palette = usePalette();

  const mark = (
    <Image
      src={logo}
      alt="FBR"
      width={size}
      height={size}
      className="block shrink-0"
    />
  );

  if (palette === "glacier") {
    return (
      <span
        className="logo-badge logo-badge-glacier"
        role="img"
        aria-label="FBR"
        style={{ width: size, height: size }}
      >
        {mark}
      </span>
    );
  }

  if (palette === "asifent") {
    return (
      <span
        className={`logo-badge logo-badge-asifent${dark ? " is-dark" : ""}`}
        role="img"
        aria-label="FBR"
        style={{ width: size, height: size }}
      >
        {mark}
      </span>
    );
  }

  if (!dark) {
    return mark;
  }

  return (
    <span
      className="logo-badge"
      role="img"
      aria-label="FBR"
      style={{ width: size, height: size }}
    >
      {mark}
    </span>
  );
}
