import { getDb } from "./connection";
import { NotFoundError } from "./errors";
import { mapRowToInternship, serializeSkills } from "./utils";
import type { Internship, InternshipInsert, InternshipUpdate, ListInternshipsFilters } from "../models/types";

const LIST_SQL = `
  SELECT i.*, p.full_name AS company_name
  FROM internships i
  LEFT JOIN profiles p ON p.id = i.company_id
`;

export function listInternships(filters?: ListInternshipsFilters): Internship[] {
  const db = getDb();
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (filters?.status) {
    conditions.push("i.status = ?");
    params.push(filters.status);
  }
  if (filters?.location_type) {
    conditions.push("i.location_type = ?");
    params.push(filters.location_type);
  }
  if (filters?.duration_weeks != null) {
    conditions.push("i.duration_weeks = ?");
    params.push(filters.duration_weeks);
  }
  if (filters?.deadline_lte) {
    conditions.push("i.deadline <= ?");
    params.push(filters.deadline_lte);
  }

  const where = conditions.length ? " WHERE " + conditions.join(" AND ") : "";
  const sql = LIST_SQL + where + " ORDER BY i.created_at DESC";
  const stmt = db.prepare(sql);
  const rows = (params.length ? stmt.all(...params) : stmt.all()) as Record<string, unknown>[];
  return rows.map(mapRowToInternship);
}

export function getInternshipById(id: string): Internship | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT i.*, p.full_name AS company_name FROM internships i LEFT JOIN profiles p ON p.id = i.company_id WHERE i.id = ?`
    )
    .get(id) as Record<string, unknown> | undefined;
  if (!row) return null;
  return mapRowToInternship(row);
}

export function getInternshipByIdOrThrow(id: string): Internship {
  const internship = getInternshipById(id);
  if (!internship) throw new NotFoundError(`Internship not found: ${id}`);
  return internship;
}

export function createInternship(data: InternshipInsert): Internship {
  const db = getDb();
  const now = new Date().toISOString();
  const skillsJson = serializeSkills(data.skills ?? []);
  db.prepare(
    `INSERT INTO internships (id, company_id, title, description, location_type, skills, duration_weeks, start_date, deadline, open_positions, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    data.id,
    data.company_id,
    data.title,
    data.description ?? null,
    data.location_type ?? null,
    skillsJson,
    data.duration_weeks ?? null,
    data.start_date ?? null,
    data.deadline ?? null,
    data.open_positions ?? 1,
    data.status ?? "draft",
    now,
    now
  );
  return getInternshipByIdOrThrow(data.id);
}

export function updateInternship(id: string, fields: InternshipUpdate): Internship {
  const db = getDb();
  const existing = getInternshipByIdOrThrow(id);

  const updated_at = new Date().toISOString();
  const title = fields.title ?? existing.title;
  const description = fields.description !== undefined ? fields.description : existing.description;
  const location_type = fields.location_type !== undefined ? fields.location_type : existing.location_type;
  const skillsJson = serializeSkills(fields.skills ?? existing.skills);
  const duration_weeks = fields.duration_weeks !== undefined ? fields.duration_weeks : existing.duration_weeks;
  const start_date = fields.start_date !== undefined ? fields.start_date : existing.start_date;
  const deadline = fields.deadline !== undefined ? fields.deadline : existing.deadline;
  const open_positions = fields.open_positions ?? existing.open_positions;
  const status = fields.status ?? existing.status;

  db.prepare(
    `UPDATE internships SET title = ?, description = ?, location_type = ?, skills = ?, duration_weeks = ?, start_date = ?, deadline = ?, open_positions = ?, status = ?, updated_at = ? WHERE id = ?`
  ).run(title, description, location_type, skillsJson, duration_weeks, start_date, deadline, open_positions, status, updated_at, id);
  return getInternshipByIdOrThrow(id);
}
