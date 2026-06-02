export type InterviewPerformanceLevel = "beginner" | "intermediate" | "advanced" | "excellent";

export type InterviewAssessmentInput = {
  scores: number[];
  strengths: string[];
  weaknesses: string[];
  questions?: string[];
  answers?: string[];
  locale?: "en" | "ar";
};

export type SkillBreakdownScores = {
  technicalKnowledge: number;
  problemSolving: number;
  communication: number;
  practicalExperience: number;
};

export type InterviewAssessmentSummary = {
  overallScore: number;
  percentage: number;
  performanceLevel: InterviewPerformanceLevel;
  skillBreakdown: SkillBreakdownScores;
  strongAreas: string[];
  areasForImprovement: string[];
  recommendedTopics: string[];
  feedbackParagraph: string;
};

const TOPIC_HINTS: Array<{ pattern: RegExp; topics: string[] }> = [
  { pattern: /deep learning|neural network|cnn|rnn|transformer/i, topics: ["Neural Network Fundamentals", "Deep Learning Architectures", "Transfer Learning"] },
  { pattern: /evaluation|metric|precision|recall|f1|accuracy/i, topics: ["Cross Validation", "Model Evaluation Metrics", "Confusion Matrix Analysis"] },
  { pattern: /hyperparameter|tuning|grid search|bayes/i, topics: ["Hyperparameter Tuning", "Cross Validation", "Model Selection"] },
  { pattern: /imbalance|class weight|smote|sampling/i, topics: ["Class Imbalance Handling", "Resampling Techniques", "Threshold Tuning"] },
  { pattern: /sql|database|query|join/i, topics: ["Advanced SQL Joins", "Query Optimization", "Database Design Basics"] },
  { pattern: /python|pandas|numpy|data wrangl/i, topics: ["Python for Data Analysis", "Pandas Workflows", "Data Cleaning Patterns"] },
  { pattern: /machine learning|ml|supervised|unsupervised/i, topics: ["ML Fundamentals", "Feature Engineering", "Model Comparison"] },
  { pattern: /statistics|probability|hypothesis|distribution/i, topics: ["Statistics for ML", "Hypothesis Testing", "Probability Basics"] },
  { pattern: /communication|explain|clarity|structure/i, topics: ["Structured Interview Answers", "STAR Method Practice", "Technical Communication"] },
  { pattern: /project|experience|example|scenario/i, topics: ["Project Storytelling", "Impact Metrics in Answers", "Portfolio Review"] },
];

const SKILL_SIGNALS: Record<
  keyof SkillBreakdownScores,
  { strengths: RegExp[]; weaknesses: RegExp[]; answerHints: RegExp[] }
> = {
  technicalKnowledge: {
    strengths: [/technical|python|sql|machine learning|ml|data|algorithm|coding|statistics|theory|concept/i],
    weaknesses: [/technical|fundamental|concept|theory|depth|knowledge|accuracy|detail/i],
    answerHints: [/python|sql|model|algorithm|data|api|library|framework|tensor|neural/i],
  },
  problemSolving: {
    strengths: [/problem|logic|analytical|approach|solution|reasoning|debug|critical thinking/i],
    weaknesses: [/problem|approach|logic|structure|step|method|reasoning|solution/i],
    answerHints: [/because|first|then|step|approach|solve|debug|optimize|analyze|strategy/i],
  },
  communication: {
    strengths: [/communication|clear|clarity|explain|articulate|structured|concise|organized/i],
    weaknesses: [/communication|clarity|explain|structure|vague|unclear|concise|detail/i],
    answerHints: [/for example|in summary|clearly|because|therefore|first|second|finally/i],
  },
  practicalExperience: {
    strengths: [/project|experience|practical|hands-on|real-world|implementation|applied|internship/i],
    weaknesses: [/experience|example|project|practical|specific|real-world|evidence/i],
    answerHints: [/project|built|implemented|internship|team|deployed|worked on|developed|created/i],
  },
};

function clampScore(value: number): number {
  return Math.max(0, Math.min(10, Math.round(value * 10) / 10));
}

function countPatternMatches(texts: string[], patterns: RegExp[]): number {
  let count = 0;
  for (const text of texts) {
    if (!text.trim()) continue;
    if (patterns.some((pattern) => pattern.test(text))) count += 1;
  }
  return count;
}

function deriveSkillBreakdown(input: InterviewAssessmentInput, overallScore: number): SkillBreakdownScores {
  const strengths = input.strengths.map((item) => item.trim()).filter(Boolean);
  const weaknesses = input.weaknesses.map((item) => item.trim()).filter(Boolean);
  const answers = (input.answers ?? []).map((item) => item.trim()).filter(Boolean);
  const avgAnswerLength =
    answers.length > 0 ? answers.reduce((sum, answer) => sum + answer.length, 0) / answers.length : 0;

  const breakdown = {} as SkillBreakdownScores;

  for (const key of Object.keys(SKILL_SIGNALS) as Array<keyof SkillBreakdownScores>) {
    const signals = SKILL_SIGNALS[key];
    let score = overallScore;

    score += countPatternMatches(strengths, signals.strengths) * 0.45;
    score -= countPatternMatches(weaknesses, signals.weaknesses) * 0.45;
    score += countPatternMatches(answers, signals.answerHints) * 0.25;

    if (key === "communication") {
      if (avgAnswerLength >= 220) score += 0.4;
      else if (avgAnswerLength < 80) score -= 0.5;
    }

    if (key === "practicalExperience" && countPatternMatches(answers, signals.answerHints) === 0) {
      score -= 0.35;
    }

    breakdown[key] = clampScore(score);
  }

  return breakdown;
}

