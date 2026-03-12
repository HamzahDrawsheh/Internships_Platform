import { z } from "zod";

export const profileRoleEnum = z.enum(["student", "company", "supervisor", "admin"]);
export const locationTypeEnum = z.enum(["remote", "onsite", "hybrid"]);
export const internshipStatusEnum = z.enum(["draft", "active", "paused", "closed", "pending"]);
export const applicationStatusEnum = z.enum(["submitted", "under_review", "accepted", "rejected"]);

export const patchProfileMeSchema = z.object({
  role: profileRoleEnum.optional(),
  full_name: z.string().optional(),
  email: z.string().email().optional().nullable(),
});

export const listInternshipsQuerySchema = z.object({
  status: internshipStatusEnum.optional(),
  location_type: locationTypeEnum.optional(),
  duration_weeks: z.coerce.number().optional(),
  deadline_lte: z.string().optional(),
});

export const createInternshipSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  location_type: locationTypeEnum.optional().nullable(),
  skills: z.array(z.string()).optional().default([]),
  duration_weeks: z.number().int().positive().optional().nullable(),
  start_date: z.string().optional().nullable(),
  deadline: z.string().optional().nullable(),
  open_positions: z.number().int().positive().optional().default(1),
  status: internshipStatusEnum.optional().default("draft"),
});

export const patchInternshipSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  location_type: locationTypeEnum.optional().nullable(),
  skills: z.array(z.string()).optional(),
  duration_weeks: z.number().int().positive().optional().nullable(),
  start_date: z.string().optional().nullable(),
  deadline: z.string().optional().nullable(),
  open_positions: z.number().int().positive().optional(),
  status: internshipStatusEnum.optional(),
});

export const postApplicationSchema = z.object({
  cover_letter: z.string().optional().nullable(),
});

export const patchApplicationStatusSchema = z.object({
  status: applicationStatusEnum,
});
