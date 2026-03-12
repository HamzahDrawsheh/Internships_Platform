import { Router } from "express";
import { randomUUID } from "node:crypto";
import { authMiddleware } from "../middleware/auth";
import * as profilesDb from "../db/profiles";
import * as internshipsDb from "../db/internships";
import * as applicationsDb from "../db/applications";
import { postApplicationSchema, patchApplicationStatusSchema } from "./validation";

const router = Router();

router.get("/", authMiddleware, (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const data = applicationsDb.listApplicationsByStudent(req.user.id);
    res.json({ data });
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
    const profile = profilesDb.getProfileById(req.user.id);
    if (!profile || profile.role !== "company") {
      res.status(403).json({ error: "Only companies can update application status" });
      return;
    }
    const existing = applicationsDb.getApplicationById(id);
    if (!existing) {
      res.status(404).json({ error: "Application not found" });
      return;
    }
    const internship = internshipsDb.getInternshipById(existing.internship_id);
    if (!internship || internship.company_id !== req.user.id) {
      res.status(403).json({ error: "You can only update applications for your own internships" });
      return;
    }
    const parsed = patchApplicationStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      next(parsed.error);
      return;
    }
    const application = applicationsDb.updateApplicationStatus(id, parsed.data.status);
    res.json(application);
  } catch (err) {
    next(err);
  }
});

export default router;
