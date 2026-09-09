"use client";

import Image from "next/image";
import logo from "./logo.webp";
import { useIsDark } from "@/lib/theme";

export default function BrandMark({ size = 40 }: { size?: number }) {
  const dark = useIsDark();

  const mark = (
    <Image
      src={logo}
      alt="FBR"
      width={size}
      height={size}
      className="block shrink-0"
    />
  );

  if (!dark) {
    return mark;
  }

  // The black wordmark disappears on dark surfaces — sit it on a small white
  // circular badge (unchanged logo, added contrast only).
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
