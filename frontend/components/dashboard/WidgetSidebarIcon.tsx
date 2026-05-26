import { SidebarIcon, type SidebarIconName } from "@/components/layout/SidebarIcon";

type Props = {
  name: SidebarIconName;
  active?: boolean;
};

/** Dashboard widget header icon — matches sidebar purple shell styling. */
export function WidgetSidebarIcon({ name, active = true }: Props) {
  return (
    <span className="scale-[1.15]">
      <SidebarIcon name={name} active={active} />
    </span>
  );
}
