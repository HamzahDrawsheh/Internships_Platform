import { NextResponse } from "next/server";
import {
  generateInternshipEmbeddingsForAll,
  generateStudentEmbeddingsForAll,
} from "@/lib/ai/embeddings";

async function runEmbeddingGeneration() {
  const [students, internships] = await Promise.all([
    generateStudentEmbeddingsForAll(),
    generateInternshipEmbeddingsForAll(),
  ]);

  return NextResponse.json({
    ok: true,
    students,
    internships,
  });
}

export async function POST() {
  try {
    return await runEmbeddingGeneration();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate embeddings";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    return await runEmbeddingGeneration();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate embeddings";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
