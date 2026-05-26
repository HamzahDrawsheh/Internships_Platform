"use client";

import { Button } from "@/components/ui";
import { useMessagingActions } from "@/hooks/useMessagingActions";
import type { DmConversationKind } from "@/lib/messaging";

type Props = {
  studentUserId: string;
  studentName: string;
  kind?: DmConversationKind;
  variant?: "primary" | "secondary";
  className?: string;
  onMessage?: () => void;
};

export function MessageStudentButton({
  studentUserId,
  studentName,
  kind = "student_company",
  variant = "secondary",
  className = "",
  onMessage,
}: Props) {
  const { canMessage, viewerRole, messageStudent } = useMessagingActions();

  if (!canMessage || !studentUserId || (viewerRole !== "company" && viewerRole !== "supervisor")) return null;

  return (
    <Button
      type="button"
      variant={variant}
      className={className}
      onClick={() => {
        messageStudent(studentUserId, studentName, kind);
        onMessage?.();
      }}
    >
      💬 Message
    </Button>
  );
}
