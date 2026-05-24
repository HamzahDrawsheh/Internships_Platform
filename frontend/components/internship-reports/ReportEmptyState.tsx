"use client";

import Link from "next/link";
import { Button } from "@/components/ui";
import { useI18n } from "@/lib/i18n/context";

export function ReportEmptyState() {
  const { lt } = useI18n();
  const steps = [
    { n: 1, title: "Apply & get accepted", desc: "Company accepts your internship application." },
    { n: 2, title: "Supervisor approves", desc: "University supervisor activates tracking." },
    { n: 3, title: "Monthly reports appear", desc: "Submit Part I each month; employer & supervisor complete the cycle." },
  ];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-8 dark:border-gray-800 dark:bg-gray-900">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{lt("No internship tracking yet")}</h3>
      <p className="mt-2 text-sm text-gray-500">{lt("Follow these steps to start monthly reports:")}</p>
      <ol className="mt-6 space-y-4">
        {steps.map((s) => (
          <li key={s.n} className="flex gap-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-100 text-sm font-bold text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
              {s.n}
            </span>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">{lt(s.title)}</p>
              <p className="text-sm text-gray-500">{lt(s.desc)}</p>
            </div>
          </li>
        ))}
      </ol>
      <Link href="/applications" className="mt-6 inline-block">
        <Button variant="secondary">{lt("View my applications")}</Button>
      </Link>
    </div>
  );
}
