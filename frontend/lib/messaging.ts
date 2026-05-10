export type DmConversationKind = "student_supervisor" | "student_company";

export type DmConversationRow = {
  id: string;
  kind: DmConversationKind;
  student_user_id: string;
  peer_user_id: string;
  updated_at: string;
  created_at?: string;
};

export type DmMessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export type MessagingViewerRole = "student" | "supervisor" | "company";

export function messagesInboxPath(role: MessagingViewerRole): string {
  switch (role) {
    case "student":
      return "/dashboard/student/messages";
    case "supervisor":
      return "/supervisor/messages";
    case "company":
      return "/company/messages";
    default:
      return "/notifications";
  }
}

export function conversationUrl(basePath: string, conversationId: string | null): string {
  if (!conversationId) return basePath;
  return `${basePath}?c=${encodeURIComponent(conversationId)}`;
}

export function notificationConversationHref(
  role: MessagingViewerRole | string | null | undefined,
  conversationId: string | null | undefined,
): string | null {
  if (!conversationId || !role) return null;
  if (role !== "student" && role !== "supervisor" && role !== "company") return null;
  return conversationUrl(messagesInboxPath(role), conversationId);
}

export function peerUserId(conv: Pick<DmConversationRow, "student_user_id" | "peer_user_id">, viewerUserId: string): string {
  return viewerUserId === conv.student_user_id ? conv.peer_user_id : conv.student_user_id;
}
