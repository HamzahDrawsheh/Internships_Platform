import Link from "next/link";

type Props = {
  count: number;
  href: string;
  label: string;
};

export function DashboardReportWidget({ count, href, label }: Props) {
  if (count <= 0) return null;
  return (
    <Link
      href={href}
      className="block rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm transition hover:border-amber-300 dark:border-amber-900/50 dark:bg-amber-950/20"
    >
      <span className="font-semibold text-amber-900 dark:text-amber-200">{count}</span>
      <span className="text-amber-800 dark:text-amber-300"> {label}</span>
    </Link>
  );
}
