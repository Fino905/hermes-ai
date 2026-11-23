import { writeVaultNote } from "./obsidian";
import { fetchWebContent, WebArticle } from "./webScraper";

export interface SearchResult {
  title: string;
  url: string;
  domain: string;
  snippet: string;
  sourceType: "web" | "wikipedia";
}

export interface WebSearchPackage {
  query: string;
  results: SearchResult[];
  savedNotePath?: string;
  timestamp: string;
  topArticle?: WebArticle | null;
}

/**
 * Decode base64 real URL from Bing redirection link
 */
function decodeBingUrl(rawUrl: string): string {
  try {
    const cleanRaw = rawUrl.replace(/&amp;/g, "&");
    const match = cleanRaw.match(/[?&]u=a1([^&]+)/);
    if (match) {
      const base64 = match[1];
      return Buffer.from(base64, "base64").toString("utf-8");
    }
  } catch { }
  return rawUrl.replace(/&amp;/g, "&");
}

/**
 * Perform live web search via Bing HTML engine
 */
export async function searchBing(query: string, limit = 5): Promise<SearchResult[]> {
  try {
    const bingUrl = "https://www.bing.com/search?q=" + encodeURIComponent(query);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    const res = await fetch(bingUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        "Accept-Language": "id,en-US;q=0.9,en;q=0.8",
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return [];

    const html = await res.text();
    const results: SearchResult[] = [];

    // Parse each search result block
    const itemRegex =
      /<h2><a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a><\/h2>[\s\S]*?<div[^>]+class="b_caption"[^>]*><p[^>]*>([\s\S]*?)<\/p>/gi;
    let m;

    while ((m = itemRegex.exec(html)) !== null && results.length < limit) {
      const rawLink = m[1];
      const title = m[2].replace(/<[^>]+>/g, "").trim();
      const snippet = m[3]
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();
      const realUrl = decodeBingUrl(rawLink);

      let domain = "web";
      try {
        domain = new URL(realUrl).hostname.replace(/^www\./, "");
      } catch { }

      if (title && snippet && realUrl.startsWith("http") && !domain.includes("bing.com")) {
        results.push({
          title,
          url: realUrl,
          domain,
          snippet,
          sourceType: "web",
        });
      }
    }

    return results;
  } catch (err) {
    console.warn("Bing search error:", err);
    return [];
  }
}

/**
 * Search Wikipedia for encyclopedic facts (Indonesian & English)
 */
export async function searchWikipedia(query: string, lang = "id"): Promise<SearchResult[]> {
  try {
    const endpoint = `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
      query
    )}&utf8=&format=json&origin=*`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(endpoint, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) return [];
    const data = await res.json();
    const hits = data?.query?.search || [];

    if (hits.length === 0) return [];

    const titles = hits.slice(0, 2).map((h: { title: string }) => h.title);
    const extractEndpoint = `https://${lang}.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=&explaintext=&titles=${encodeURIComponent(
      titles.join("|")
    )}&format=json&origin=*`;

    const extRes = await fetch(extractEndpoint);
    if (!extRes.ok) return [];
    const extData = await extRes.json();
    const pages = extData?.query?.pages || {};

    return Object.values(pages).map((p: any) => ({
      title: p.title,
      url: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent((p.title || "").replace(/ /g, "_"))}`,
      domain: `${lang}.wikipedia.org`,
      snippet: (p.extract || "").slice(0, 500),
      sourceType: "wikipedia",
    }));
  } catch {
    return [];
  }
}

/**
 * Multi-source web search & absorption:
 * Combines live web search + Wikipedia, and optionally records the research note into Obsidian!
 */
export async function absorbMultiWebKnowledge(
  query: string,
  saveToObsidian = true
): Promise<WebSearchPackage> {
  // Parallel search on Bing and Wikipedia
  const [bingResults, wikiResults] = await Promise.all([
    searchBing(query, 4),
    searchWikipedia(query, "id"),
  ]);

  const combined = [...bingResults, ...wikiResults];

  // Deduplicate by URL
  const seen = new Set<string>();
  const uniqueResults: SearchResult[] = [];
  for (const item of combined) {
    if (!seen.has(item.url) && item.snippet) {
      seen.add(item.url);
      uniqueResults.push(item);
    }
  }

  let savedNotePath: string | undefined;
  let topArticle: WebArticle | null = null;

  // Fetch the full content of the top official website result
  const topWebResult = uniqueResults.find((r) => r.sourceType === "web") || uniqueResults[0];
  if (topWebResult && topWebResult.url) {
    try {
      topArticle = await fetchWebContent(topWebResult.url);
    } catch {
      // Continue without full page extraction if blocked
    }
  }

  // Save the absorbed multi-source knowledge into Obsidian
  if (saveToObsidian && uniqueResults.length > 0) {
    const safeTitle = query
      .replace(/[\/\\:*?"<>|]/g, "_")
      .trim()
      .slice(0, 50);

    const relativePath = `knowledge/research/${safeTitle}.md`;

    let noteContent = `# Riset Web: ${query}

- **Topik Pencarian**: \`${query}\`
- **Tanggal Diserap**: ${new Date().toLocaleString("id-ID")}
- **Total Sumber Ditemukan**: ${uniqueResults.length} sumber web
- **Tag**: #web-research #live-search #knowledge

---

`;

    if (topArticle && topArticle.content) {
      noteContent += `## 📄 Konten Utama dari Situs Resmi: [${topArticle.title}](${topArticle.url})
> Sumber: \`${topArticle.domain}\`

${topArticle.content.slice(0, 3000)}

---

`;
    }

    noteContent += `## 🌐 Sumber-Sumber Web yang Diserap:\n\n`;

    uniqueResults.forEach((res, idx) => {
      noteContent += `### ${idx + 1}. [${res.title}](${res.url})
- **Domain**: \`${res.domain}\` (${res.sourceType})
- **Ringkasan**:
> ${res.snippet}

`;
    });

    noteContent += `\n---\n*Diserap dan disintesis otomatis oleh Fwinobox AI.*`;

    const writeRes = writeVaultNote(relativePath, noteContent);
    if (writeRes.success) {
      savedNotePath = writeRes.path;
    }
  }

  return {
    query,
    results: uniqueResults,
    savedNotePath,
    timestamp: new Date().toISOString(),
    topArticle,
  };
}

/**
 * Determine if a user query would benefit from live web search
 */
export function shouldPerformWebSearch(query: string): boolean {
  const lower = query.toLowerCase().trim();

  // 1. Ignore very short queries or pure numbers/math
  if (lower.length < 3) return false;
  if (/^[\d\s+\-*/()^.%]+$/.test(lower)) return false;

  // 2. Pure casual conversation that should be answered instantly by local logic
  const pureCasualQueries = [
    /^(halo|hai|hi|hello|hey|hei|pagi|siang|sore|malam|good morning|good evening|good day)[\s!.,]*$/i,
    /^(siapa kamu|kamu siapa|siapa anda|who are you|sopo kowe|kamu itu apa|siapa namamu|namamu siapa)[\s!.,?]*$/i,
    /^(apa kabar|how are you|piye kabare|sehat|kabar|gimana kabarnya)[\s!.,?]*$/i,
    /^(terima kasih|makasih|thanks|thank you|matur nuwun|syukron)[\s!.,]*$/i,
    /^(bisa apa|fitur apa|kemampuan kamu|help me|tolong bantu|kamu bisa apa)[\s!.,?]*$/i,
    /^(tes|test|testing|ping|tes bug|test bug|cek bug|cek|cek sistem|status)[\s!.,?]*$/i,
    /^(catat|simpan ke obsidian|tulis catatan|daftar catatan|list notes)[\s!:]*$/i,
  ];

  if (pureCasualQueries.some((pattern) => pattern.test(lower))) {
    return false;
  }

  // 3. Explicit keywords that demand live web search
  const explicitSearchTriggers = [
    "cari di web",
    "cari di internet",
    "search web",
    "browsing",
    "googling",
    "serap web",
    "serap info",
    "berita hari ini",
    "berita terbaru",
    "harga terbaru",
    "jadwal bola",
    "klasemen",
    "cuaca hari ini",
    "terbaru 2026",
    "terbaru 2025",
    "tahun 2026",
    "latest news",
    "current price",
    "hari ini",
  ];

  if (explicitSearchTriggers.some((trigger) => lower.includes(trigger))) {
    return true;
  }

  // 4. Broad knowledge, how-to, setup, tutorial, and informational triggers
  const infoTriggers = [
    // How-to / Tutorial / Installation (frameworks, software, coding)
    "cara ",
    "bagaimana ",
    "gimana ",
    "how to ",
    "how do ",
    "install",
    "instalasi",
    "setup",
    "unduh",
    "download",
    "tutorial",
    "panduan",
    "langkah",
    "framework",
    "library",
    "modul",
    "package",
    "konfigurasi",
    // Inquiries & Facts
    "apa itu",
    "apa arti",
    "apa maksud",
    "pengertian",
    "definisi",
    "sejarah",
    "rekomendasi",
    "review",
    "ulasan",
    "spesifikasi",
    "harga",
    "berita",
    "cuaca",
    "siapa penemu",
    "siapa presiden",
    "siapa menteri",
    "siapa juara",
    "siapa pendiri",
    "kapan ",
    "dimana ",
    "mengapa ",
    "kenapa ",
    "perbedaan ",
    "beda ",
    "vs ",
    "fungsi ",
    "kegunaan ",
    "manfaat ",
    "contoh ",
    "jelaskan ",
    "explain ",
    "what is ",
    "who is ",
    "why ",
    "where ",
    "when ",
  ];

  if (infoTriggers.some((trigger) => lower.includes(trigger))) {
    return true;
  }

  // 5. If query contains a question mark and has at least 3 words, search web!
  const words = lower.split(/\s+/).filter((w) => w.length > 0);
  if (lower.includes("?") && words.length >= 3) {
    return true;
  }

  // 6. If query has 4 or more words and is not casual chat, benefit from web absorption!
  if (words.length >= 4) {
    return true;
  }

  return false;
}
