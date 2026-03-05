import Link from "next/link";
import Badge from "@/components/common/Badge";
import Button from "@/components/common/Button";
import type { Internship } from "@/lib/types";

const locationLabel: Record<string, string> = {
  remote: "Remote",
  onsite: "On-site",
  hybrid: "Hybrid",
};

interface InternshipCardProps {
  internship: Internship;
}

export default function InternshipCard({ internship }: InternshipCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-gray-900">{internship.title}</h3>
          <p className="mt-1 text-sm text-gray-600">{internship.company_name ?? "Company"}</p>
        </div>
        <Badge variant="info">{locationLabel[internship.location_type ?? ""] ?? internship.location_type ?? "—"}</Badge>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {(internship.skills ?? []).slice(0, 3).map((s) => (
          <span key={s} className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">{s}</span>
        ))}
      </div>
      <p className="mt-2 text-xs text-gray-500">Deadline: {internship.deadline ? new Date(internship.deadline).toLocaleDateString() : "—"}</p>
      <div className="mt-4">
        <Link href={`/internships/${internship.id}`}>
          <Button variant="secondary" className="w-full sm:w-auto">View Details</Button>
        </Link>
      </div>
    </div>
  );
}
