"use client";

import { useState } from "react";
import { resolveCompanyLogoUrl } from "@/lib/companies/logo";

type CompanyLogoSize = "sm" | "md" | "lg" | "xl" | "hero";

const sizeClasses: Record<CompanyLogoSize, string> = {
  sm: "h-10 w-10 rounded-xl text-sm",
  md: "h-14 w-14 rounded-xl text-lg",
  lg: "h-16 w-16 rounded-2xl text-xl",
  xl: "h-20 w-20 rounded-2xl text-2xl",
  hero: "h-24 w-24 rounded-2xl text-3xl sm:h-32 sm:w-32 sm:text-4xl",
};

interface CompanyLogoProps {
  name: string;
  logoUrl?: string | null;
  previewUrl?: string | null;
  size?: CompanyLogoSize;
  className?: string;
}

export function CompanyLogo({ name, logoUrl, previewUrl, size = "md", className = "" }: CompanyLogoProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const resolvedUrl = previewUrl?.trim() || resolveCompanyLogoUrl(logoUrl);
  const initial = (name.trim() || "C").slice(0, 1).toUpperCase();
  const imageFailed = Boolean(resolvedUrl) && failedUrl === resolvedUrl;
  const showImage = Boolean(resolvedUrl) && !imageFailed;

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden border border-violet-100 bg-gradient-to-br from-violet-50 to-purple-100 font-bold text-violet-700 shadow-sm transition-colors duration-300 dark:border-slate-700 dark:from-slate-800 dark:to-slate-700 dark:text-violet-300 ${sizeClasses[size]} ${className}`}
      aria-hidden={showImage}
    >
      {showImage ? (
        <img
          src={resolvedUrl}
          alt={`${name} logo`}
          className="h-full w-full object-cover"
          loading="lazy"
          onError={() => setFailedUrl(resolvedUrl ?? null)}
        />
      ) : (
        <span>{initial}</span>
      )}
    </div>
  );
}
