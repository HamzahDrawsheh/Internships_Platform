import Link from "next/link";

interface CompanyCardProps {
  id: string;
  name: string;
  industry?: string;
  location?: string;
  rating?: number;
  logoUrl?: string;
}

export function CompanyCard({ id, name, industry, location, rating, logoUrl }: CompanyCardProps) {
  return (
    <Link href={`/companies/${id}`}>
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 text-[#0F172A] shadow-sm transition-all duration-300 hover:border-[#7C3AED]/30 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:text-white">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#F3E8FF] text-2xl transition-colors duration-300 dark:bg-slate-800">
            {logoUrl ? (
              <img src={logoUrl} alt="" className="h-full w-full rounded-xl object-cover" />
            ) : (
              <span className="font-bold text-[#7C3AED]">{name.slice(0, 1)}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-[#0F172A] transition-colors duration-300 dark:text-white">{name}</h3>
            {industry && <p className="mt-1 text-sm text-[#0F172A]/70 transition-colors duration-300 dark:text-slate-400">{industry}</p>}
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[#0F172A]/70 transition-colors duration-300 dark:text-slate-400">
              {rating != null && (
                <span>★ {rating}</span>
              )}
              {location && <span>· {location}</span>}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
