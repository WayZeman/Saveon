"use client";

import { useState } from "react";
import Image from "next/image";

const LOGO_PNG = "/logo.png";
const FALLBACK_SVG = "/default-logo.svg";

type LogoImageProps = {
  width: number;
  height: number;
  className?: string;
  priority?: boolean;
};

export default function LogoImage({ width, height, className, priority }: LogoImageProps) {
  const [src, setSrc] = useState(LOGO_PNG);
  const isSvg = src === FALLBACK_SVG;

  return (
    <Image
      src={src}
      alt="Saveon"
      width={width}
      height={height}
      className={className}
      priority={priority}
      unoptimized={isSvg}
      onError={() => setSrc(FALLBACK_SVG)}
    />
  );
}
