import { writeVaultNote } from "./obsidian";

export interface WebArticle {
  url: string;
  domain: string;
  title: string;
  description: string;
  content: string;
  wordCount: number;
  extractedAt: string;
}

/**
 * Clean raw HTML into clean readable Markdown/text
 */
export function cleanHtmlToMarkdown(html: string, url: string): { title: string; description: string; content: string } {
  // 1. Extract Title
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  let title = titleMatch ? titleMatch[1].replace(/&[a-z0-9#]+;/gi, " ").trim() : "";

  if (!title) {
    const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    title = h1Match ? h1Match[1].replace(/<[^>]+>/g, "").trim() : "Web Note";
  }

  // Clean title from common branding pipes/dashes
  title = title.split(/\s+[|\-–—]\s+/)[0].trim() || "Web Note";

  // 2. Extract Meta Description
  const metaDescMatch =
    html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i) ||
    html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i) ||
    html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']*)["']/i);
  const description = metaDescMatch ? metaDescMatch[1].trim() : "";

  // 3. Strip non-content blocks
  let clean = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, "")
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, "")
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, "")
    .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, "")
    .replace(/<aside\b[^<]*(?:(?!<\/aside>)<[^<]*)*<\/aside>/gi, "")
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");

  // 4. Convert structural HTML to Markdown equivalents
  clean = clean
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, "\n\n# $1\n\n")
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, "\n\n## $1\n\n")
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, "\n\n### $1\n\n")
    .replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, "\n\n#### $1\n\n")
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "\n- $1")
    .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, "\n> $1\n")
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, "\n\n$1\n\n")
    .replace(/<br\s*[\/]?>/gi, "\n")
    .replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, "\n```\n$1\n```\n")
    .replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, "`$1`")
    .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, "**$1**")
    .replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, "**$1**")
    .replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, "*$1*")
    .replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, "*$1*");

  // 5. Strip all remaining tags
  clean = clean.replace(/<[^>]+>/g, " ");

  // 6. Decode common HTML entities
  clean = clean
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");

  // 7. Normalize whitespace and paragraph spacing
  clean = clean
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n\n")
    .trim();

  // Limit max length to 10,000 chars to avoid prompt context blowup
  if (clean.length > 10000) {
    clean = clean.slice(0, 10000) + "\n\n*(Konten dipotong karena batas panjang pembacaan)*";
  }

  return { title, description, content: clean };
}

/**
 * Fetch and extract clean article text from a URL
 */
export async function fetchWebContent(targetUrl: string): Promise<WebArticle> {
  const urlObj = new URL(targetUrl);
  const domain = urlObj.hostname.replace(/^www\./, "");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  const response = await fetch(targetUrl, {
    method: "GET",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "id,en-US;q=0.9,en;q=0.8",
    },
    signal: controller.signal,
  });

  clearTimeout(timeoutId);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText} saat mengakses ${targetUrl}`);
  }

  const rawHtml = await response.text();
  const { title, description, content } = cleanHtmlToMarkdown(rawHtml, targetUrl);

  const words = content.trim().split(/\s+/).filter(Boolean);

  return {
    url: targetUrl,
    domain,
    title: title || `Artikel dari ${domain}`,
    description,
    content,
    wordCount: words.length,
    extractedAt: new Date().toISOString(),
  };
}

/**
 * Absorb a webpage directly into Obsidian Brain (writes a Markdown note)
 */
export async function absorbWebToObsidian(
  url: string,
  customTitle?: string
): Promise<{ success: boolean; path: string; title: string; article: WebArticle; error?: string }> {
  try {
    const article = await fetchWebContent(url);
    const safeTitle = (customTitle || article.title)
      .replace(/[\/\\:*?"<>|]/g, "_")
      .trim()
      .slice(0, 60);

    const relativePath = `knowledge/web/${safeTitle}.md`;

    const noteContent = `# ${safeTitle}

- **Sumber Asli**: [${article.domain}](${article.url})
- **Diserap Pada**: ${new Date().toLocaleString("id-ID")}
- **Domain**: \`${article.domain}\`
- **Kategori**: #web-source #knowledge #absorbed

${article.description ? `> **Deskripsi**: ${article.description}\n\n` : ""}---

## 📄 Isi Konten yang Diserap:

${article.content}

---
*Catatan ini otomatis diserap dan disimpan ke Obsidian Brain oleh Fwinobox AI.*
`;

    const writeResult = writeVaultNote(relativePath, noteContent);

    if (!writeResult.success) {
      return {
        success: false,
        path: relativePath,
        title: safeTitle,
        article,
        error: writeResult.error,
      };
    }

    return {
      success: true,
      path: writeResult.path,
      title: safeTitle,
      article,
    };
  } catch (err) {
    return {
      success: false,
      path: "",
      title: "",
      article: {} as WebArticle,
      error: String(err),
    };
  }
}

/**
 * Extract URLs from a user message
 */
export function extractUrls(text: string): string[] {
  const matches = text.match(/https?:\/\/[^\s\)\],>"']+/gi);
  return matches ? Array.from(new Set(matches)) : [];
}

/**
 * Check if the user is asking to absorb / scrape / summarize a web page
 */
export function isWebAbsorptionIntent(text: string): boolean {
  const lower = text.toLowerCase();
  const hasUrl = extractUrls(text).length > 0;
  if (!hasUrl) return false;

  const keywords = [
    "baca",
    "serap",
    "ambil",
    "scrape",
    "rangkum",
    "ringkas",
    "simpan web",
    "web ini",
    "pelajari",
    "ingest",
    "absorb",
    "fetch",
    "read",
    "summarize",
    "isi dari",
    "jelaskan isi",
    "apa isi",
  ];

  return keywords.some((kw) => lower.includes(kw)) || text.trim().startsWith("http");
}
