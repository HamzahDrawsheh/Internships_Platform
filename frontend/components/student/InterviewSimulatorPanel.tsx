"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { InterviewAssessmentSummary } from "@/components/student/InterviewAssessmentSummary";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge, Button, Card, EmptyState, Select, Textarea } from "@/components/ui";
import { SimplePageSkeleton } from "@/components/loading";
import { INTERVIEW_MAX_QUESTIONS } from "@/lib/ai/interview-simulator";
import { useI18n } from "@/lib/i18n/context";
import { fmt } from "@/lib/i18n/format";
import { createClient } from "@/lib/supabase/client";

type InternshipOption = {
  positionId: string;
  label: string;
  status: string;
};

type EvaluationResult = {
  score: number;
  strengths: string[];
  weaknesses: string[];
  suggestedAnswer: string;
};

type HistoryItem = {
  question: string;
  answer: string;
  evaluation: EvaluationResult;
};

type ApiErrorCode =
  | "unauthenticated"
  | "forbidden"
  | "ai_not_configured"
  | "rate_limited"
  | "openai_failed"
  | "invalid_ai_response"
  | "application_required"
  | "answer_too_short"
  | "position_id_required"
  | string;

const ERROR_KEYS: Record<string, string> = {
  unauthenticated: "interviewSimulator.errorLogin",
  forbidden: "interviewSimulator.errorForbidden",
  ai_not_configured: "interviewSimulator.errorNotConfigured",
  rate_limited: "interviewSimulator.errorRateLimited",
  openai_failed: "interviewSimulator.errorGenerate",
  invalid_ai_response: "interviewSimulator.errorGenerate",
  application_required: "interviewSimulator.errorApplicationRequired",
  answer_too_short: "interviewSimulator.errorAnswerTooShort",
};

type Phase = "setup" | "interview" | "feedback" | "complete";

