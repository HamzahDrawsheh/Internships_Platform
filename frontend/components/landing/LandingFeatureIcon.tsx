import type { ReactNode } from "react";
import { landingIconClass } from "@/components/landing/landing-theme";

export type LandingFeatureIconName = "opportunities" | "applications" | "updates";

const iconClass = "h-6 w-6 shrink-0";

const ICONS: Record<LandingFeatureIconName, ReactNode> = {
  opportunities: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={iconClass}
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M6 3.75A2.75 2.75 0 0 1 8.75 1h2.5A2.75 2.75 0 0 1 14 3.75v.443c.572.055 1.14.122 1.706.2C17.053 4.582 18 5.75 18 7.07v3.469c0 1.126-.694 2.191-1.83 2.54-1.952.599-4.024.921-6.17.921s-4.219-.322-6.17-.921C2.694 12.73 2 11.665 2 10.539V7.07c0-1.321.947-2.489 2.294-2.676A58.45 58.45 0 0 1 6 4.193V3.75Zm2.5 1.5v-.43a.25.25 0 0 0-.25-.25h-2.5a.25.25 0 0 0-.25.25v.43c.566.028 1.124.06 1.68.106.501.036.992.078 1.47.118V4.5h2v.318c.478-.04.969-.082 1.47-.118.556-.046 1.114-.078 1.68-.106ZM10 7a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v.01a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1V7Zm-4 5.25a.75.75 0 0 1 .75-.75h6.5a.75.75 0 0 1 0 1.5h-6.5a.75.75 0 0 1-.75-.75Z"
        clipRule="evenodd"
      />
    </svg>
  ),
  applications: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={iconClass}
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M11.983 1.907a.75.75 0 0 0-1.292-.657l-8.5 9.5A.75.75 0 0 0 2.75 12h6.572l-1.305 6.093a.75.75 0 0 0 1.292.657l8.5-9.5A.75.75 0 0 0 17.25 8h-6.572l1.305-6.093Z"
        clipRule="evenodd"
      />
    </svg>
  ),
  updates: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={iconClass}
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M10 2a6 6 0 0 0-6 6c0 1.887-.454 3.665-1.257 5.234a.75.75 0 0 0 .515 1.076 32.91 32.91 0 0 0 3.256.508 3.5 3.5 0 0 0 6.972 0 32.903 32.903 0 0 0 3.256-.508.75.75 0 0 0 .515-1.076A11.448 11.448 0 0 1 16 8a6 6 0 0 0-6-6Zm0 14.5a2 2 0 0 1-1.95-1.557 33.54 33.54 0 0 0 3.9 0A2 2 0 0 1 10 16.5Z"
        clipRule="evenodd"
      />
    </svg>
  ),
};

export function LandingFeatureIcon({ name }: { name: LandingFeatureIconName }) {
  const icon = ICONS[name];
  if (!icon) return null;

  return (
    <span
      className={`${landingIconClass} text-[#7C3AED] dark:text-purple-300`}
      aria-hidden
    >
      {icon}
    </span>
  );
}
