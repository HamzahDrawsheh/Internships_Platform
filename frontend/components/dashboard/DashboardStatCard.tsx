import {
  MetricStatCard,
  MetricStatGrid,
  metricToneFromCardClass,
  type MetricStatTone,
} from "@/components/dashboard/MetricStatCard";

type DashboardStatCardProps = {
  label: string;
  value: number | string;
  /** Preferred — maps to premium stat card palette */
  tone?: MetricStatTone;
  /** @deprecated Use `tone` instead */
  cardClass?: string;
  delayMs?: number;
  href?: string;
};

export function DashboardStatCard({
  label,
  value,
  tone,
  cardClass = "",
  href,
}: DashboardStatCardProps) {
  const resolvedTone = tone ?? metricToneFromCardClass(cardClass);
  return <MetricStatCard label={label} value={value} tone={resolvedTone} href={href} />;
}

export function DashboardStatGrid({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <MetricStatGrid className={className}>{children}</MetricStatGrid>;
}
