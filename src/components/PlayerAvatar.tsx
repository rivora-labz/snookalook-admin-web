"use client";

import { useState } from "react";
import Image from "next/image";

interface PlayerAvatarProps {
  url: string | null;
  name: string;
  size?: number;
  bgColor?: string;
  className?: string;
}

export default function PlayerAvatar({
  url,
  name,
  size = 32,
  bgColor = "#E5E5E5",
  className = "",
}: PlayerAvatarProps) {
  const [failed, setFailed] = useState(false);
  const showImage = url && !failed;
  const textSize = size > 32 ? "text-sm" : "text-xs";
  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full font-bold ${textSize} ${className}`}
      style={{ width: size, height: size, backgroundColor: bgColor, color: "#1A1A1A" }}
    >
      {showImage ? (
        <Image
          src={url}
          alt=""
          width={size}
          height={size}
          unoptimized
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <span aria-hidden="true">{name.charAt(0).toUpperCase()}</span>
      )}
    </div>
  );
}
