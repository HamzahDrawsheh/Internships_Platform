import { getDb } from "./connection";
import { ConflictError, NotFoundError } from "./errors";
import { mapRowToApplication } from "./utils";
import type { Application, ApplicationInsert, ApplicationStatus } from "../models/types";

const LIST_BY_STUDENT_SQL = `
  SELECT a.*, i.title AS internship_title, p.full_name AS company_name
  FROM applications a
  JOIN internships i ON i.id = a.internship_id
  LEFT JOIN profiles p ON p.id = i.company_id
  WHERE a.student_id = ?
  ORDER BY a.created_at DESC
`;

const LIST_BY_INTERNSHIP_SQL = `
  SELECT a.*, i.title AS internship_title, p.full_name AS company_name
  FROM applications a
  JOIN internships i ON i.id = a.internship_id
  LEFT JOIN profiles p ON p.id = i.company_id
  WHERE a.internship_id = ?
  ORDER BY a.created_at DESC
`;

export function getApplicationById(id: string): Application | null {
  const db = getDb();
  const row = db.prepare(
    `SELECT a.*, i.title AS internship_title, p.full_name AS company_name
     FROM applications a
     JOIN internships i ON i.id = a.internship_id
     LEFT JOIN profiles p ON p.id = i.company_id
     WHERE a.id = ?`
  ).get(id) as Record<string, unknown> | undefined;
  if (!row) return null;
  return mapRowToApplication(row);
}

export function listApplicationsByStudent(studentId: string): Application[] {
  const db = getDb();
  const rows = db.prepare(LIST_BY_STUDENT_SQL).all(studentId) as Record<string, unknown>[];
  return rows.map(mapRowToApplication);
}

export function listApplicationsByInternship(internshipId: string): Application[] {
  const db = getDb();
  const rows = db.prepare(LIST_BY_INTERNSHIP_SQL).all(internshipId) as Record<string, unknown>[];
  return rows.map(mapRowToApplication);
}

export function createApplication(data: ApplicationInsert): Application {
  const db = getDb();
  const existing = db
    .prepare("SELECT id FROM applications WHERE internship_id = ? AND student_id = ?")
    .get(data.internship_id, data.student_id);
  if (existing) {
    throw new ConflictError("Application already exists for this internship and student.");
  }

  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO applications (id, internship_id, student_id, status, cover_letter, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    data.id,
    data.internship_id,
    data.student_id,
    data.status ?? "submitted",
    data.cover_letter ?? null,
    now
  );
  const row = db.prepare(
    `SELECT a.*, i.title AS internship_title, p.full_name AS company_name
     FROM applications a
     JOIN internships i ON i.id = a.internship_id
     LEFT JOIN profiles p ON p.id = i.company_id
     WHERE a.id = ?`
  ).get(data.id) as Record<string, unknown>;
  return mapRowToApplication(row);
}

export function updateApplicationStatus(id: string, status: ApplicationStatus): Application {
  const db = getDb();
  const row = db.prepare("SELECT id FROM applications WHERE id = ?").get(id);
  if (!row) throw new NotFoundError(`Application not found: ${id}`);

  db.prepare("UPDATE applications SET status = ? WHERE id = ?").run(status, id);
  const updated = db.prepare(
    `SELECT a.*, i.title AS internship_title, p.full_name AS company_name
     FROM applications a
     JOIN internships i ON i.id = a.internship_id
     LEFT JOIN profiles p ON p.id = i.company_id
     WHERE a.id = ?`
  ).get(id) as Record<string, unknown>;
  return mapRowToApplication(updated);
}
