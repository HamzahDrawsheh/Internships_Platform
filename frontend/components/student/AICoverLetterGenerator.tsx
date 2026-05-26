"use client";

import { useCallback, useState } from "react";
import { Button, Modal, Textarea } from "@/components/ui";
import { useI18n } from "@/lib/i18n/context";
import type { CoverLetterContextUsed } from "@/lib/ai/cover-letter-context";

type Props = {
  positionId: string;
  enabled: boolean;
  disabled?: boolean;
};

type GenerateResponse =
  | {
      ok: true;
      coverLetter: string;
      contextUsed: CoverLetterContextUsed;
      profileIncomplete: boolean;
    }
  | { ok: false; error?: string };

const ERROR_KEYS: Record<string, string> = {
  unauthenticated: "coverLetter.errorLogin",
  forbidden: "coverLetter.errorForbidden",
  ai_not_configured: "coverLetter.errorNotConfigured",
  rate_limited: "coverLetter.errorRateLimited",
  openai_failed: "coverLetter.errorGenerate",
  empty_response: "coverLetter.errorGenerate",
  position_not_found: "coverLetter.errorGenerate",
};

export function AICoverLetterGenerator({ positionId, enabled, disabled }: Props) {
  const { t, isArabic } = useI18n();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coverLetter, setCoverLetter] = useState("");
  const [contextUsed, setContextUsed] = useState<CoverLetterContextUsed | null>(null);
  const [profileIncomplete, setProfileIncomplete] = useState(false);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    setLoading(true);
    setError(null);
    setCopied(false);

    try {
      const res = await fetch("/api/ai/cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          positionId,
          locale: isArabic ? "ar" : "en",
        }),
      });

      const data = (await res.json()) as GenerateResponse & { error?: string };

      if (!res.ok || !data.ok) {
        const code = data.error ?? "openai_failed";
        const key = ERROR_KEYS[code];
        setError(key ? t(key) : t("coverLetter.errorGenerate"));
        setLoading(false);
        return;
      }

      setCoverLetter(data.coverLetter);
      setContextUsed(data.contextUsed);
      setProfileIncomplete(data.profileIncomplete);
    } catch {
      setError(t("coverLetter.errorGenerate"));
    } finally {
      setLoading(false);
    }
  }, [positionId, isArabic, t]);

  const handleOpen = () => {
    setOpen(true);
    if (!coverLetter) {
      void generate();
    }
  };

  const handleCopy = async () => {
    if (!coverLetter.trim()) return;
    try {
      await navigator.clipboard.writeText(coverLetter);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(t("coverLetter.errorCopy"));
    }
  };

  if (!enabled) {
    return null;
  }

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        disabled={disabled}
        onClick={handleOpen}
        className="border-violet-200 bg-gradient-to-r from-violet-50 to-indigo-50 text-violet-900 hover:from-violet-100 hover:to-indigo-100 dark:border-violet-500/40 dark:from-violet-500/15 dark:to-indigo-500/15 dark:text-violet-100 dark:hover:from-violet-500/25 dark:hover:to-indigo-500/25"
      >
        {t("coverLetter.generateButton")}
      </Button>

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title={t("coverLetter.modalTitle")}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button variant="secondary" onClick={() => void generate()} disabled={loading}>
              {t("coverLetter.regenerate")}
            </Button>
            <Button variant="primary" onClick={() => void handleCopy()} disabled={!coverLetter.trim() || loading}>
              {copied ? t("coverLetter.copied") : t("coverLetter.copy")}
            </Button>
          </>
        }
      >
        <div className="space-y-4" dir={isArabic ? "rtl" : "ltr"}>
          {loading && !coverLetter ? (
            <p className="text-sm text-violet-700 dark:text-violet-200" role="status">
              {t("coverLetter.generating")}
            </p>
          ) : null}

          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
              {error}
            </p>
          ) : null}

          {profileIncomplete && !loading ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
              {t("coverLetter.profileIncomplete")}
            </p>
          ) : null}

          {contextUsed ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
              <p className="font-semibold text-slate-900 dark:text-slate-100">{t("coverLetter.contextTitle")}</p>
              <ul className="mt-2 space-y-1">
                <li>
                  <span className="font-medium">{t("coverLetter.contextInternship")}:</span>{" "}
                  {contextUsed.internshipTitle}
                </li>
                <li>
                  <span className="font-medium">{t("coverLetter.contextCompany")}:</span>{" "}
                  {contextUsed.companyName}
                </li>
                <li>
                  <span className="font-medium">{t("coverLetter.contextSkills")}:</span> {contextUsed.skills}
                </li>
                <li>
                  <span className="font-medium">{t("coverLetter.contextCourses")}:</span> {contextUsed.courses}
                </li>
                <li>
                  <span className="font-medium">{t("coverLetter.contextProjects")}:</span> {contextUsed.projects}
                </li>
              </ul>
            </div>
          ) : null}

          <p className="text-xs text-slate-500 dark:text-slate-400">{t("coverLetter.editNote")}</p>

          <Textarea
            label={t("coverLetter.textareaLabel")}
            rows={12}
            value={coverLetter}
            onChange={(e) => setCoverLetter(e.target.value)}
            disabled={loading && !coverLetter}
            className="font-sans text-sm leading-relaxed"
          />

          <p className="text-xs text-slate-500 dark:text-slate-400">{t("coverLetter.disclaimer")}</p>
        </div>
      </Modal>
    </>
  );
}
