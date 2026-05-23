type DashboardStatCardProps = {
  label: string;
  value: number | string;
  cardClass: string;
  delayMs?: number;
  href?: string;
};

export function DashboardStatCard({ label, value, cardClass, delayMs = 0, href }: DashboardStatCardProps) {
  const inner = (
    <>
      <p className="text-sm font-medium">{label}</p>
      <p className="mt-4 text-3xl font-bold tabular-nums">{value}</p>
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        className={`animate-fade-up block rounded-2xl p-6 shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-md ${cardClass}`}
        style={{ animationDelay: `${delayMs}ms` }}
      >
        {inner}
      </a>
    );
  }

  return (
    <article
      className={`animate-fade-up rounded-2xl p-6 shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-md ${cardClass}`}
      style={{ animationDelay: `${delayMs}ms` }}
    >
      {inner}
    </article>
  );
}

export function DashboardStatGrid({ children }: { children: React.ReactNode }) {
  return <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{children}</section>;
}
