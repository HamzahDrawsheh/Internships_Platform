import { type ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  id?: string;
}

export function Card({ children, className = "", id }: CardProps) {
  return (
    <div
      id={id}
      className={
        "rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900 dark:text-white " +
        className
      }
    >
      {children}
    </div>
  );
}
