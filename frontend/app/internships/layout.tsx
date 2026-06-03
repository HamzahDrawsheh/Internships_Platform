import type { ReactNode } from "react";
import { InternshipsLayoutShell } from "@/components/layout/InternshipsLayoutShell";

export default function InternshipsLayout({ children }: { children: ReactNode }) {
  return <InternshipsLayoutShell>{children}</InternshipsLayoutShell>;
}
