"use client";

import React, { useState } from "react";
import { CheckIcon, CopyIcon } from "./Icons";

interface MarkdownRendererProps {
  content: string;
  isStreaming?: boolean;
}

interface CodeBlockProps {
  language: string;
  code: string;
}

function CodeBlock({ language, code }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback if clipboard API unavailable
      const textArea = document.createElement("textarea");
      textArea.value = code;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="my-4 rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900/90 shadow-lg text-sm">
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-950/80 border-b border-zinc-800/80 text-xs font-mono text-zinc-400">
        <span className="uppercase tracking-wider font-semibold text-zinc-300">
          {language || "code"}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-800/60 hover:bg-zinc-700/60 text-zinc-300 hover:text-white transition-colors"
          title="Copy code"
        >
          {copied ? (
            <>
              <CheckIcon className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <CopyIcon className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <div className="p-4 overflow-x-auto font-mono text-zinc-200 text-xs sm:text-sm leading-relaxed">
        <pre className="m-0 whitespace-pre">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
}

// Inline formatter for bold, italic, code, links, and Obsidian wikilinks
function formatInlineText(text: string): React.ReactNode[] {
  // Regex pattern matching:
  // 1. Inline code: `code`
  // 2. Bold: **text**
  // 3. Italic: *text*
  // 4. Strikethrough: ~~text~~
  // 5. Obsidian wikilinks: [[Note Title]]
  // 6. Links: [text](url)
  const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|~~[^~]+~~|\[\[[^\]]+\]\]|\[[^\]]+\]\([^)]+\))/g;
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (!part) return null;

    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={index}
          className="px-1.5 py-0.5 mx-0.5 rounded bg-zinc-800/90 text-indigo-300 text-xs sm:text-[13px] font-mono border border-zinc-700/40"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-semibold text-zinc-100">
          {part.slice(2, -2)}
        </strong>
      );
    }

    if (part.startsWith("*") && part.endsWith("*")) {
      return (
        <em key={index} className="italic text-zinc-200">
          {part.slice(1, -1)}
        </em>
      );
    }

    if (part.startsWith("~~") && part.endsWith("~~")) {
      return (
        <del key={index} className="line-through text-zinc-400">
          {part.slice(2, -2)}
        </del>
      );
    }

    const wikiMatch = part.match(/^\[\[([^\]]+)\]\]$/);
    if (wikiMatch) {
      return (
        <span
          key={index}
          className="inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded-md bg-purple-950/60 text-purple-300 border border-purple-800/60 text-xs font-mono font-medium shadow-xs"
          title={`Obsidian Note: ${wikiMatch[1]}`}
        >
          <span className="text-[10px]">🧠</span>
          <span>{wikiMatch[1]}</span>
        </span>
      );
    }

    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      return (
        <a
          key={index}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2 transition-colors"
        >
          {linkMatch[1]}
        </a>
      );
    }

    return <span key={index}>{part}</span>;
  });
}

