import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { ConflictError, NotFoundError } from "../db/errors";
import { config } from "../config";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof NotFoundError) {
    res.status(404).json({ error: err.message });
    return;
  }
  if (err instanceof ConflictError) {
    res.status(409).json({ error: err.message });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({
      error: "Validation failed",
      details: err.flatten().fieldErrors,
    });
    return;
  }

  if (config.NODE_ENV === "development" && err instanceof Error) {
    console.error(err);
  }
  res.status(500).json({ error: "Internal server error" });
}
