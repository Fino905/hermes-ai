import type fsType from "fs";
import type pathType from "path";

// Dynamically resolve Node native modules at runtime to bypass Turbopack's static asset tracing
function getFs(): typeof fsType {
  if (typeof process !== "undefined" && typeof (process as any).getBuiltinModule === "function") {
    return (process as any).getBuiltinModule("fs");
  }
  try {
    const { createRequire } = eval('require("module")');
    return createRequire(process.cwd())("fs");
  } catch {
    return eval("require('fs')");
  }
}

function getPath(): typeof pathType {
  if (typeof process !== "undefined" && typeof (process as any).getBuiltinModule === "function") {
    return (process as any).getBuiltinModule("path");
  }
  try {
    const { createRequire } = eval('require("module")');
    return createRequire(process.cwd())("path");
  } catch {
    return eval("require('path')");
  }
}

export interface VaultNote {
  name: string;
  title: string;
  relativePath: string;
  fullPath: string;
  content: string;
  size: number;
  mtime: string;
  folder: string;
}

export interface VaultStats {
  vaultName: string;
  vaultPath: string;
  exists: boolean;
  totalNotes: number;
  folders: string[];
  recentNotes: { title: string; relativePath: string; mtime: string }[];
}

/**
 * Resolve the Obsidian Vault path
 */
export function getVaultPath(): string {
  const path = getPath();
  const fs = getFs();

  if (process.env.OBSIDIAN_VAULT_PATH) {
    return process.env.OBSIDIAN_VAULT_PATH;
  }

  // Fallback to default user path
  const defaultPath = path.join("D:", "hermesbrain", "HermesBrain");
  if (fs.existsSync(defaultPath)) {
    return defaultPath;
  }

  return defaultPath;
}

/**
 * List all markdown notes in the Obsidian Vault recursively
 */
export function listVaultNotes(): VaultNote[] {
  const fs = getFs();
  const path = getPath();
  const vaultPath = getVaultPath();

  if (!fs.existsSync(vaultPath)) {
    return [];
  }

  const notes: VaultNote[] = [];

  function scanDirectory(currentDir: string) {
    try {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        // Skip hidden folders and files (.obsidian, .git, .trash, etc.)
        if (entry.name.startsWith(".")) continue;

        const fullPath = path.join(currentDir, entry.name);

        if (entry.isDirectory()) {
          scanDirectory(fullPath);
        } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
          try {
            const stat = fs.statSync(fullPath);
            const content = fs.readFileSync(fullPath, "utf-8");
            const relPath = path.relative(vaultPath, fullPath).replace(/\\/g, "/");
            const folder = path.dirname(relPath) === "." ? "root" : path.dirname(relPath);
            const title = entry.name.replace(/\.md$/i, "");

            notes.push({
              name: entry.name,
              title,
              relativePath: relPath,
              fullPath,
              content,
              size: stat.size,
              mtime: stat.mtime.toISOString(),
              folder,
            });
          } catch {
            // Ignore unreadable individual files
          }
        }
      }
    } catch {
      // Ignore unreadable directories
    }
  }

  scanDirectory(vaultPath);
  return notes;
}

/**
 * Get Core Memory from Obsidian Vault (e.g., memory/coreMemory.md)
 */
export function getCoreMemory(): string {
  const fs = getFs();
  const path = getPath();
  const vaultPath = getVaultPath();

  const candidates = [
    path.join(vaultPath, "memory", "coreMemory.md"),
    path.join(vaultPath, "coreMemory.md"),
    path.join(vaultPath, "memory.md"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      try {
        return fs.readFileSync(candidate, "utf-8");
      } catch {
        // continue search
      }
    }
  }

  return "";
}

const VAULT_STOP_WORDS = new Set([
  "ini", "itu", "yang", "dan", "di", "ke", "dari", "ada", "bisa", "apa",
  "dengan", "untuk", "pada", "adalah", "sebagai", "saya", "kamu", "kita",
  "suatu", "sebuah", "cara", "bagaimana", "gimana", "the", "and", "for",
  "with", "from", "that", "this", "how", "what", "where", "when", "why",
  "install", "instalasi", "instal", "pasang", "setup", "download", "unduh",
  "buat", "bikin", "pakai", "use", "using", "make"
]);

/**
 * Search the vault for notes relevant to a given query
 */
export function searchVault(query: string, maxResults = 5, minScore = 15): VaultNote[] {
  const notes = listVaultNotes();
  if (!query || notes.length === 0) return notes.slice(0, maxResults);

  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 2 && !VAULT_STOP_WORDS.has(t));

  if (terms.length === 0) return [];

  const scored = notes.map((note) => {
    let score = 0;
    const lowerTitle = note.title.toLowerCase();
    const lowerContent = note.content.toLowerCase();

    for (const term of terms) {
      if (lowerTitle.includes(term)) score += 15;
      if (lowerTitle === term) score += 30;

      // Count occurrences in content (max 5 per term)
      const matches = (lowerContent.match(new RegExp(escapeRegExp(term), "g")) || []).length;
      score += Math.min(matches * 2, 10);
    }

    return { note, score };
  });

  return scored
    .filter((s) => s.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map((s) => s.note);
}

