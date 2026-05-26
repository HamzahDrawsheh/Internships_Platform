const STAR_PATH =
  "M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z";

type Props = {
  value: number;
  max?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
};

export function FractionalStarRating({ value, max = 5, size = "md", className = "" }: Props) {
  const clamped = Math.max(0, Math.min(max, value));
  const sizeClass = size === "lg" ? "h-9 w-9" : size === "sm" ? "h-4 w-4" : "h-6 w-6";
  const gapClass = size === "lg" ? "gap-1.5" : size === "sm" ? "gap-0.5" : "gap-1";

  return (
    <span
      className={`inline-flex items-center ${gapClass} ${className}`}
      aria-label={`${clamped.toFixed(1)} out of ${max} stars`}
      role="img"
    >
      {Array.from({ length: max }, (_, i) => {
        const fill = Math.max(0, Math.min(1, clamped - i));
        return (
          <span key={i} className={`relative inline-block shrink-0 ${sizeClass}`}>
            <svg
              className={`${sizeClass} fill-slate-200 text-slate-200 dark:fill-slate-700 dark:text-slate-700`}
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path d={STAR_PATH} />
            </svg>
            {fill > 0 ? (
              <svg
                className={`absolute inset-0 ${sizeClass} fill-amber-400 text-amber-400`}
                viewBox="0 0 20 20"
                style={{ clipPath: `inset(0 ${(1 - fill) * 100}% 0 0)` }}
                aria-hidden="true"
              >
                <path d={STAR_PATH} />
              </svg>
            ) : null}
          </span>
        );
      })}
    </span>
  );
}
