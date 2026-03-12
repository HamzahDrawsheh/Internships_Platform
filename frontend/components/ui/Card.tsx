import { type ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return (
    <div className={"rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm " + className}>
      {children}
    </div>
  );
}
