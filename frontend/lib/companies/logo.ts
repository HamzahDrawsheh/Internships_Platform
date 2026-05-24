import type { SupabaseClient } from "@supabase/supabase-js";

export const COMPANY_LOGO_BUCKET = "company-logos";
export const MAX_COMPANY_LOGO_BYTES = 2 * 1024 * 1024;

const ALLOWED_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp", "gif", "svg"]);

export function resolveCompanyLogoUrl(url?: string | null, cacheBust?: number): string | undefined {
  const trimmed = typeof url === "string" ? url.trim() : "";
  if (!trimmed) return undefined;
  if (cacheBust == null) return trimmed;
  const separator = trimmed.includes("?") ? "&" : "?";
  return `${trimmed}${separator}v=${cacheBust}`;
}

function logoExtension(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && ALLOWED_EXTENSIONS.has(fromName)) return fromName === "jpeg" ? "jpg" : fromName;

  const fromType = file.type.split("/").pop()?.toLowerCase();
  if (fromType === "svg+xml") return "svg";
  if (fromType && ALLOWED_EXTENSIONS.has(fromType)) return fromType === "jpeg" ? "jpg" : fromType;

  return "png";
}

function normalizeImageContentType(file: File, ext: string): string {
  const type = file.type.trim().toLowerCase();
  if (type.startsWith("image/")) {
    if (type === "image/jpg" || type === "image/pjpeg") return "image/jpeg";
    return type;
  }
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "svg") return "image/svg+xml";
  return `image/${ext}`;
}

export type UploadCompanyLogoResult =
  | { ok: true; publicUrl: string }
  | { ok: false; error: string };

export async function uploadCompanyLogo(
  supabase: SupabaseClient,
  companyId: string,
  file: File
): Promise<UploadCompanyLogoResult> {
  if (!file.type.startsWith("image/")) {
    return { ok: false, error: "Only image files are allowed." };
  }
  if (file.size > MAX_COMPANY_LOGO_BYTES) {
    return { ok: false, error: "Logo must be 2MB or smaller." };
  }

  const ext = logoExtension(file);
  const objectPath = `companies/${companyId}/logo.${ext}`;
  const contentType = normalizeImageContentType(file, ext);

  const { error: uploadError } = await supabase.storage.from(COMPANY_LOGO_BUCKET).upload(objectPath, file, {
    upsert: true,
    contentType,
  });

  if (uploadError) {
    console.error("company logo upload error:", uploadError);
    return { ok: false, error: uploadError.message || "Upload failed." };
  }

  const { data: publicData } = supabase.storage.from(COMPANY_LOGO_BUCKET).getPublicUrl(objectPath);
  const baseUrl = publicData?.publicUrl?.trim();
  if (!baseUrl) {
    return { ok: false, error: "Uploaded logo but could not resolve URL." };
  }

  const publicUrl = resolveCompanyLogoUrl(baseUrl, Date.now())!;
  const { error: updateError } = await supabase.from("companies").update({ logo_url: publicUrl }).eq("id", companyId);

  if (updateError) {
    console.error("company logo_url update error:", updateError);
    return { ok: false, error: updateError.message || "Uploaded file but could not save logo URL." };
  }

  return { ok: true, publicUrl };
}
