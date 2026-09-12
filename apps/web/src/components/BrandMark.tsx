"use client";

import Image from "next/image";
import logo from "./logo.webp";

export default function BrandMark({ size = 40 }: { size?: number }) {
  return (
    <span
      className="logo-badge"
      role="img"
      aria-label="FBR"
      style={{ width: size, height: size }}
    >
      <Image
        src={logo}
        alt=""
        width={size}
        height={size}
        className="block shrink-0"
      />
    </span>
  );
}
