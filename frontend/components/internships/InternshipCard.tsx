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
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-sm transition-all hover:border-[#7C3AED]/30 hover:shadow-md">
        <h3 className="font-semibold text-[#0F172A]">{title}</h3>
        {companyName && <p className="mt-1 text-sm text-[#0F172A]/70">{companyName}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          {locationType && (
            <span className="rounded-lg bg-[#F3E8FF] px-2 py-1 text-xs font-medium text-[#7C3AED]">
              {locationType}
            </span>
          )}
          {skills.slice(0, 3).map((s) => (
            <span key={s} className="rounded-lg bg-[#F8FAFC] px-2 py-1 text-xs text-[#0F172A]/80">
              {s}
            </span>
          ))}
        </div>
        {deadline && <p className="mt-3 text-xs text-[#0F172A]/60">Deadline: {deadline}</p>}
      </div>
    </Link>
  );
}
