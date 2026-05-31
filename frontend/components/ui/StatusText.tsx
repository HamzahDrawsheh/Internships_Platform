import { statusTextVariantClass, type StatusTextVariant } from "@/lib/ui/status-text";

type StatusTextProps = {
  variant: StatusTextVariant;
  children: React.ReactNode;
  className?: string;
};

export function StatusText({ variant, children, className = "" }: StatusTextProps) {
  return (
    <span className={`text-xs ${statusTextVariantClass(variant)} ${className}`.trim()} role="status">
      {children}
    </span>
  );
}
