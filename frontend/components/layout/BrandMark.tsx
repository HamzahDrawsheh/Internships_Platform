"use client";

import { useId } from "react";

type BrandMarkProps = {
  className?: string;
  size?: number;
};

export function BrandMark({ className = "", size = 36 }: BrandMarkProps) {
  const gradientId = useId().replace(/:/g, "");

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 40 40"
      fill="none"
      width={size}
      height={size}
      className={`shrink-0 drop-shadow-sm ${className}`}
      aria-hidden
    >
      <defs>
        <linearGradient id={gradientId} x1="6" y1="4" x2="34" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7C3AED" />
          <stop offset="0.55" stopColor="#8B5CF6" />
          <stop offset="1" stopColor="#4F46E5" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill={`url(#${gradientId})`} />
      {/* mortarboard */}
      <path d="M20 11 L31 17 L20 23 L9 17 Z" fill="white" fillOpacity="0.96" />
      <path
        d="M13 18.5 C15.2 20.8 17.5 21.8 20 21.8 C22.5 21.8 24.8 20.8 27 18.5"
        stroke="white"
        strokeWidth="1.85"
        strokeLinecap="round"
        fill="none"
        strokeOpacity="0.92"
      />
      <path d="M27 17.2 L27 24.5" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeOpacity="0.88" />
      <circle cx="27" cy="25.5" r="1.35" fill="white" fillOpacity="0.9" />
      {/* AI sparkle */}
      <path
        d="M30.5 9.5 V12.2 M29.15 10.85 H31.85"
        stroke="white"
        strokeWidth="1.55"
        strokeLinecap="round"
        strokeOpacity="0.95"
      />
      <circle cx="12.5" cy="13" r="1.1" fill="white" fillOpacity="0.75" />
      <circle cx="15" cy="11.2" r="0.65" fill="white" fillOpacity="0.55" />
    </svg>
  );
}
