import type { SupabaseClient } from "@supabase/supabase-js";
import type { DmConversationKind } from "@/lib/messaging";

export type MessagingContact = {
  userId: string;
  label: string;
  kind: DmConversationKind;
  subtitle?: string;
};

export async function saveMessagingContact(
  supabase: SupabaseClient,
  ownerUserId: string,
  contactUserId: string,
  kind: DmConversationKind,
  displayName?: string,
) {
  const { error } = await supabase.from("dm_contacts").upsert(
    {
      owner_user_id: ownerUserId,
      contact_user_id: contactUserId,
      kind,
      display_name: displayName?.trim() || null,
    },
    { onConflict: "owner_user_id,contact_user_id,kind" },
  );
  if (error) throw error;
}

export async function saveMutualContacts(
  supabase: SupabaseClient,
  viewerUserId: string,
  peerUserId: string,
  kind: DmConversationKind,
  _reciprocalLabel?: string,
  peerLabel?: string,
) {
  // Only the signed-in user may write their own dm_contacts row (RLS).
  await saveMessagingContact(supabase, viewerUserId, peerUserId, kind, peerLabel);
}

export async function fetchSavedContacts(supabase: SupabaseClient, ownerUserId: string): Promise<MessagingContact[]> {
  const { data, error } = await supabase
    .from("dm_contacts")
    .select("contact_user_id, kind, display_name")
    .eq("owner_user_id", ownerUserId)
    .order("created_at", { ascending: false });
  if (error || !data?.length) return [];

  const contactIds = [...new Set(data.map((r) => r.contact_user_id as string))];
  const { data: profiles } = await supabase.from("profiles").select("id, full_name, email, role").in("id", contactIds);
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  const companyUserIds = profiles?.filter((p) => p.role === "company").map((p) => p.id) ?? [];
  const companyNames = new Map<string, string>();
  if (companyUserIds.length) {
    const { data: companies } = await supabase.from("companies").select("user_id, company_name").in("user_id", companyUserIds);
    companies?.forEach((c) => {
      if (c.user_id && c.company_name?.trim()) companyNames.set(c.user_id, c.company_name.trim());
    });
  }

  return data.map((row) => {
    const userId = row.contact_user_id as string;
    const kind = row.kind as DmConversationKind;
    const profile = profileById.get(userId);
    const savedName = (row.display_name as string | null)?.trim();
    const label =
      savedName ||
      companyNames.get(userId) ||
      profile?.full_name?.trim() ||
      profile?.email ||
      "Contact";
    const subtitle = kind === "student_supervisor" ? "Supervisor" : kind === "student_company" ? "Company" : "Student";
    return { userId, label, kind, subtitle };
  });
}