export function MarkdownRenderer({ content, isStreaming }: MarkdownRendererProps) {
  // Parse content into blocks: code blocks, tables, blockquotes, lists, headings, paragraphs
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];

  let i = 0;
  let elementKey = 0;

  while (i < lines.length) {
    const line = lines[i];

    // 1. Code Block detection: ```lang
    if (line.trim().startsWith("```")) {
      const language = line.trim().slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      // skip the closing ```
      if (i < lines.length && lines[i].trim().startsWith("```")) {
        i++;
      }
      elements.push(
        <CodeBlock
          key={`code-${elementKey++}`}
          language={language}
          code={codeLines.join("\n")}
        />
      );
      continue;
    }

    // 2. Table detection: starts with | and next line has |-
    if (line.trim().startsWith("|") && i + 1 < lines.length && lines[i + 1].trim().startsWith("|") && lines[i + 1].includes("-")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        tableLines.push(lines[i].trim());
        i++;
      }

      if (tableLines.length >= 2) {
        const headerCells = tableLines[0]
          .split("|")
          .slice(1, -1)
          .map((c) => c.trim());

        const bodyRows = tableLines.slice(2).map((rowLine) =>
          rowLine
            .split("|")
            .slice(1, -1)
            .map((c) => c.trim())
        );

        elements.push(
          <div key={`table-${elementKey++}`} className="my-4 overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/40">
            <table className="w-full text-left text-xs sm:text-sm text-zinc-300">
              <thead className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-100 font-semibold uppercase text-xs tracking-wider">
                <tr>
                  {headerCells.map((header, idx) => (
                    <th key={idx} className="px-4 py-3">
                      {formatInlineText(header)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {bodyRows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-zinc-800/30 transition-colors">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="px-4 py-3 align-top">
                        {formatInlineText(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
    }

    // 3. Blockquote detection: > text
    if (line.trim().startsWith(">")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        quoteLines.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      elements.push(
        <blockquote
          key={`quote-${elementKey++}`}
          className="my-3 border-l-4 border-indigo-500/80 bg-zinc-900/50 pl-4 py-2 rounded-r-lg text-zinc-300 italic text-sm"
        >
          {quoteLines.map((q, idx) => (
            <p key={idx} className={idx > 0 ? "mt-1.5" : ""}>
              {formatInlineText(q)}
            </p>
          ))}
        </blockquote>
      );
      continue;
    }

    // 4. Headings
    if (line.startsWith("#### ")) {
      elements.push(
        <h4 key={`h4-${elementKey++}`} className="text-sm font-semibold text-zinc-100 mt-4 mb-2">
          {formatInlineText(line.slice(5))}
        </h4>
      );
      i++;
      continue;
    }
    if (line.startsWith("### ")) {
      elements.push(
        <h3 key={`h3-${elementKey++}`} className="text-base sm:text-lg font-semibold text-zinc-100 mt-5 mb-2">
          {formatInlineText(line.slice(4))}
        </h3>
      );
      i++;
      continue;
    }
    if (line.startsWith("## ")) {
      elements.push(
        <h2 key={`h2-${elementKey++}`} className="text-lg sm:text-xl font-bold text-zinc-100 mt-6 mb-3 pb-1 border-b border-zinc-800">
          {formatInlineText(line.slice(3))}
        </h2>
      );
      i++;
      continue;
    }
    if (line.startsWith("# ")) {
      elements.push(
        <h1 key={`h1-${elementKey++}`} className="text-xl sm:text-2xl font-bold text-zinc-100 mt-6 mb-4 pb-1.5 border-b border-zinc-800">
          {formatInlineText(line.slice(2))}
        </h1>
      );
      i++;
      continue;
    }

    // 5. Unordered List: starts with - , * , or +
    if (/^[-*+]\s/.test(line.trim())) {
      const listItems: string[] = [];
      while (i < lines.length) {
        const curLine = lines[i];
        const trimmed = curLine.trim();

        if (/^[-*+]\s/.test(trimmed)) {
          listItems.push(trimmed.replace(/^[-*+]\s/, ""));
          i++;
        } else if (trimmed === "") {
          // Lookahead: check if next non-empty line is also an unordered list item (loose list)
          let nextIdx = i + 1;
          while (nextIdx < lines.length && lines[nextIdx].trim() === "") {
            nextIdx++;
          }
          if (nextIdx < lines.length && /^[-*+]\s/.test(lines[nextIdx].trim())) {
            i = nextIdx;
          } else {
            break;
          }
        } else if (curLine.startsWith("  ") || curLine.startsWith("\t")) {
          // Indented continuation of previous list item
          if (listItems.length > 0) {
            listItems[listItems.length - 1] += "\n" + trimmed;
          }
          i++;
        } else {
          break;
        }
      }

      elements.push(
        <ul key={`ul-${elementKey++}`} className="my-2.5 space-y-1.5 list-disc pl-5 text-sm text-zinc-200">
          {listItems.map((item, idx) => {
            // Task list check
            if (item.startsWith("[ ] ") || item.startsWith("[x] ") || item.startsWith("[X] ")) {
              const checked = item.startsWith("[x] ") || item.startsWith("[X] ");
              const itemText = item.slice(4);
              return (
                <li key={idx} className="list-none flex items-start gap-2 -ml-5">
                  <input
                    type="checkbox"
                    checked={checked}
                    readOnly
                    className="mt-1 h-3.5 w-3.5 rounded border-zinc-700 bg-zinc-800 text-indigo-500 accent-indigo-500 pointer-events-none"
                  />
                  <span>{formatInlineText(itemText)}</span>
                </li>
              );
            }
            return <li key={idx}>{formatInlineText(item)}</li>;
          })}
        </ul>
      );
      continue;
    }

    // 6. Ordered List: starts with "1. ", "1) ", "2. ", etc.
    if (/^\d+[\.\)]\s/.test(line.trim())) {
      const listItems: string[] = [];
      const firstMatch = line.trim().match(/^(\d+)[\.\)]\s/);
      const startNum = firstMatch ? parseInt(firstMatch[1], 10) : 1;

      while (i < lines.length) {
        const curLine = lines[i];
        const trimmed = curLine.trim();

        if (/^\d+[\.\)]\s/.test(trimmed)) {
          listItems.push(trimmed.replace(/^\d+[\.\)]\s/, ""));
          i++;
        } else if (trimmed === "") {
          // Lookahead: check if next non-empty line is an ordered list item (loose list)
          let nextIdx = i + 1;
          while (nextIdx < lines.length && lines[nextIdx].trim() === "") {
            nextIdx++;
          }
          if (nextIdx < lines.length && /^\d+[\.\)]\s/.test(lines[nextIdx].trim())) {
            i = nextIdx;
          } else {
            break;
          }
        } else if (curLine.startsWith("  ") || curLine.startsWith("\t")) {
          // Indented continuation of previous list item
          if (listItems.length > 0) {
            listItems[listItems.length - 1] += "\n" + trimmed;
          }
          i++;
        } else {
          break;
        }
      }

      elements.push(
        <ol
          key={`ol-${elementKey++}`}
          start={startNum}
          className="my-2.5 space-y-1.5 list-decimal pl-5 text-sm text-zinc-200"
        >
          {listItems.map((item, idx) => (
            <li key={idx}>{formatInlineText(item)}</li>
          ))}
        </ol>
      );
      continue;
    }

    // 7. Horizontal rule: ---
    if (line.trim() === "---" || line.trim() === "***" || line.trim() === "___") {
      elements.push(
        <hr key={`hr-${elementKey++}`} className="my-5 border-zinc-800" />
      );
      i++;
      continue;
    }

    // 8. Empty lines
    if (!line.trim()) {
      i++;
      continue;
    }

    // 9. Standard paragraph
    elements.push(
      <p key={`p-${elementKey++}`} className="my-2 text-sm sm:text-[15px] leading-relaxed text-zinc-200">
        {formatInlineText(line)}
      </p>
    );
    i++;
  }

  return (
    <div className="prose-dark max-w-none text-zinc-200">
      {elements}
      {isStreaming && (
        <span
          className="inline-block w-2 h-4 ml-1 bg-indigo-400 align-middle animate-pulse"
          aria-hidden="true"
        />
      )}
    </div>
  );
}