export function InterviewSimulatorPanel() {
  const { t, isArabic } = useI18n();
  const locale = isArabic ? "ar" : "en";

  const [loadingOptions, setLoadingOptions] = useState(true);
  const [options, setOptions] = useState<InternshipOption[]>([]);
  const [selectedPositionId, setSelectedPositionId] = useState("");
  const [phase, setPhase] = useState<Phase>("setup");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [currentQuestion, setCurrentQuestion] = useState("");
  const [questionNumber, setQuestionNumber] = useState(1);
  const [answer, setAnswer] = useState("");
  const [lastEvaluation, setLastEvaluation] = useState<EvaluationResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [pendingNextQuestion, setPendingNextQuestion] = useState<string | null>(null);

  const selectOptions = useMemo(
    () => options.map((option) => ({ value: option.positionId, label: option.label })),
    [options]
  );

  const resolveError = useCallback(
    (code: ApiErrorCode) => {
      const key = ERROR_KEYS[code];
      return key ? t(key) : t("interviewSimulator.errorGenerate");
    },
    [t]
  );

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    const load = async () => {
      setLoadingOptions(true);
      setError(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (!cancelled) {
          setOptions([]);
          setLoadingOptions(false);
        }
        return;
      }

      const { data: student } = await supabase
        .from("students")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!student?.id) {
        if (!cancelled) {
          setOptions([]);
          setLoadingOptions(false);
        }
        return;
      }

      const { data: appRows, error: appError } = await supabase
        .from("applications")
        .select("position_id, status")
        .eq("student_id", student.id)
        .order("applied_at", { ascending: false });

      if (appError || !appRows?.length) {
        if (!cancelled) {
          setOptions([]);
          setLoadingOptions(false);
        }
        return;
      }

      const positionIds = [...new Set(appRows.map((row) => row.position_id))];
      const { data: positions } = await supabase
        .from("internship_positions")
        .select("id, title, company_id")
        .in("id", positionIds);

      const companyIds = [...new Set((positions ?? []).map((p) => p.company_id).filter(Boolean))];
      const { data: companies } = companyIds.length
        ? await supabase.from("companies").select("id, company_name").in("id", companyIds)
        : { data: [] as { id: string; company_name: string | null }[] };

      const companiesById = new Map((companies ?? []).map((c) => [c.id, c.company_name ?? ""]));
      const positionsById = new Map((positions ?? []).map((p) => [p.id, p]));
      const statusByPosition = new Map(appRows.map((row) => [row.position_id, row.status ?? "pending"]));

      const mapped: InternshipOption[] = positionIds
        .map((positionId) => {
          const position = positionsById.get(positionId);
          if (!position) return null;
          const companyName = companiesById.get(position.company_id) ?? "";
          const title = position.title?.trim() || "Internship";
          const label = companyName ? `${title} — ${companyName}` : title;
          return {
            positionId,
            label,
            status: statusByPosition.get(positionId) ?? "pending",
          };
        })
        .filter((item): item is InternshipOption => item != null);

      if (!cancelled) {
        setOptions(mapped);
        if (mapped.length === 1) {
          setSelectedPositionId(mapped[0].positionId);
        }
        setLoadingOptions(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const resetSession = useCallback(() => {
    setPhase("setup");
    setBusy(false);
    setError(null);
    setCurrentQuestion("");
    setQuestionNumber(1);
    setAnswer("");
    setLastEvaluation(null);
    setHistory([]);
    setPendingNextQuestion(null);
  }, []);

  const callApi = useCallback(
    async (payload: Record<string, unknown>) => {
      const res = await fetch("/api/ai/interview-simulator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ ...payload, locale }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; data?: unknown };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "openai_failed");
      }
      return data.data;
    },
    [locale]
  );

  const handleStart = async () => {
    if (!selectedPositionId) {
      setError(t("interviewSimulator.errorNoSelection"));
      return;
    }

    setBusy(true);
    setError(null);
    setLastEvaluation(null);
    setHistory([]);
    setAnswer("");
    setPendingNextQuestion(null);

    try {
      const data = (await callApi({
        action: "start",
        positionId: selectedPositionId,
      })) as { question: string; questionNumber: number; totalQuestions: number };

      setCurrentQuestion(data.question);
      setQuestionNumber(data.questionNumber);
      setPhase("interview");
    } catch (err) {
      setError(resolveError(err instanceof Error ? err.message : "openai_failed"));
    } finally {
      setBusy(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!selectedPositionId || !currentQuestion.trim()) return;
    if (answer.trim().length < 10) {
      setError(t("interviewSimulator.errorAnswerTooShort"));
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const priorQa = history.map((item) => ({
        question: item.question,
        answer: item.answer,
        score: item.evaluation.score,
      }));

      const data = (await callApi({
        action: "evaluate",
        positionId: selectedPositionId,
        question: currentQuestion,
        answer: answer.trim(),
        questionNumber,
        priorQa,
      })) as {
        evaluation: EvaluationResult;
        nextQuestion: string | null;
        questionNumber: number;
        isComplete: boolean;
      };

      setLastEvaluation(data.evaluation);
      setHistory((prev) => [
        ...prev,
        {
          question: currentQuestion,
          answer: answer.trim(),
          evaluation: data.evaluation,
        },
      ]);
      setPendingNextQuestion(data.nextQuestion);
      setPhase(data.isComplete ? "complete" : "feedback");
    } catch (err) {
      setError(resolveError(err instanceof Error ? err.message : "openai_failed"));
    } finally {
      setBusy(false);
    }
  };

  const handleContinue = () => {
    if (pendingNextQuestion) {
      setCurrentQuestion(pendingNextQuestion);
      setQuestionNumber((prev) => prev + 1);
      setAnswer("");
      setLastEvaluation(null);
      setPendingNextQuestion(null);
      setPhase("interview");
      return;
    }
    setPhase("complete");
  };

  if (loadingOptions) {
    return (
      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-3xl">
          <SimplePageSkeleton />
          <p className="mt-4 text-sm text-violet-700 dark:text-violet-200" role="status">
            {t("interviewSimulator.loadingInternships")}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-3xl space-y-6" dir={isArabic ? "rtl" : "ltr"}>
        <PageHeader
          title={t("interviewSimulator.pageTitle")}
          description={t("interviewSimulator.pageDescription")}
        />

        {options.length === 0 ? (
          <EmptyState
            title={t("interviewSimulator.emptyTitle")}
            description={t("interviewSimulator.emptyDescription")}
            actionLabel={t("interviewSimulator.emptyAction")}
            actionHref="/internships"
          />
        ) : (
          <>
            {phase === "setup" ? (
              <Card className="space-y-4 p-5 sm:p-6">
                <div>
                  <label htmlFor="interview-position" className="mb-2 block text-sm font-medium text-gray-900 dark:text-white">
                    {t("interviewSimulator.selectLabel")}
                  </label>
                  <Select
                    id="interview-position"
                    value={selectedPositionId}
                    onChange={(event) => setSelectedPositionId(event.target.value)}
                    options={[
                      { value: "", label: "Select an internship you applied to" },
                      ...selectOptions,
                    ]}
                  />
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    type="button"
                    variant="primary"
                    disabled={busy || !selectedPositionId}
                    onClick={() => void handleStart()}
                  >
                    {busy ? t("interviewSimulator.starting") : t("interviewSimulator.startButton")}
                  </Button>
                </div>
              </Card>
            ) : null}

            {(phase === "interview" || phase === "feedback") && currentQuestion ? (
              <Card className="space-y-4 p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-violet-700 dark:text-violet-200">
                    {fmt(t("interviewSimulator.questionProgress"), {
                      current: questionNumber,
                      total: INTERVIEW_MAX_QUESTIONS,
                    })}
                  </p>
                  <Button type="button" variant="secondary" onClick={resetSession}>
                    {t("interviewSimulator.restartButton")}
                  </Button>
                </div>

                <div>
                  <p className="mb-2 text-sm font-medium text-gray-900 dark:text-white">
                    {t("interviewSimulator.questionLabel")}
                  </p>
                  <p className="rounded-xl border border-violet-200/80 bg-violet-50/70 px-4 py-3 text-sm leading-relaxed text-gray-900 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-slate-100">
                    {currentQuestion}
                  </p>
                </div>

                {phase === "interview" ? (
                  <>
                    <Textarea
                      label={t("interviewSimulator.answerLabel")}
                      value={answer}
                      onChange={(event) => setAnswer(event.target.value)}
                      placeholder={t("interviewSimulator.answerPlaceholder")}
                      rows={6}
                      disabled={busy}
                    />
                    <Button
                      type="button"
                      variant="primary"
                      disabled={busy || answer.trim().length < 10}
                      onClick={() => void handleSubmitAnswer()}
                    >
                      {busy ? t("interviewSimulator.evaluating") : t("interviewSimulator.submitAnswer")}
                    </Button>
                  </>
                ) : null}

                {phase === "feedback" && lastEvaluation ? (
                  <div className="space-y-4 border-t border-gray-200 pt-4 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {t("interviewSimulator.scoreLabel")}
                      </span>
                      <Badge variant="info">{`${lastEvaluation.score}/10`}</Badge>
                    </div>

                    <div>
                      <p className="mb-2 text-sm font-medium text-gray-900 dark:text-white">
                        {t("interviewSimulator.strengthsLabel")}
                      </p>
                      <ul className="list-disc space-y-1 ps-5 text-sm text-gray-700 dark:text-slate-300">
                        {lastEvaluation.strengths.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <p className="mb-2 text-sm font-medium text-gray-900 dark:text-white">
                        {t("interviewSimulator.weaknessesLabel")}
                      </p>
                      <ul className="list-disc space-y-1 ps-5 text-sm text-gray-700 dark:text-slate-300">
                        {lastEvaluation.weaknesses.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <p className="mb-2 text-sm font-medium text-gray-900 dark:text-white">
                        {t("interviewSimulator.suggestedAnswerLabel")}
                      </p>
                      <p className="rounded-xl border border-emerald-200/80 bg-emerald-50/70 px-4 py-3 text-sm leading-relaxed text-gray-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-slate-100">
                        {lastEvaluation.suggestedAnswer}
                      </p>
                    </div>

                    {pendingNextQuestion ? (
                      <Button type="button" variant="primary" onClick={handleContinue}>
                        {t("interviewSimulator.continueButton")}
                      </Button>
                    ) : (
                      <Button type="button" variant="primary" onClick={() => setPhase("complete")}>
                        {t("interviewSimulator.completeTitle")}
                      </Button>
                    )}
                  </div>
                ) : null}
              </Card>
            ) : null}

            {phase === "complete" ? (
              <Card className="space-y-4 p-5 sm:p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t("interviewSimulator.completeTitle")}
                </h2>
                <p className="text-sm text-gray-600 dark:text-slate-400">
                  {t("interviewSimulator.completeDescription")}
                </p>
                {history.length > 0 ? (
                  <div className="space-y-3">
                    {history.map((item, index) => (
                      <div
                        key={`${item.question}-${index}`}
                        className="rounded-xl border border-gray-200 px-4 py-3 dark:border-slate-700"
                      >
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{item.question}</p>
                        <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
                          {t("interviewSimulator.scoreLabel")}: {item.evaluation.score}/10
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}
                <InterviewAssessmentSummary history={history} />
                <Button type="button" variant="secondary" onClick={resetSession}>
                  {t("interviewSimulator.restartButton")}
                </Button>
              </Card>
            ) : null}

            <p className="text-xs text-gray-500 dark:text-slate-500">{t("interviewSimulator.disclaimer")}</p>
          </>
        )}

        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </p>
        ) : null}
      </div>
    </main>
  );
}
