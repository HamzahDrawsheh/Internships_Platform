import { type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger" | "link";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: React.ReactNode;
  className?: string;
}

const variants: Record<Variant, string> = {
  primary: "bg-gray-900 text-white hover:bg-gray-800 border-transparent",
  secondary: "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50",
  danger: "bg-red-600 text-white hover:bg-red-700 border-transparent",
  link: "bg-transparent text-gray-700 underline hover:text-gray-900 border-transparent",
};

export function Button({ variant = "primary", className = "", type = "button", children, ...props }: ButtonProps) {
  const base = "inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
  const variantClass = variants[variant];
  const linkClass = variant === "link" ? "px-0 py-0 min-h-0" : "";
  return (
    <button type={type} className={`${base} ${variantClass} ${linkClass} ${className}`} {...props}>
      {children}
    </button>
  );
}
