import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import * as profilesDb from "../db/profiles";

const router = Router();

router.get("/me", authMiddleware, (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const { id, email, user_metadata } = req.user;
    let profile = profilesDb.getProfileById(id);
    if (!profile) {
      profile = profilesDb.upsertProfile({
        id,
        email: email ?? null,
        full_name: (user_metadata?.full_name as string) ?? null,
        role: (user_metadata?.role as "student" | "company" | "supervisor" | "admin") ?? null,
      });
    }
    res.json({ id, profile });
  } catch (err) {
    next(err);
  }
});

export default router;
