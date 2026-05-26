"use client";

import { Button } from "@/components/ui";
import { useMessagingActions } from "@/hooks/useMessagingActions";

type Props = {
  companyOwnerUserId: string;
  companyName: string;
  variant?: "primary" | "secondary";
  className?: string;
  compact?: boolean;
};

export function MessageCompanyButton({
  companyOwnerUserId,
  companyName,
  variant = "secondary",
  className = "",
  compact = false,
}: Props) {
  const { canMessage, viewerRole, messageCompany } = useMessagingActions();

  if (!canMessage || viewerRole !== "student" || !companyOwnerUserId) return null;

  return (
    <Button
      type="button"
      variant={variant}
      className={className}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        messageCompany(companyOwnerUserId, companyName);
      }}
    >
      {compact ? "💬" : "💬 Message"}
    </Button>
  );
}
