import Link from "next/link";

interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({ title, description, actionLabel, actionHref, onAction, className = "" }: EmptyStateProps) {
  return (
    <div className={"flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#E2E8F0] bg-white px-4 py-12 text-center " + className}>
      <h3 className="text-lg font-medium text-[#0F172A]">{title}</h3>
      {description && <p className="mt-2 max-w-sm text-sm text-[#0F172A]/70">{description}</p>}
      {(actionLabel && (actionHref ?? onAction)) && (
        <div className="mt-4">
          {actionHref ? (
            <Link href={actionHref} className="inline-flex items-center rounded-xl border border-[#E2E8F0] bg-white px-4 py-2 text-sm font-medium text-[#0F172A] shadow-sm hover:bg-[#F8FAFC]">
              {actionLabel}
            </Link>
          ) : (
            <button type="button" onClick={onAction} className="inline-flex items-center rounded-xl border border-[#E2E8F0] bg-white px-4 py-2 text-sm font-medium text-[#0F172A] shadow-sm hover:bg-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 focus:ring-offset-2">
              {actionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
