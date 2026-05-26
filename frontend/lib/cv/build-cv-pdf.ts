import { jsPDF } from "jspdf";
import { buildCvDisplayModel, trimMax } from "@/lib/cv/format-cv-content";
import type { CvPdfFields } from "@/lib/cv/types";

const SECTION_COLOR = { r: 80, g: 80, b: 80 } as const;
const BODY_COLOR = { r: 30, g: 30, b: 30 } as const;
const MUTED_COLOR = { r: 90, g: 90, b: 90 } as const;

/** ATS-friendly PDF with formal section hierarchy and bullet lists. */
export function buildCvPdf(f: CvPdfFields): jsPDF {
  const model = buildCvDisplayModel(f);
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 18;
  const maxW = pageW - 2 * margin;
  let y = margin;

  const ensureSpace = (neededMm: number) => {
    if (y + neededMm > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const drawSectionTitle = (title: string) => {
    ensureSpace(12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(SECTION_COLOR.r, SECTION_COLOR.g, SECTION_COLOR.b);
    doc.text(title.toUpperCase(), margin, y);
    y += 4;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageW - margin, y);
    y += 5;
  };

  const writeBody = (text: string, fontSize = 10, indent = 0) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(fontSize);
    doc.setTextColor(BODY_COLOR.r, BODY_COLOR.g, BODY_COLOR.b);
    const lines = doc.splitTextToSize(text, maxW - indent);
    const lineH = fontSize * 0.52;
    for (const line of lines) {
      ensureSpace(lineH + 1);
      doc.text(line, margin + indent, y);
      y += lineH;
    }
  };

  const writeBoldLine = (text: string, fontSize = 10.5) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(fontSize);
    doc.setTextColor(BODY_COLOR.r, BODY_COLOR.g, BODY_COLOR.b);
    ensureSpace(fontSize * 0.6);
    doc.text(trimMax(text, 120), margin, y);
    y += fontSize * 0.55;
  };

  const writeBullet = (text: string, indent = 3) => {
    writeBody(`•  ${text}`, 10, indent);
    y += 0.5;
  };

  const sectionGap = () => {
    y += 5;
  };

  // Header
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  ensureSpace(14);
  doc.text(trimMax(model.displayName, 80), margin, y);
  y += 9;

  if (model.contactLine) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(MUTED_COLOR.r, MUTED_COLOR.g, MUTED_COLOR.b);
    writeBody(model.contactLine, 9.5);
  }
  if (model.linksLine) {
    doc.setTextColor(75, 0, 130);
    writeBody(model.linksLine, 9);
    doc.setTextColor(BODY_COLOR.r, BODY_COLOR.g, BODY_COLOR.b);
  }

  y += 3;
  doc.setDrawColor(180, 180, 180);
  doc.line(margin, y, pageW - margin, y);
  y += 7;

  if (model.summary) {
    drawSectionTitle("Professional Summary");
    writeBody(trimMax(model.summary, 1200));
    sectionGap();
  }

  if (model.educationHeadline || model.department || model.gpa || model.courses.length) {
    drawSectionTitle("Education");
    if (model.educationHeadline) writeBoldLine(model.educationHeadline);
    if (model.department) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(10);
      doc.setTextColor(MUTED_COLOR.r, MUTED_COLOR.g, MUTED_COLOR.b);
      writeBody(model.department, 10);
    }
    if (model.gpa) writeBody(`GPA: ${model.gpa}`, 10);
    for (const line of model.educationExtra) {
      writeBody(line, 10);
    }
    if (model.courses.length) {
      y += 1;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(MUTED_COLOR.r, MUTED_COLOR.g, MUTED_COLOR.b);
      writeBody("Relevant coursework", 9.5);
      for (const course of model.courses.slice(0, 18)) {
        writeBullet(trimMax(course, 80), 2);
      }
    }
    sectionGap();
  }

  if (model.skills.length) {
    drawSectionTitle("Skills");
    const mid = Math.ceil(model.skills.length / 2);
    const colW = (maxW - 6) / 2;
    const left = model.skills.slice(0, mid);
    const right = model.skills.slice(mid);
    const rows = Math.max(left.length, right.length);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(BODY_COLOR.r, BODY_COLOR.g, BODY_COLOR.b);
    for (let i = 0; i < rows; i += 1) {
      ensureSpace(5);
      if (left[i]) doc.text(`•  ${left[i]}`, margin, y);
      if (right[i]) doc.text(`•  ${right[i]}`, margin + colW + 6, y);
      y += 5;
    }
    sectionGap();
  }

  if (model.experienceBullets.length) {
    drawSectionTitle("Experience");
    for (const bullet of model.experienceBullets) {
      writeBullet(bullet, 2);
    }
    sectionGap();
  }

  if (model.projects.length) {
    drawSectionTitle("Projects");
    for (const block of model.projects) {
      writeBoldLine(block.title, 10);
      if (block.body) writeBody(block.body, 10, 2);
      y += 2;
    }
  }

  return doc;
}
