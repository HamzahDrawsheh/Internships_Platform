import { Router } from "express";
import { randomUUID } from "node:crypto";
import { authMiddleware } from "../middleware/auth";
import * as profilesDb from "../db/profiles";
import * as internshipsDb from "../db/internships";
import * as applicationsDb from "../db/applications";
import { listInternshipsQuerySchema, createInternshipSchema, patchInternshipSchema, postApplicationSchema } from "./validation";
import type { ListInternshipsFilters } from "../models/types";

const router = Router();

router.get("/", (req, res, next) => {
  try {
    const parsed = listInternshipsQuerySchema.safeParse(req.query);
    const filters: ListInternshipsFilters | undefined = parsed.success ? parsed.data : undefined;
    const data = internshipsDb.listInternships(filters);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

router.get("/:id/applications", authMiddleware, (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const id = typeof req.params.id === "string" ? req.params.id : req.params.id[0];
    const internship = internshipsDb.getInternshipById(id);
    if (!internship) {
      res.status(404).json({ error: "Internship not found" });
      return;
    }
    if (internship.company_id !== req.user.id) {
      res.status(403).json({ error: "You can only list applications for your own internships" });
      return;
    }
    const data = applicationsDb.listApplicationsByInternship(id);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/applications", authMiddleware, (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const id = typeof req.params.id === "string" ? req.params.id : req.params.id[0];
    const profile = profilesDb.getProfileById(req.user.id);
    if (!profile || profile.role !== "student") {
      res.status(403).json({ error: "Only students can apply to internships" });
      return;
    }
    const internship = internshipsDb.getInternshipById(id);
    if (!internship) {
      res.status(404).json({ error: "Internship not found" });
      return;
    }
    const parsed = postApplicationSchema.safeParse(req.body);
    if (!parsed.success) {
      next(parsed.error);
      return;
    }
    const application = applicationsDb.createApplication({
      id: randomUUID(),
      internship_id: id,
      student_id: req.user.id,
      cover_letter: parsed.data.cover_letter ?? null,
    });
    res.status(201).json(application);
  } catch (err) {
    next(err);
  }
});

router.get("/:id", (req, res, next) => {
  try {
    const id = typeof req.params.id === "string" ? req.params.id : req.params.id[0];
    const internship = internshipsDb.getInternshipById(id);
    if (!internship) {
      res.status(404).json({ error: "Internship not found" });
      return;
    }
    res.json(internship);
  } catch (err) {
    next(err);
  }
});

router.post("/", authMiddleware, (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const profile = profilesDb.getProfileById(req.user.id);
    if (!profile || profile.role !== "company") {
      res.status(403).json({ error: "Only companies can create internships" });
      return;
    }
    const parsed = createInternshipSchema.safeParse(req.body);
    if (!parsed.success) {
      next(parsed.error);
      return;
    }
    const internship = internshipsDb.createInternship({
      id: randomUUID(),
      company_id: req.user.id,
      ...parsed.data,
    });
    res.status(201).json(internship);
  } catch (err) {
    next(err);
  }
});

router.patch("/:id", authMiddleware, (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const id = typeof req.params.id === "string" ? req.params.id : req.params.id[0];
    const existing = internshipsDb.getInternshipById(id);
    if (!existing) {
      res.status(404).json({ error: "Internship not found" });
      return;
    }
    if (existing.company_id !== req.user.id) {
      res.status(403).json({ error: "You can only update your own internships" });
      return;
    }
    const parsed = patchInternshipSchema.safeParse(req.body);
    if (!parsed.success) {
      next(parsed.error);
      return;
    }
    const internship = internshipsDb.updateInternship(id, parsed.data);
    res.json(internship);
  } catch (err) {
    next(err);
  }
});

export default router;
