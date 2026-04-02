import Link from "next/link";
import Button from "./Button";

interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}

export default function EmptyState({ title, description, actionLabel, actionHref, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50/50 py-12 px-4 text-center transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900">
      <h3 className="text-lg font-medium text-gray-900 transition-colors duration-300 dark:text-white">{title}</h3>
      {description && <p className="mt-2 max-w-sm text-sm text-gray-600 transition-colors duration-300 dark:text-slate-400">{description}</p>}
      {(actionLabel && (actionHref || onAction)) && (
        <div className="mt-4">
          {actionHref ? (
            <Link href={actionHref}>
              <Button variant="primary">{actionLabel}</Button>
            </Link>
          ) : (
            <Button variant="primary" onClick={onAction}>{actionLabel}</Button>
          )}
        </div>
      )}
    </div>
  );
}
