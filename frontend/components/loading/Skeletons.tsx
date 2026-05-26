const pulseCard =
  "animate-pulse rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900";
const block = "rounded bg-gray-200 dark:bg-gray-700";

export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`${block} ${className}`} aria-hidden />;
}

export function SkeletonCard({
  className = "",
  children,
  padding = "p-6",
}: {
  className?: string;
  children: React.ReactNode;
  padding?: string;
}) {
  return <div className={`${pulseCard} ${padding} ${className}`}>{children}</div>;
}

export function WelcomeBannerSkeleton({ className = "" }: { className?: string }) {
  return (
    <SkeletonCard className={className}>
      <SkeletonBlock className="h-7 w-56 max-w-full" />
      <SkeletonBlock className="mt-3 h-4 w-72 max-w-full" />
    </SkeletonCard>
  );
}

export function StatCardsSkeleton({
  count = 4,
  className = "",
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-4 ${className}`}>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} padding="p-5">
          <SkeletonBlock className="h-4 w-24" />
          <SkeletonBlock className="mt-4 h-8 w-12" />
        </SkeletonCard>
      ))}
    </div>
  );
}

export function TrackCardSkeleton({ className = "" }: { className?: string }) {
  return (
    <SkeletonCard className={className}>
      <SkeletonBlock className="h-5 w-44" />
      <SkeletonBlock className="mt-2 h-4 w-56 max-w-full" />
      <SkeletonBlock className="mt-6 h-3 w-full rounded-full" />
      <div className="mt-4 flex justify-between">
        <SkeletonBlock className="h-4 w-28" />
        <SkeletonBlock className="h-4 w-20" />
      </div>
    </SkeletonCard>
  );
}

export function TableSectionSkeleton({ rows = 5, className = "" }: { rows?: number; className?: string }) {
  return (
    <SkeletonCard className={className}>
      <SkeletonBlock className="h-6 w-48" />
      <SkeletonBlock className="mt-2 h-4 w-64 max-w-full" />
      <div className="mt-6 space-y-3">
        {Array.from({ length: rows }, (_, i) => (
          <SkeletonBlock key={i} className="h-12 w-full rounded-xl" />
        ))}
      </div>
    </SkeletonCard>
  );
}

export function FilterBarSkeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-wrap gap-3 ${className}`}>
      <SkeletonBlock className="h-10 min-w-[12rem] flex-1 rounded-xl" />
      <SkeletonBlock className="h-10 w-36 rounded-xl" />
      <SkeletonBlock className="h-10 w-28 rounded-xl" />
    </div>
  );
}

type DashboardPageSkeletonProps = {
  statCount?: number;
  showWelcome?: boolean;
  showWidget?: boolean;
  showTrack?: boolean;
  showTable?: boolean;
  tableRows?: number;
  className?: string;
};

export function DashboardPageSkeleton({
  statCount = 4,
  showWelcome = true,
  showWidget = false,
  showTrack = false,
  showTable = false,
  tableRows = 5,
  className = "",
}: DashboardPageSkeletonProps) {
  return (
    <div className={`space-y-6 ${className}`} role="status" aria-label="Loading page">
      {showWelcome ? <WelcomeBannerSkeleton /> : null}
      {showWidget ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <SkeletonBlock className="h-52 rounded-2xl" />
          <SkeletonBlock className="h-52 rounded-2xl" />
          <SkeletonBlock className="h-52 rounded-2xl" />
        </div>
      ) : null}
      {statCount > 0 ? <StatCardsSkeleton count={statCount} /> : null}
      {showTrack ? <TrackCardSkeleton /> : null}
      {showTable ? <TableSectionSkeleton rows={tableRows} /> : null}
    </div>
  );
}

export function TableListPageSkeleton({
  rows = 6,
  showFilters = true,
  showWelcome = true,
  className = "",
}: {
  rows?: number;
  showFilters?: boolean;
  showWelcome?: boolean;
  className?: string;
}) {
  return (
    <div className={`space-y-6 ${className}`} role="status" aria-label="Loading page">
      {showWelcome ? <WelcomeBannerSkeleton /> : null}
      {showFilters ? <FilterBarSkeleton /> : null}
      <TableSectionSkeleton rows={rows} />
    </div>
  );
}

export function ProfileFormSkeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`space-y-6 ${className}`} role="status" aria-label="Loading profile">
      <WelcomeBannerSkeleton />
      <SkeletonCard>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <SkeletonBlock className="h-20 w-20 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-3">
            <SkeletonBlock className="h-10 w-full rounded-xl" />
            <SkeletonBlock className="h-10 w-full rounded-xl" />
          </div>
        </div>
        <div className="mt-6 space-y-5">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i}>
              <SkeletonBlock className="h-4 w-28" />
              <SkeletonBlock className="mt-2 h-10 w-full rounded-xl" />
            </div>
          ))}
        </div>
      </SkeletonCard>
    </div>
  );
}

