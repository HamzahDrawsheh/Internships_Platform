"use client";

import { useState } from "react";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { Input, Textarea, Button, Card } from "@/components/ui";

export default function StudentProfilePage() {
  const [name, setName] = useState("");
  const [university, setUniversity] = useState("");
  const [major, setMajor] = useState("");
  const [year, setYear] = useState("");
  const [skills, setSkills] = useState("");
  const [bio, setBio] = useState("");
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
  };

  return (
    <main className="py-8">
      <Container className="max-w-2xl">
        <PageHeader title="Student Profile" description="Manage your personal info, skills, and CV." />
        {saved && (
          <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-800" role="status">Changes saved.</div>
        )}
        <form onSubmit={handleSave} className="space-y-6">
          <Card>
            <h2 className="text-sm font-semibold text-gray-900">Personal info</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
              <Input label="University" value={university} onChange={(e) => setUniversity(e.target.value)} placeholder="University name" />
              <Input label="Major" value={major} onChange={(e) => setMajor(e.target.value)} placeholder="e.g. Computer Science" />
              <Input label="Year" value={year} onChange={(e) => setYear(e.target.value)} placeholder="e.g. 3rd, 4th" />
            </div>
          </Card>
          <Card>
            <Input
              label="Skills (comma-separated)"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              placeholder="Python, ML, SQL"
            />
            <Textarea
              label="Bio"
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="mt-4"
              placeholder="Short bio for your profile"
            />
          </Card>
          <Card>
            <h2 className="text-sm font-semibold text-gray-900">CV upload</h2>
            <p className="mt-1 text-sm text-gray-500">Upload a PDF (max 5MB). Upload logic will be connected later.</p>
            <div className="mt-4">
              <input
                type="file"
                accept=".pdf"
                className="block w-full text-sm text-gray-500 file:mr-4 file:rounded file:border-0 file:bg-gray-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-200"
                aria-label="Upload CV (PDF)"
                onChange={() => {}}
              />
              <p className="mt-2 text-sm text-gray-500">No file selected. Upload will be implemented with storage integration.</p>
            </div>
          </Card>
          <Button type="submit" variant="primary">Save changes</Button>
        </form>
      </Container>
    </main>
  );
}
