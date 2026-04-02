import Link from "next/link";

interface InternshipCardProps {
  id: string;
  title: string;
  companyName?: string;
  locationType?: string;
  skills?: string[];
  deadline?: string;
}

export function InternshipCard({ id, title, companyName, locationType, skills = [], deadline }: InternshipCardProps) {
  return (
    <Link href={`/internships/${id}`}>
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 text-[#0F172A] shadow-sm transition-all duration-300 hover:border-[#7C3AED]/30 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:text-white">
        <h3 className="font-semibold text-[#0F172A] transition-colors duration-300 dark:text-white">{title}</h3>
        {companyName && <p className="mt-1 text-sm text-[#0F172A]/70 transition-colors duration-300 dark:text-slate-400">{companyName}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          {locationType && (
            <span className="rounded-lg bg-[#F3E8FF] px-2 py-1 text-xs font-medium text-[#7C3AED]">
              {locationType}
            </span>
          )}
          {skills.slice(0, 3).map((s) => (
            <span key={s} className="rounded-lg bg-[#F8FAFC] px-2 py-1 text-xs text-[#0F172A]/80 transition-colors duration-300 dark:bg-slate-800 dark:text-slate-300">
              {s}
            </span>
          ))}
        </div>
        {deadline && <p className="mt-3 text-xs text-[#0F172A]/60 transition-colors duration-300 dark:text-slate-400">Deadline: {deadline}</p>}
      </div>
    </Link>
  );
}
