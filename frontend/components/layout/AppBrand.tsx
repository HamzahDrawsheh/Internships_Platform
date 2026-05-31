import Link from "next/link";
import { BrandMark } from "@/components/layout/BrandMark";

const APP_NAME = "InternConnect Jordan";

type AppBrandProps = {
  href?: string;
  className?: string;
  onDark?: boolean;
};

export function AppBrand({ href = "/", className = "", onDark = false }: AppBrandProps) {
  const titleClass = onDark ? "text-white" : "text-slate-900 dark:text-white";
  const subtitleClass = onDark ? "text-purple-300" : "text-purple-600 dark:text-purple-400";

  return (
    <Link
      href={href}
      className={`group inline-flex min-w-0 items-center gap-2 rounded-xl transition-opacity duration-300 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950 ${className}`}
      aria-label={`${APP_NAME} home`}
    >
      <BrandMark size={36} />
      <span className="hidden min-w-0 flex-col sm:flex">
        <span className={`truncate text-sm font-bold leading-tight tracking-tight ${titleClass}`}>
          {APP_NAME}
        </span>
        <span className={`truncate text-[10px] font-medium uppercase tracking-wider ${subtitleClass}`}>
          Internships
        </span>
      </span>
    </Link>
  );
}
