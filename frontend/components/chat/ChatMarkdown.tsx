"use client";

import { Fragment, type ReactNode } from "react";

/** Render common markdown patterns from assistant replies (bold, lists, paragraphs). */
export function ChatMarkdown({ content }: { content: string }) {
  const blocks = parseBlocks(content.trim());
  if (!blocks.length) return null;

  return (
    <div className="chat-markdown space-y-2 text-sm leading-relaxed">
      {blocks.map((block, i) => (
        <Fragment key={i}>{block}</Fragment>
      ))}
    </div>
  );
}

function parseBlocks(text: string): ReactNode[] {
  const lines = text.split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i += 1;
      continue;
    }

    if (/^\s*\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s/.test(lines[i])) {
        items.push(lines[i].trim().replace(/^\d+\.\s*/, ""));
        i += 1;
      }
      blocks.push(
        <ol key={`ol-${i}`} className="list-decimal space-y-1 pl-5">
          {items.map((item, j) => (
            <li key={j}>{renderInline(item)}</li>
          ))}
        </ol>
      );
      continue;
    }

    if (/^\s*[-*•]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*•]\s/.test(lines[i])) {
        items.push(lines[i].trim().replace(/^[-*•]\s*/, ""));
        i += 1;
      }
      blocks.push(
        <ul key={`ul-${i}`} className="list-disc space-y-1 pl-5">
          {items.map((item, j) => (
            <li key={j}>{renderInline(item)}</li>
          ))}
        </ul>
      );
      continue;
    }

    const paraLines: string[] = [line];
    i += 1;
    while (i < lines.length && lines[i].trim() && !/^\s*\d+\.\s/.test(lines[i]) && !/^\s*[-*•]\s/.test(lines[i])) {
      paraLines.push(lines[i]);
      i += 1;
    }
    blocks.push(<p key={`p-${i}`}>{renderInline(paraLines.join("\n"))}</p>);
  }

  return blocks;
}

function renderInline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={idx} className="font-semibold text-gray-900 dark:text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <Fragment key={idx}>{part}</Fragment>;
  });
}
