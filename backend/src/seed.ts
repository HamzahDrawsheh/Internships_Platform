import "dotenv/config";
import { randomUUID } from "node:crypto";
import { getDb } from "./db/connection";

function runSeed() {
  console.log("Seed started...");

  const db = getDb();

  db.exec("DELETE FROM applications");
  db.exec("DELETE FROM internships");
  db.exec("DELETE FROM profiles");

  const companyGoogleId = randomUUID();
  const companyMicrosoftId = randomUUID();
  const studentAhmadId = randomUUID();
  const studentSaraId = randomUUID();
  const studentAliId = randomUUID();
  const supervisorId = randomUUID();

  const insertProfile = db.prepare(
    "INSERT INTO profiles (id, email, full_name, role, is_suspended) VALUES (?, ?, ?, ?, ?)"
  );

  insertProfile.run(companyGoogleId, "company_google@test.com", "Google", "company", 0);
  insertProfile.run(companyMicrosoftId, "company_microsoft@test.com", "Microsoft", "company", 0);
  insertProfile.run(studentAhmadId, "student_ahmad@test.com", "Ahmad", "student", 0);
  insertProfile.run(studentSaraId, "student_sara@test.com", "Sara", "student", 0);
  insertProfile.run(studentAliId, "student_ali@test.com", "Ali", "student", 0);
  insertProfile.run(supervisorId, "supervisor@test.com", "Dr. Supervisor", "supervisor", 0);

  console.log("Profiles inserted");

  const internshipIds: Record<string, string> = {};
  const internships = [
    { key: "ai", title: "AI Intern", companyId: companyGoogleId },
    { key: "backend", title: "Backend Developer Intern", companyId: companyGoogleId },
    { key: "data", title: "Data Science Intern", companyId: companyMicrosoftId },
    { key: "web", title: "Web Developer Intern", companyId: companyMicrosoftId },
    { key: "mobile", title: "Mobile App Intern", companyId: companyGoogleId },
  ];

  const insertInternship = db.prepare(`
    INSERT INTO internships (id, company_id, title, description, location_type, skills, duration_weeks, open_positions, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const i of internships) {
    const id = randomUUID();
    internshipIds[i.key] = id;
    insertInternship.run(
      id,
      i.companyId,
      i.title,
      `Join our team as ${i.title}. Great learning opportunity.`,
      "hybrid",
      '["JavaScript","TypeScript"]',
      12,
      2,
      "active"
    );
  }

  console.log("Internships inserted");

  const insertApplication = db.prepare(`
    INSERT INTO applications (id, internship_id, student_id, status, cover_letter)
    VALUES (?, ?, ?, ?, ?)
  `);

  insertApplication.run(
    randomUUID(),
    internshipIds.ai,
    studentAhmadId,
    "submitted",
    "I am very interested in the AI Intern position."
  );
  insertApplication.run(
    randomUUID(),
    internshipIds.data,
    studentSaraId,
    "submitted",
    "I would love to work on Data Science projects."
  );
  insertApplication.run(
    randomUUID(),
    internshipIds.backend,
    studentAliId,
    "submitted",
    "Backend development is my passion."
  );

  console.log("Applications inserted");
  console.log("Seed completed");
}

runSeed();
