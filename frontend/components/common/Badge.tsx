type Variant = "default" | "success" | "warning" | "danger" | "info";

interface BadgeProps {
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
}

const variants: Record<Variant, string> = {
  default: "bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-slate-200",
  success: "bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300",
  warning: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300",
  danger: "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300",
  info: "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300",
};

export default function Badge({ children, variant = "default", className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors duration-300 ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
