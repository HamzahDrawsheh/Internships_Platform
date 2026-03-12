import { getDb } from "./connection";
import { NotFoundError } from "./errors";
import { mapRowToProfile } from "./utils";
import type { Profile, ProfileInsert, ProfileUpdate } from "../models/types";

export function getProfileById(id: string): Profile | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM profiles WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  if (!row) return null;
  return mapRowToProfile(row);
}

export function getProfileByIdOrThrow(id: string): Profile {
  const profile = getProfileById(id);
  if (!profile) throw new NotFoundError(`Profile not found: ${id}`);
  return profile;
}

export function upsertProfile(data: ProfileInsert): Profile {
  const db = getDb();
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO profiles (id, email, full_name, role, is_suspended, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      email = COALESCE(excluded.email, email),
      full_name = COALESCE(excluded.full_name, full_name),
      role = COALESCE(excluded.role, role),
      is_suspended = COALESCE(excluded.is_suspended, is_suspended),
      updated_at = excluded.updated_at
  `);
  stmt.run(
    data.id,
    data.email ?? null,
    data.full_name ?? null,
    data.role ?? null,
    data.is_suspended ?? 0,
    now,
    now
  );
  const row = db.prepare("SELECT * FROM profiles WHERE id = ?").get(data.id) as Record<string, unknown>;
  return mapRowToProfile(row);
}

export function updateProfile(id: string, fields: ProfileUpdate): Profile {
  const db = getDb();
  const existing = getProfileById(id);
  if (!existing) throw new NotFoundError(`Profile not found: ${id}`);

  const updated_at = new Date().toISOString();
  db.prepare(
    `UPDATE profiles SET email = ?, full_name = ?, role = ?, is_suspended = ?, updated_at = ? WHERE id = ?`
  ).run(
    fields.email !== undefined ? fields.email : existing.email,
    fields.full_name !== undefined ? fields.full_name : existing.full_name,
    fields.role !== undefined ? fields.role : existing.role,
    fields.is_suspended !== undefined ? fields.is_suspended : existing.is_suspended,
    updated_at,
    id
  );
  const row = db.prepare("SELECT * FROM profiles WHERE id = ?").get(id) as Record<string, unknown>;
  return mapRowToProfile(row);
}