/**
 * Save or append a note to the Obsidian Vault
 */
export function writeVaultNote(
  relativePath: string,
  content: string,
  append = false
): { success: boolean; path: string; error?: string } {
  try {
    const fs = getFs();
    const path = getPath();
    const vaultPath = getVaultPath();
    const sanitizedRel = relativePath.replace(/^(\.\.[\/\\])+/, "").trim();
    const targetFile = sanitizedRel.endsWith(".md") ? sanitizedRel : `${sanitizedRel}.md`;
    const fullPath = path.join(vaultPath, targetFile);

    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (append && fs.existsSync(fullPath)) {
      fs.appendFileSync(fullPath, `\n\n${content}`, "utf-8");
    } else {
      fs.writeFileSync(fullPath, content, "utf-8");
    }

    return { success: true, path: targetFile };
  } catch (error) {
    return { success: false, path: relativePath, error: String(error) };
  }
}

/**
 * Get comprehensive vault statistics
 */
export function getVaultStats(): VaultStats {
  const fs = getFs();
  const path = getPath();
  const vaultPath = getVaultPath();
  const exists = fs.existsSync(vaultPath);

  if (!exists) {
    return {
      vaultName: "Obsidian",
      vaultPath,
      exists: false,
      totalNotes: 0,
      folders: [],
      recentNotes: [],
    };
  }

  const notes = listVaultNotes();
  const folders = Array.from(new Set(notes.map((n) => n.folder))).filter((f) => f !== "root");

  const recentNotes = [...notes]
    .sort((a, b) => new Date(b.mtime).getTime() - new Date(a.mtime).getTime())
    .slice(0, 10)
    .map((n) => ({
      title: n.title,
      relativePath: n.relativePath,
      mtime: n.mtime,
    }));

  return {
    vaultName: path.basename(vaultPath) || "HermesBrain",
    vaultPath,
    exists: true,
    totalNotes: notes.length,
    folders,
    recentNotes,
  };
}

/**
 * Build rich system prompt context injecting Obsidian Brain knowledge
 */
export function buildObsidianBrainPrompt(query: string): string {
  const vaultPath = getVaultPath();
  const stats = getVaultStats();
  const coreMemory = getCoreMemory();
  const relevantNotes = searchVault(query, 3);
  const allNotes = listVaultNotes();

  const noteListSnippet = allNotes
    .map((n) => `- [[${n.title}]] (${n.relativePath})`)
    .slice(0, 10)
    .join("\n");

  let prompt = `You are Fwinobox AI, an intelligent personal assistant powered by your Obsidian Knowledge Vault ("Obsidian Brain").
Vault Location: ${vaultPath}
Total Notes in Brain: ${stats.totalNotes}

UNIVERSAL MULTILINGUAL CAPABILITY:
You possess native fluency and deep comprehension in ALL human languages (including Bahasa Indonesia, English, 日本語, 中文, Español, Français, Deutsch, العربية, Русский, 한국어, Português, Italiano, Basa Jawa, Basa Sunda, and all other world and regional languages).
You MUST:
1. Automatically detect the user's input language and respond in the exact same language with natural phrasing and appropriate cultural tone.
2. If the user explicitly asks for a particular language (e.g. "jawab dalam bahasa Jepang", "explain in Spanish"), strictly obey that request.
3. Freely interpret and reference your Obsidian notes regardless of what language the notes were written in, translating or summarizing them into the user's active language as needed.
`;

  if (coreMemory) {
    prompt += `=== OBSIDIAN CORE MEMORY ===\n${coreMemory.slice(0, 1000)}\n============================\n\n`;
  }

  if (relevantNotes.length > 0) {
    prompt += `=== RELEVANT OBSIDIAN NOTES FOR THIS QUERY ===\n`;
    for (const note of relevantNotes) {
      prompt += `--- Note: [[${note.title}]] (${note.relativePath}) ---\n${note.content.slice(0, 600)}\n\n`;
    }
    prompt += `==============================================\n\n`;
  }

  if (allNotes.length > 0) {
    prompt += `Notes currently available in your Obsidian Vault:\n${noteListSnippet}\n\n`;
  }

  prompt += `Guidelines:
1. You represent Fwinobox AI, whose long-term brain and memory lives in this Obsidian Vault.
2. Answer directly, clearly, and concisely. Never repeat phrases or loop sentences.
3. When listing items with numbers, ALWAYS use sequential numbers: 1., 2., 3., 4., etc. (never repeat '1.' for every item).
4. Once you have answered the user's inquiry, stop generating immediately.
5. If the user asks who you are, what your purpose is, or about your memory, refer to your Obsidian Core Memory.
6. When referencing notes in the vault, you may use Obsidian-style wikilinks like [[Note Title]].
7. Always be helpful, concise, and articulate in whatever language the user speaks.
8. If the user tells you to remember something or write a note, let them know you can save it into Obsidian.
`;

  return prompt;
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
