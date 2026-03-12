import Link from "next/link";
import Table from "@/components/common/Table";
import ApplicationStatusBadge from "./ApplicationStatusBadge";
import type { Application } from "@/lib/types";

interface ApplicationTableProps {
  applications: Application[];
  showViewAction?: boolean;
}

export default function ApplicationTable({ applications, showViewAction = true }: ApplicationTableProps) {
  if (applications.length === 0) return null;
  return (
    <Table headers={["Internship", "Company", "Applied date", "Status", ...(showViewAction ? ["Action"] : [])]}>
      {applications.map((app) => (
        <tr key={app.id} className="hover:bg-gray-50">
          <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">{app.internship_title ?? "—"}</td>
          <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">{app.company_name ?? "—"}</td>
          <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">{new Date(app.applied_at).toLocaleDateString()}</td>
          <td className="whitespace-nowrap px-4 py-3">
            <ApplicationStatusBadge status={app.status} />
          </td>
          {showViewAction && (
            <td className="whitespace-nowrap px-4 py-3">
                <Link href={`/internships/${app.position_id}`} className="text-sm font-medium text-gray-600 hover:text-gray-900">
                View
              </Link>
            </td>
          )}
        </tr>
      ))}
    </Table>
  );
}
