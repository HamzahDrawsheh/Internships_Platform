import type { ReactNode } from "react";
import { SettingsRoleLayout } from "@/components/layout/SettingsRoleLayout";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return <SettingsRoleLayout>{children}</SettingsRoleLayout>;
}
