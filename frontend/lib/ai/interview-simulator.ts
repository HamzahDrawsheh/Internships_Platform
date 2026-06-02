import {
  parseStudentPreferences,
  toStringArray,
  type CoverLetterInternshipContext,
  type CoverLetterStudentContext,
} from "@/lib/ai/cover-letter-context";

export type InterviewSimulatorLocale = "en" | "ar";

export type InterviewPriorQa = {
  question: string;
  answer: string;
  score?: number;
};

export type InterviewEvaluation = {
  score: number;
  strengths: string[];
  weaknesses: string[];
  suggestedAnswer: string;
};

export type InterviewStartResult = {
  question: string;
  questionNumber: number;
  totalQuestions: number;
};

export type InterviewEvaluateResult = {
  evaluation: InterviewEvaluation;
  nextQuestion: string | null;
  questionNumber: number;
  isComplete: boolean;
};

export const INTERVIEW_MAX_QUESTIONS = 5;
export const INTERVIEW_ANSWER_MAX_LEN = 5000;
export const INTERVIEW_QUESTION_MAX_LEN = 2000;
export const INTERVIEW_PRIOR_QA_MAX = 5;

export const INTERVIEW_SIMULATOR_SYSTEM_PROMPT =
  "You are a professional internship interview coach for AI and data science students in Jordan. " +
  "Return strict JSON only. No markdown, no code fences, no extra commentary. " +
  "Ask realistic technical and behavioral questions tailored to the internship. " +
  "Evaluate answers fairly based on clarity, relevance, and alignment with the role. " +
  "Do not invent student credentials. Do not request or repeat private contact details. " +
  "Keep questions and feedback professional and constructive.";

function normalizeList(items: string[], maxItems = 6, maxItemLen = 200): string[] {
  return items
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, maxItems)
    .map((item) => (item.length > maxItemLen ? `${item.slice(0, maxItemLen)}…` : item));
}

export function trimInterviewText(value: unknown, maxLen = 4000): string {
  if (value == null) return "";
  const s = String(value).replace(/\s+/g, " ").trim();
  if (!s) return "";
  return s.length > maxLen ? `${s.slice(0, maxLen)}…` : s;
}

export function buildInterviewStudentContext(args: {
  fullName: string;
  university: string;
  major: string;
  department: string;
  skillsFromProfile: string;
  technicalSkills: string[];
  softSkills: string[];
  courses: string[];
  preferencesRaw: unknown;
}): CoverLetterStudentContext {
  const prefParsed = parseStudentPreferences(args.preferencesRaw);
  return {
    fullName: trimInterviewText(args.fullName, 120),
    university: trimInterviewText(args.university, 200),
    major: trimInterviewText(args.major, 200),
    department: trimInterviewText(args.department, 200),
    academicYear: prefParsed.academicYear,
    gpa: null,
    skillsFromProfile: trimInterviewText(args.skillsFromProfile, 500),
    technicalSkills: toStringArray(args.technicalSkills),
    softSkills: toStringArray(args.softSkills),
    courses: toStringArray(args.courses),
    projects: trimInterviewText(prefParsed.projects, 800),
    bioOrExperience: trimInterviewText(prefParsed.bio, 800),
  };
}

export function buildInterviewInternshipContext(args: {
  title: string;
  companyName: string;
  description: string;
  requirements: string;
  additionalNotes: string;
}): CoverLetterInternshipContext {
  return {
    title: trimInterviewText(args.title, 300) || "Internship opportunity",
    companyName: trimInterviewText(args.companyName, 200) || "the company",
    description: trimInterviewText(args.description),
    requirements: trimInterviewText(args.requirements),
    additionalNotes: trimInterviewText(args.additionalNotes),
  };
}

