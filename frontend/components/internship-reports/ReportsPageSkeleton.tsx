export function ReportsPageSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-24 rounded-2xl bg-gray-200 dark:bg-gray-800" />
      <div className="h-32 rounded-2xl bg-gray-200 dark:bg-gray-800" />
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-2xl bg-gray-200 dark:bg-gray-800" />
        ))}
      </div>
    </div>
  );
}
