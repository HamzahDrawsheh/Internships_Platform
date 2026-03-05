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
    <div className={"flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50/50 px-4 py-12 text-center " + className}>
      <h3 className="text-lg font-medium text-gray-900">{title}</h3>
      {description && <p className="mt-2 max-w-sm text-sm text-gray-600">{description}</p>}
      {(actionLabel && (actionHref ?? onAction)) && (
        <div className="mt-4">
          {actionHref ? (
            <Link href={actionHref} className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50">
              {actionLabel}
            </Link>
          ) : (
            <button type="button" onClick={onAction} className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2">
              {actionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