export function DetailPageSkeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`space-y-6 ${className}`} role="status" aria-label="Loading details">
      <SkeletonBlock className="h-36 rounded-2xl" />
      <SkeletonCard>
        <SkeletonBlock className="h-8 w-2/3 max-w-md" />
        <SkeletonBlock className="mt-4 h-4 w-full" />
        <SkeletonBlock className="mt-2 h-4 w-full" />
        <SkeletonBlock className="mt-2 h-4 w-4/5" />
        <div className="mt-6 flex flex-wrap gap-3">
          <SkeletonBlock className="h-10 w-32 rounded-xl" />
          <SkeletonBlock className="h-10 w-36 rounded-xl" />
        </div>
      </SkeletonCard>
      <SkeletonCard>
        <SkeletonBlock className="h-5 w-40" />
        <div className="mt-4 space-y-2">
          <SkeletonBlock className="h-4 w-full" />
          <SkeletonBlock className="h-4 w-full" />
          <SkeletonBlock className="h-4 w-3/4" />
        </div>
      </SkeletonCard>
    </div>
  );
}

export function CompanyCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="h-20 animate-pulse bg-gray-200 dark:bg-gray-700" />
      <div className="animate-pulse space-y-3 px-5 pb-5 pt-11">
        <SkeletonBlock className="h-5 w-2/3" />
        <SkeletonBlock className="h-4 w-1/3" />
        <SkeletonBlock className="h-4 w-full" />
        <SkeletonBlock className="h-4 w-5/6" />
      </div>
    </div>
  );
}

export function InternshipCardSkeleton() {
  return (
    <SkeletonCard padding="p-5">
      <SkeletonBlock className="h-5 w-3/4" />
      <SkeletonBlock className="mt-3 h-4 w-1/2" />
      <div className="mt-4 flex flex-wrap gap-2">
        <SkeletonBlock className="h-6 w-16 rounded-full" />
        <SkeletonBlock className="h-6 w-20 rounded-full" />
        <SkeletonBlock className="h-6 w-14 rounded-full" />
      </div>
      <SkeletonBlock className="mt-4 h-4 w-full" />
      <SkeletonBlock className="mt-2 h-4 w-5/6" />
    </SkeletonCard>
  );
}

export function CardGridSkeleton({
  count = 6,
  variant = "internship",
  columns = "sm:grid-cols-2 lg:grid-cols-3",
  className = "",
}: {
  count?: number;
  variant?: "internship" | "company";
  columns?: string;
  className?: string;
}) {
  const Card = variant === "company" ? CompanyCardSkeleton : InternshipCardSkeleton;
  return (
    <div className={`grid gap-4 ${columns} ${className}`} role="status" aria-label="Loading items">
      {Array.from({ length: count }, (_, i) => (
        <Card key={i} />
      ))}
    </div>
  );
}

export function MessagesPageSkeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex min-h-[420px] animate-pulse gap-4 ${className}`}
      role="status"
      aria-label="Loading messages"
    >
      <SkeletonCard className="hidden w-72 shrink-0 space-y-3 sm:block" padding="p-4">
        <SkeletonBlock className="h-9 w-full rounded-xl" />
        {Array.from({ length: 5 }, (_, i) => (
          <SkeletonBlock key={i} className="h-14 w-full rounded-xl" />
        ))}
      </SkeletonCard>
      <SkeletonCard className="min-w-0 flex-1" padding="p-4">
        <SkeletonBlock className="h-6 w-40" />
        <div className="mt-6 space-y-4">
          <SkeletonBlock className="ml-auto h-12 w-2/3 max-w-sm rounded-2xl" />
          <SkeletonBlock className="h-16 w-3/4 max-w-md rounded-2xl" />
          <SkeletonBlock className="ml-auto h-10 w-1/2 max-w-xs rounded-2xl" />
        </div>
        <SkeletonBlock className="mt-auto h-11 w-full rounded-xl" />
      </SkeletonCard>
    </div>
  );
}

export function ReportsPageSkeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`space-y-6 ${className}`} role="status" aria-label="Loading reports">
      <SkeletonBlock className="h-24 rounded-2xl" />
      <SkeletonBlock className="h-32 rounded-2xl" />
      <div className="space-y-3">
        {Array.from({ length: 3 }, (_, i) => (
          <SkeletonBlock key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

export function SimplePageSkeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`space-y-6 ${className}`} role="status" aria-label="Loading page">
      <WelcomeBannerSkeleton />
      <SkeletonCard>
        <SkeletonBlock className="h-4 w-full" />
        <SkeletonBlock className="mt-3 h-4 w-5/6" />
        <SkeletonBlock className="mt-3 h-4 w-2/3" />
      </SkeletonCard>
    </div>
  );
}