function normalizeKey(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function aggregateRepeated(items: string[], maxItems = 5): string[] {
  const counts = new Map<string, { label: string; count: number }>();

  for (const raw of items) {
    const label = raw.trim();
    if (!label) continue;
    const key = normalizeKey(label);
    if (!key) continue;
    const existing = counts.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(key, { label, count: 1 });
    }
  }

  return [...counts.values()]
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, maxItems)
    .map((entry) => entry.label);
}

export function getPerformanceLevel(averageScore: number): InterviewPerformanceLevel {
  if (averageScore >= 9) return "excellent";
  if (averageScore >= 7) return "advanced";
  if (averageScore >= 4) return "intermediate";
  return "beginner";
}

function titleCaseTopic(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function deriveRecommendedTopics(weaknesses: string[], maxItems = 5): string[] {
  const topics = new Set<string>();

  for (const weakness of weaknesses) {
    for (const hint of TOPIC_HINTS) {
      if (hint.pattern.test(weakness)) {
        for (const topic of hint.topics) {
          topics.add(topic);
        }
      }
    }
  }

  if (topics.size < maxItems) {
    for (const weakness of aggregateRepeated(weaknesses, maxItems)) {
      if (topics.size >= maxItems) break;
      topics.add(titleCaseTopic(weakness));
    }
  }

  return [...topics].slice(0, maxItems);
}

function joinList(items: string[], locale: "en" | "ar"): string {
  const slice = items.slice(0, 3).filter(Boolean);
  if (!slice.length) {
    return locale === "ar" ? "مهارات عامة" : "general skills";
  }
  if (slice.length === 1) return slice[0];
  if (locale === "ar") {
    return `${slice.slice(0, -1).join("، ")} و${slice[slice.length - 1]}`;
  }
  if (slice.length === 2) return `${slice[0]} and ${slice[1]}`;
  return `${slice.slice(0, -1).join(", ")}, and ${slice[slice.length - 1]}`;
}

function buildFeedbackParagraph(
  averageScore: number,
  strongAreas: string[],
  areasForImprovement: string[],
  locale: "en" | "ar"
): string {
  const level = getPerformanceLevel(averageScore);
  const strongText = joinList(strongAreas, locale);
  const weakText = joinList(areasForImprovement, locale);

  if (locale === "ar") {
    switch (level) {
      case "excellent":
        return `قدّمت أداءً ممتازاً في هذه المقابلة التجريبية. أظهرت إجاباتك قوة واضحة في ${strongText}، مع عمق جيد في الشرح. استمر في هذا المستوى وركّز على صقل التفاصيل المتقدمة في ${weakText}.`;
      case "advanced":
        return `أظهرت معرفة عملية قوية ومهارات جيدة في حل المشكلات. بدا أن إجاباتك تعكس خبرة حقيقية في ${strongText}، لكن بعض التفسيرات التقنية تحتاج إلى مزيد من العمق، خاصة في ${weakText}. ركّز على تعزيز هذه الجوانب قبل المقابلة الفعلية.`;
      case "intermediate":
        return `أظهرت أساساً مقبولاً في ${strongText}، لكن إجاباتك تحتاج إلى مزيد من الوضوح والتفصيل. هناك مجال واضح للتحسين في ${weakText}. تدرّب على بناء إجابات أكثر تنظيماً مع أمثلة محددة من مشاريعك.`;
      default:
        return `هذه جلسة تدريب مفيدة. ما زالت إجاباتك في مرحلة البناء، خاصة في ${weakText}. ابدأ بتقوية ${strongText || "أساسياتك التقنية"}، ثم تدرّب على شرح أفكارك بخطوات واضحة وأمثلة عملية.`;
    }
  }

  switch (level) {
    case "excellent":
      return `You demonstrated outstanding performance in this mock interview. Your answers consistently showed strong command of ${strongText}, with clear and confident explanations. Keep this momentum and continue refining advanced details in ${weakText}.`;
    case "advanced":
      return `You demonstrated strong practical knowledge and good problem-solving skills. Your answers showed real project experience in ${strongText}, but some technical explanations lacked depth, especially around ${weakText}. Focus on strengthening those areas before your real interview.`;
    case "intermediate":
      return `You showed a reasonable foundation in ${strongText}, but several answers needed more clarity and detail. There is clear room to improve in ${weakText}. Practice structuring responses with specific examples from your projects and coursework.`;
    default:
      return `This was a useful practice session. Your answers are still developing, particularly in ${weakText}. Start by strengthening ${strongText || "core technical fundamentals"}, then practice explaining your thinking in clear, step-by-step responses with concrete examples.`;
  }
}

export function buildInterviewAssessmentSummary(input: InterviewAssessmentInput): InterviewAssessmentSummary | null {
  const scores = input.scores.filter((score) => Number.isFinite(score));
  if (!scores.length) return null;

  const overallScore = Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 10) / 10;
  const percentage = Math.round(overallScore * 10);
  const performanceLevel = getPerformanceLevel(overallScore);
  const strongAreas = aggregateRepeated(input.strengths, 5);
  const areasForImprovement = aggregateRepeated(input.weaknesses, 5);
  const recommendedTopics = deriveRecommendedTopics(input.weaknesses, 5);
  const locale = input.locale === "ar" ? "ar" : "en";

  return {
    overallScore,
    percentage,
    performanceLevel,
    skillBreakdown: deriveSkillBreakdown(input, overallScore),
    strongAreas,
    areasForImprovement,
    recommendedTopics,
    feedbackParagraph: buildFeedbackParagraph(overallScore, strongAreas, areasForImprovement, locale),
  };
}
