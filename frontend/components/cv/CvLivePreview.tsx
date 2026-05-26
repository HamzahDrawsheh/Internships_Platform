"use client";

import { buildCvDisplayModel } from "@/lib/cv/format-cv-content";
import type { CvPdfFields } from "@/lib/cv/types";

const sectionTitleStyle: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  color: "#4b5563",
  margin: 0,
  paddingBottom: "6px",
  borderBottom: "1px solid #d1d5db",
};

type Props = CvPdfFields & {
  previewNameFallback: string;
  sectionLabels: {
    summary: string;
    education: string;
    skills: string;
    experience: string;
    projects: string;
    coursework: string;
  };
};

export function CvLivePreview({ previewNameFallback, sectionLabels, ...fields }: Props) {
  const model = buildCvDisplayModel(fields);

  return (
    <div
      id="cv-preview"
      style={{
        fontFamily: "'Segoe UI', system-ui, sans-serif",
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
        lineHeight: 1.45,
      }}
    >
      <header style={{ paddingBottom: "16px", borderBottom: "2px solid #e5e7eb" }}>
        <h1 style={{ fontSize: "26px", fontWeight: 700, letterSpacing: "-0.02em", margin: 0, color: "#111827" }}>
          {model.displayName || previewNameFallback}
        </h1>
        {model.contactLine ? (
          <p style={{ marginTop: "10px", fontSize: "13px", color: "#4b5563" }}>{model.contactLine}</p>
        ) : null}
        {model.linksLine ? (
          <p style={{ marginTop: "6px", fontSize: "12px", color: "#6d28d9", wordBreak: "break-all" }}>
            {model.linksLine}
          </p>
        ) : null}
      </header>

      {model.summary ? (
        <section style={{ marginTop: "22px" }}>
          <h2 style={sectionTitleStyle}>{sectionLabels.summary}</h2>
          <p style={{ marginTop: "10px", fontSize: "13px", color: "#1f2937", whiteSpace: "pre-wrap" }}>
            {model.summary}
          </p>
        </section>
      ) : null}

      {model.educationHeadline || model.department || model.gpa || model.courses.length ? (
        <section style={{ marginTop: "22px" }}>
          <h2 style={sectionTitleStyle}>{sectionLabels.education}</h2>
          {model.educationHeadline ? (
            <p style={{ marginTop: "10px", fontSize: "14px", fontWeight: 700, color: "#111827" }}>
              {model.educationHeadline}
            </p>
          ) : null}
          {model.department ? (
            <p style={{ marginTop: "4px", fontSize: "13px", fontStyle: "italic", color: "#4b5563" }}>
              {model.department}
            </p>
          ) : null}
          {model.gpa ? (
            <p style={{ marginTop: "6px", fontSize: "13px", color: "#374151" }}>GPA: {model.gpa}</p>
          ) : null}
          {model.educationExtra.map((line) => (
            <p key={line} style={{ marginTop: "4px", fontSize: "13px", color: "#374151" }}>
              {line}
            </p>
          ))}
          {model.courses.length ? (
            <div style={{ marginTop: "10px" }}>
              <p style={{ fontSize: "12px", fontWeight: 600, color: "#6b7280", marginBottom: "6px" }}>
                {sectionLabels.coursework}
              </p>
              <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "12.5px", color: "#374151" }}>
                {model.courses.map((course) => (
                  <li key={course} style={{ marginBottom: "3px" }}>
                    {course}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      {model.skills.length ? (
        <section style={{ marginTop: "22px" }}>
          <h2 style={sectionTitleStyle}>{sectionLabels.skills}</h2>
          <ul
            style={{
              marginTop: "10px",
              marginBottom: 0,
              paddingLeft: 0,
              listStyle: "none",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "4px 16px",
              fontSize: "13px",
              color: "#1f2937",
            }}
          >
            {model.skills.map((skill) => (
              <li key={skill} style={{ display: "flex", gap: "6px" }}>
                <span style={{ color: "#6b7280" }}>•</span>
                <span>{skill}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {model.experienceBullets.length ? (
        <section style={{ marginTop: "22px" }}>
          <h2 style={sectionTitleStyle}>{sectionLabels.experience}</h2>
          <ul style={{ marginTop: "10px", marginBottom: 0, paddingLeft: "18px", fontSize: "13px", color: "#1f2937" }}>
            {model.experienceBullets.map((line) => (
              <li key={line} style={{ marginBottom: "5px" }}>
                {line}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {model.projects.length ? (
        <section style={{ marginTop: "22px" }}>
          <h2 style={sectionTitleStyle}>{sectionLabels.projects}</h2>
          <div style={{ marginTop: "10px" }}>
            {model.projects.map((block) => (
              <div key={block.title} style={{ marginBottom: "12px" }}>
                <p style={{ fontSize: "13px", fontWeight: 700, color: "#111827", margin: 0 }}>{block.title}</p>
                {block.body ? (
                  <p style={{ marginTop: "4px", fontSize: "13px", color: "#374151", whiteSpace: "pre-wrap" }}>
                    {block.body}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
