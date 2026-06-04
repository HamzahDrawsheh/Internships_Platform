import { describe, expect, it } from "vitest";
import {
  INTERVIEW_MAX_QUESTIONS,
  parseInterviewEvaluateResponse,
  parseInterviewStartResponse,
} from "@/lib/ai/interview-simulator";

describe("parseInterviewStartResponse", () => {
  it("parses a valid JSON question", () => {
    const result = parseInterviewStartResponse(
      JSON.stringify({ question: "Tell me about a data project you built." }),
    );
    expect(result).toEqual({
      question: "Tell me about a data project you built.",
      questionNumber: 1,
      totalQuestions: INTERVIEW_MAX_QUESTIONS,
    });
  });

  it("rejects empty questions", () => {
    expect(parseInterviewStartResponse(JSON.stringify({ question: "   " }))).toBeNull();
  });
});

describe("parseInterviewEvaluateResponse", () => {
  it("parses evaluation with next question", () => {
    const result = parseInterviewEvaluateResponse(
      JSON.stringify({
        score: 7.4,
        strengths: ["Clear structure"],
        weaknesses: ["Needs more metrics"],
        suggestedAnswer: "I would lead with the business impact, then explain the pipeline.",
        nextQuestion: "How do you handle missing data?",
      }),
      2,
    );
    expect(result?.evaluation.score).toBe(7);
    expect(result?.nextQuestion).toBe("How do you handle missing data?");
    expect(result?.questionNumber).toBe(3);
    expect(result?.isComplete).toBe(false);
  });

  it("marks session complete on final question", () => {
    const result = parseInterviewEvaluateResponse(
      JSON.stringify({
        score: 8,
        strengths: ["Strong answer"],
        weaknesses: ["Minor detail gap"],
        suggestedAnswer: "Expanded answer with metrics.",
        nextQuestion: null,
      }),
      INTERVIEW_MAX_QUESTIONS,
    );
    expect(result?.isComplete).toBe(true);
    expect(result?.nextQuestion).toBeNull();
  });

  it("fills missing strength/weakness lists instead of failing", () => {
    const result = parseInterviewEvaluateResponse(
      JSON.stringify({
        score: 6,
        strengths: [],
        weaknesses: [],
        suggestedAnswer: "A stronger sample answer.",
        nextQuestion: "Next?",
      }),
      1,
    );
    expect(result?.evaluation.strengths.length).toBeGreaterThan(0);
    expect(result?.evaluation.weaknesses.length).toBeGreaterThan(0);
  });
});