function formatStudentBlock(student: CoverLetterStudentContext): string {
  const skills = [
    ...student.technicalSkills,
    ...student.softSkills,
    student.skillsFromProfile,
  ]
    .filter(Boolean)
    .join(", ");

  return [
    student.university ? `University: ${student.university}` : "",
    student.major ? `Major: ${student.major}` : "",
    student.department ? `Department: ${student.department}` : "",
    student.academicYear ? `Academic year: ${student.academicYear}` : "",
    skills ? `Skills: ${skills}` : "",
    student.courses.length ? `Courses: ${student.courses.join(", ")}` : "",
    student.projects ? `Projects: ${student.projects}` : "",
    student.bioOrExperience ? `Experience summary: ${student.bioOrExperience}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function formatInternshipBlock(internship: CoverLetterInternshipContext): string {
  return [
    `Title: ${internship.title}`,
    `Company: ${internship.companyName}`,
    internship.description ? `Description: ${internship.description}` : "",
    internship.requirements ? `Requirements: ${internship.requirements}` : "",
    internship.additionalNotes ? `Notes: ${internship.additionalNotes}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildInterviewStartPrompt(args: {
  student: CoverLetterStudentContext;
  internship: CoverLetterInternshipContext;
  locale: InterviewSimulatorLocale;
}): string {
  const languageNote =
    args.locale === "ar"
      ? "Write the question in Modern Standard Arabic."
      : "Write the question in English.";

  return [
    languageNote,
    "Generate the first mock interview question for this student and internship.",
    "Mix technical and behavioral focus appropriate to an internship screening.",
    'Return JSON: {"question":"..."}',
    "",
    "Student profile (no email/phone):",
    formatStudentBlock(args.student),
    "",
    "Internship:",
    formatInternshipBlock(args.internship),
  ].join("\n");
}

export function buildInterviewEvaluatePrompt(args: {
  student: CoverLetterStudentContext;
  internship: CoverLetterInternshipContext;
  locale: InterviewSimulatorLocale;
  question: string;
  answer: string;
  questionNumber: number;
  priorQa: InterviewPriorQa[];
}): string {
  const languageNote =
    args.locale === "ar"
      ? "Write strengths, weaknesses, suggestedAnswer, and nextQuestion in Modern Standard Arabic."
      : "Write strengths, weaknesses, suggestedAnswer, and nextQuestion in English.";

  const priorLines = args.priorQa
    .slice(-INTERVIEW_PRIOR_QA_MAX)
    .map(
      (item, index) =>
        `Q${index + 1}: ${item.question}\nA${index + 1}: ${item.answer}${
          item.score != null ? `\nScore: ${item.score}/10` : ""
        }`
    )
    .join("\n\n");

  const hasNext = args.questionNumber < INTERVIEW_MAX_QUESTIONS;

  return [
    languageNote,
    `This is question ${args.questionNumber} of up to ${INTERVIEW_MAX_QUESTIONS}.`,
    "Evaluate the student's answer.",
    hasNext
      ? 'Also provide the next interview question in nextQuestion. Return JSON: {"score":0,"strengths":["..."],"weaknesses":["..."],"suggestedAnswer":"...","nextQuestion":"..."}'
      : 'This is the final question. Set nextQuestion to null. Return JSON: {"score":0,"strengths":["..."],"weaknesses":["..."],"suggestedAnswer":"...","nextQuestion":null}',
    "score must be an integer from 0 to 10.",
    "strengths and weaknesses must be arrays of 1 to 4 short strings each.",
    "",
    "Student profile (no email/phone):",
    formatStudentBlock(args.student),
    "",
    "Internship:",
    formatInternshipBlock(args.internship),
    priorLines ? `\nPrior Q&A:\n${priorLines}` : "",
    "",
    `Current question:\n${args.question}`,
    "",
    `Student answer:\n${args.answer}`,
  ].join("\n");
}

function extractJsonObject(raw: string): unknown {
  const trimmed = raw.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenceMatch?.[1]?.trim() ?? trimmed;
  return JSON.parse(candidate);
}

function clampScore(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(10, Math.round(n)));
}

export function parseInterviewStartResponse(raw: string): InterviewStartResult | null {
  try {
    const parsed = extractJsonObject(raw) as { question?: unknown };
    const question = trimInterviewText(parsed.question, INTERVIEW_QUESTION_MAX_LEN);
    if (!question) return null;
    return {
      question,
      questionNumber: 1,
      totalQuestions: INTERVIEW_MAX_QUESTIONS,
    };
  } catch {
    return null;
  }
}

export function parseInterviewEvaluateResponse(
  raw: string,
  questionNumber: number
): InterviewEvaluateResult | null {
  try {
    const parsed = extractJsonObject(raw) as {
      score?: unknown;
      strengths?: unknown;
      weaknesses?: unknown;
      suggestedAnswer?: unknown;
      nextQuestion?: unknown;
    };

    const suggestedAnswer = trimInterviewText(parsed.suggestedAnswer, 4000);
    if (!suggestedAnswer) return null;

    const strengths = normalizeList(Array.isArray(parsed.strengths) ? parsed.strengths.map(String) : []);
    const weaknesses = normalizeList(Array.isArray(parsed.weaknesses) ? parsed.weaknesses.map(String) : []);

    if (!strengths.length || !weaknesses.length) return null;

    const isComplete = questionNumber >= INTERVIEW_MAX_QUESTIONS;
    const nextQuestionRaw =
      !isComplete && parsed.nextQuestion != null
        ? trimInterviewText(parsed.nextQuestion, INTERVIEW_QUESTION_MAX_LEN)
        : null;

    return {
      evaluation: {
        score: clampScore(parsed.score),
        strengths,
        weaknesses,
        suggestedAnswer,
      },
      nextQuestion: isComplete ? null : nextQuestionRaw,
      questionNumber: questionNumber + 1,
      isComplete: isComplete || !nextQuestionRaw,
    };
  } catch {
    return null;
  }
}
