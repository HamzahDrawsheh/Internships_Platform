import { jsPDF } from "jspdf";
import { buildCvDisplayModel, trimMax } from "@/lib/cv/format-cv-content";
import type { CvPdfFields } from "@/lib/cv/types";

const SECTION_COLOR = { r: 60, g: 60, b: 60 } as const;
const BODY_COLOR = { r: 20, g: 20, b: 20 } as const;
const MUTED_COLOR = { r: 80, g: 80, b: 80 } as const;

/** ATS-friendly single-column PDF with formal section hierarchy. */
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

  const writeBullet = (text: string, indent = 2) => {
    writeBody(`•  ${text}`, 10, indent);
    y += 0.5;
  };

  const sectionGap = () => {
    y += 5;
  };

  // 1. Full name
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  ensureSpace(14);
  doc.text(trimMax(model.displayName, 80), margin, y);
  y += 9;

  // 2. Contact information
  if (model.contactLine) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(MUTED_COLOR.r, MUTED_COLOR.g, MUTED_COLOR.b);
    writeBody(model.contactLine, 9.5);
  }

  y += 3;
  doc.setDrawColor(180, 180, 180);
  doc.line(margin, y, pageW - margin, y);
  y += 7;

  // 3. Professional summary
  if (model.summary) {
    drawSectionTitle("Professional Summary");
    writeBody(trimMax(model.summary, 1200));
    sectionGap();
  }

  // 4. Technical skills
  if (model.skillCategoryLines.length) {
    drawSectionTitle("Technical Skills");
    for (const line of model.skillCategoryLines) {
      writeBody(`${line.label}: ${line.values}`, 10);
    }
    sectionGap();
  }

  // 5. Projects
  if (model.projects.length) {
    drawSectionTitle("Projects");
    for (const block of model.projects) {
      writeBoldLine(block.title, 10);
      if (block.technologies) {
        writeBody(`Technologies: ${block.technologies}`, 10, 1);
      }
      if (block.description) writeBody(block.description, 10, 1);
      for (const bullet of block.bullets) {
        writeBullet(bullet, 2);
      }
      if (block.link) writeBody(block.link, 9, 1);
      y += 2;
    }
    sectionGap();
  }

  // 6. Experience
  if (model.experienceBullets.length) {
    drawSectionTitle("Experience");
    for (const bullet of model.experienceBullets) {
      writeBullet(bullet, 2);
    }
    sectionGap();
  }

  // 7. Education
  if (
    model.educationUniversity ||
    model.educationDegreeLine ||
    model.educationGpa ||
    model.educationGraduation ||
    model.educationDepartment
  ) {
    drawSectionTitle("Education");
    if (model.educationUniversity) writeBoldLine(model.educationUniversity);
    if (model.educationDegreeLine) writeBody(model.educationDegreeLine, 10);
    if (model.educationDepartment && model.educationDepartment !== model.educationDegreeLine) {
      writeBody(model.educationDepartment, 10);
    }
    if (model.educationGpa) writeBody(`GPA: ${model.educationGpa}`, 10);
    if (model.educationGraduation) {
      writeBody(`Expected Graduation: ${model.educationGraduation}`, 10);
    }
    if (model.coursework.length) {
      y += 1;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(MUTED_COLOR.r, MUTED_COLOR.g, MUTED_COLOR.b);
      writeBody("Relevant coursework", 9.5);
      for (const course of model.coursework.slice(0, 12)) {
        writeBullet(trimMax(course, 80), 2);
      }
    }
    sectionGap();
  }

  // 8. Certifications
  if (model.certifications.length) {
    drawSectionTitle("Certifications");
    for (const cert of model.certifications) {
      writeBullet(cert, 2);
    }
    sectionGap();
  }

  // 9. Links
  if (model.linksLine) {
    drawSectionTitle("Links");
    writeBody(model.linksLine, 10);
  }

  return doc;
}
