import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import * as profilesDb from "../db/profiles";
import { patchProfileMeSchema } from "./validation";

const router = Router();

router.use(authMiddleware);

router.get("/me", (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    let profile = profilesDb.getProfileById(req.user.id);
    if (!profile) {
      profile = profilesDb.upsertProfile({
        id: req.user.id,
        email: req.user.email ?? null,
        full_name: (req.user.user_metadata?.full_name as string) ?? null,
        role: (req.user.user_metadata?.role as "student" | "company" | "supervisor" | "admin") ?? null,
      });
    }
    res.json(profile);
  } catch (err) {
    next(err);
  }
});

router.patch("/me", (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const parsed = patchProfileMeSchema.safeParse(req.body);
    if (!parsed.success) {
      next(parsed.error);
      return;
    }
    const profile = profilesDb.updateProfile(req.user.id, parsed.data);
    res.json(profile);
  } catch (err) {
    next(err);
  }
});

export default router;
