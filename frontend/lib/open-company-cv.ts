/** Opens applicant CV in a new tab using the signed-URL API (company role only). */
export async function openCompanyApplicantCv(applicationId: string): Promise<void> {
  const res = await fetch(`/api/company/applications/${encodeURIComponent(applicationId)}/cv`);
  const data = (await res.json()) as { signedUrl?: string; error?: string };

  if (!res.ok) {
    throw new Error(data.error ?? `Request failed (${res.status})`);
  }

  if (!data.signedUrl) {
    throw new Error("No download URL returned");
  }

  window.open(data.signedUrl, "_blank", "noopener,noreferrer");
}
