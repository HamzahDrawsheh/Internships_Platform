/** Parse pgvector / PostgREST representations into a dense float array. */
export function parsePgVector(value: unknown): number[] | null {
  if (Array.isArray(value) && value.every((x) => typeof x === "number")) {
    return value as number[];
  }
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) {
    return null;
  }
  try {
    const arr = JSON.parse(trimmed) as unknown;
    if (!Array.isArray(arr)) {
      return null;
    }
    const nums = arr.filter((x): x is number => typeof x === "number");
    return nums.length === arr.length ? nums : null;
  } catch {
    return null;
  }
}

/** Cosine similarity in [-1, 1]; clamp to [0, 1] for display match scores. */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) {
    return 0;
  }
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i += 1) {
    const x = a[i];
    const y = b[i];
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  if (!Number.isFinite(denom) || denom === 0) {
    return 0;
  }
  const sim = dot / denom;
  return Math.min(1, Math.max(-1, sim));
}
