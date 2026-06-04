"use client";

import { buildCvDisplayModel } from "@/lib/cv/format-cv-content";
import type { CvPdfFields } from "@/lib/cv/types";

const sectionTitleStyle: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  color: "#374151",
  margin: 0,
  paddingBottom: "6px",
  borderBottom: "1px solid #d1d5db",
};

type Props = CvPdfFields & {
  previewNameFallback: string;
  sectionLabels: {
    summary: string;
    technicalSkills: string;
    projects: string;
    experience: string;
    education: string;
    certifications: string;
    links: string;
    coursework: string;
  };
};

export function CvLivePreview({ previewNameFallback, sectionLabels, ...fields }: Props) {
  const model = buildCvDisplayModel(fields);

  const hasEducation =
    model.educationUniversity ||
    model.educationDegreeLine ||
    model.educationGpa ||
    model.educationGraduation;

  return (
    <div
      id="cv-preview"
      style={{
        fontFamily: "Georgia, 'Times New Roman', serif",
        backgroundColor: "#ffffff",
        color: "#111827",
        maxWidth: "210mm",
        minHeight: "280mm",
        marginLeft: "auto",
        marginRight: "auto",
        width: "100%",
        padding: "36px 40px",
        boxSizing: "border-box",
        boxShadow: "0 1px 2px rgb(0 0 0 / 0.06)",
        lineHeight: 1.5,
      }}
    >
      <header style={{ paddingBottom: "14px", borderBottom: "1px solid #d1d5db" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 700, margin: 0, color: "#111827" }}>
          {model.displayName || previewNameFallback}
        </h1>
        {model.contactLine ? (
          <p style={{ marginTop: "8px", fontSize: "12px", color: "#4b5563" }}>{model.contactLine}</p>
        ) : null}
      </header>

      {model.summary ? (
        <section style={{ marginTop: "20px" }}>
          <h2 style={sectionTitleStyle}>{sectionLabels.summary}</h2>
          <p style={{ marginTop: "10px", fontSize: "12.5px", color: "#1f2937", whiteSpace: "pre-wrap" }}>
            {model.summary}
          </p>
        </section>
      ) : null}

      {model.skillCategoryLines.length ? (
        <section style={{ marginTop: "20px" }}>
          <h2 style={sectionTitleStyle}>{sectionLabels.technicalSkills}</h2>
          <div style={{ marginTop: "10px", fontSize: "12.5px", color: "#1f2937" }}>
            {model.skillCategoryLines.map((line) => (
              <p key={line.label} style={{ margin: "0 0 4px 0" }}>
                <strong>{line.label}:</strong> {line.values}
              </p>
            ))}
          </div>
        </section>
      ) : null}

      {model.projects.length ? (
        <section style={{ marginTop: "20px" }}>
          <h2 style={sectionTitleStyle}>{sectionLabels.projects}</h2>
          <div style={{ marginTop: "10px" }}>
            {model.projects.map((block) => (
              <div key={block.title} style={{ marginBottom: "14px" }}>
                <p style={{ fontSize: "12.5px", fontWeight: 700, color: "#111827", margin: 0 }}>
                  {block.title}
                </p>
                {block.technologies ? (
                  <p style={{ marginTop: "4px", fontSize: "12px", color: "#374151" }}>
                    Technologies: {block.technologies}
                  </p>
                ) : null}
                {block.description ? (
                  <p style={{ marginTop: "4px", fontSize: "12px", color: "#374151", whiteSpace: "pre-wrap" }}>
                    {block.description}
                  </p>
                ) : null}
                {block.bullets.length ? (
                  <ul style={{ margin: "6px 0 0 0", paddingLeft: "18px", fontSize: "12px", color: "#374151" }}>
                    {block.bullets.map((bullet) => (
                      <li key={bullet} style={{ marginBottom: "3px" }}>
                        {bullet}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {block.link ? (
                  <p style={{ marginTop: "4px", fontSize: "11px", color: "#374151", wordBreak: "break-all" }}>
                    {block.link}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {model.experienceBullets.length ? (
        <section style={{ marginTop: "20px" }}>
          <h2 style={sectionTitleStyle}>{sectionLabels.experience}</h2>
          <ul style={{ marginTop: "10px", marginBottom: 0, paddingLeft: "18px", fontSize: "12.5px", color: "#1f2937" }}>
            {model.experienceBullets.map((line) => (
              <li key={line} style={{ marginBottom: "5px" }}>
                {line}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {hasEducation ? (
        <section style={{ marginTop: "20px" }}>
          <h2 style={sectionTitleStyle}>{sectionLabels.education}</h2>
          {model.educationUniversity ? (
            <p style={{ marginTop: "10px", fontSize: "12.5px", fontWeight: 700, color: "#111827" }}>
              {model.educationUniversity}
            </p>
          ) : null}
          {model.educationDegreeLine ? (
            <p style={{ marginTop: "4px", fontSize: "12px", color: "#374151" }}>{model.educationDegreeLine}</p>
          ) : null}
          {model.educationGpa ? (
            <p style={{ marginTop: "4px", fontSize: "12px", color: "#374151" }}>GPA: {model.educationGpa}</p>
          ) : null}
          {model.educationGraduation ? (
            <p style={{ marginTop: "4px", fontSize: "12px", color: "#374151" }}>
              Expected Graduation: {model.educationGraduation}
            </p>
          ) : null}
          {model.coursework.length ? (
            <div style={{ marginTop: "8px" }}>
              <p style={{ fontSize: "11px", fontWeight: 600, color: "#6b7280", marginBottom: "4px" }}>
                {sectionLabels.coursework}
              </p>
              <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "12px", color: "#374151" }}>
                {model.coursework.map((course) => (
                  <li key={course} style={{ marginBottom: "2px" }}>
                    {course}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      {model.certifications.length ? (
        <section style={{ marginTop: "20px" }}>
          <h2 style={sectionTitleStyle}>{sectionLabels.certifications}</h2>
          <ul style={{ marginTop: "10px", marginBottom: 0, paddingLeft: "18px", fontSize: "12.5px", color: "#1f2937" }}>
            {model.certifications.map((cert) => (
              <li key={cert} style={{ marginBottom: "4px" }}>
                {cert}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {model.linksLine ? (
        <section style={{ marginTop: "20px" }}>
          <h2 style={sectionTitleStyle}>{sectionLabels.links}</h2>
          <p style={{ marginTop: "10px", fontSize: "12px", color: "#374151", wordBreak: "break-all" }}>
            {model.linksLine}
          </p>
        </section>
      ) : null}
    </div>
  );
}
