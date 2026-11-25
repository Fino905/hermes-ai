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
 * Clean conversational filler and question prefixes so search engines find the actual topic
 * instead of KBBI dictionary definitions for words like "siapa" or "berapa".
 */
export function cleanSearchQuery(raw: string): string {
  let q = raw.trim().replace(/[?!.]+$/g, "");
  q = q.replace(/^(tolong |coba |bisa |dong |ngaps |bro |kak |min |guys )/gi, "").trim();
  if (!/\b(arti kata|makna kata|definisi kata|kbbi)\b/i.test(q)) {
    q = q
      .replace(
        /^(siapakah|siapa|berapakah|berapa|kapankah|kapan|dimanakah|di mana|dimana|apakah|apa itu|apa|jelaskan tentang|jelaskan|sebutkan|ceritakan tentang|ceritakan)\s+/gi,
        ""
      )
      .trim();
  }
  return q || raw.trim();
}

/**
 * Perform live web search via Bing HTML engine (with strict b_algo boundary parsing & spam filtering)
 */
export async function searchBing(query: string, limit = 5): Promise<SearchResult[]> {
  try {
    const cleaned = cleanSearchQuery(query);
    const wantsDictionary = /\b(arti kata|makna kata|definisi kata|kbbi)\b/i.test(query);
    const queryHasCJK = /[\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF]/.test(query);

    const bingUrl = "https://www.bing.com/search?q=" + encodeURIComponent(cleaned);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    const res = await fetch(bingUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return [];

    const html = await res.text();
    const results: SearchResult[] = [];

    // Split strictly by <li class="b_algo" so titles and snippets never cross result boundaries
    const blocks = html.split('<li class="b_algo"').slice(1);
    const spamDomains = ["kbbi.web.id", "lektur.id", "artikata.com", "jagokata.com", "zhihu.com", "baidu.com"];

    for (const blk of blocks) {
      if (results.length >= limit) break;

      const titleMatch = blk.match(/<h2[^>]*><a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a><\/h2>/i);
      const snipMatch = blk.match(/<div[^>]+class="b_caption"[^>]*>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i);
      if (!titleMatch || !snipMatch) continue;

      const rawLink = titleMatch[1];
      const title = titleMatch[2].replace(/<[^>]+>/g, "").replace(/&quot;/g, '"').replace(/&amp;/g, "&").trim();
      const snippet = snipMatch[1]
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&#0183;/g, "·")
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, "&")
        .replace(/\s+/g, " ")
        .trim();
      const realUrl = decodeBingUrl(rawLink);

      let domain = "web";
      try {
        domain = new URL(realUrl).hostname.replace(/^www\./, "");
      } catch {}

      if (!title || !snippet || !realUrl.startsWith("http") || domain.includes("bing.com")) {
        continue;
      }

      // Skip KBBI / dictionary / CJK spam unless explicitly requested
      if (!wantsDictionary && (spamDomains.some((d) => domain.includes(d)) || /^arti kata/i.test(title))) {
        continue;
      }
      if (!queryHasCJK && /[\u4E00-\u9FFF]/.test(title + snippet)) {
        continue;
      }

      results.push({
        title,
        url: realUrl,
        domain,
        snippet,
        sourceType: "web",
      });
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
    const cleaned = cleanSearchQuery(query);
    const endpoint = `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
      cleaned
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

    return Object.values(pages)
      .filter((p: any) => p && p.title && p.extract)
      .map((p: any) => ({
        title: p.title,
        url: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent((p.title || "").replace(/ /g, "_"))}`,
        domain: `${lang}.wikipedia.org`,
        snippet: (p.extract || "").replace(/\s+/g, " ").slice(0, 800),
        sourceType: "wikipedia" as const,
      }));
  } catch {
    return [];
  }
}

/**
 * Multi-source web search & absorption:
 * Combines live web search + Wikipedia (ID & EN), prioritizing encyclopedic accuracy!
 */
export async function absorbMultiWebKnowledge(
  query: string,
  saveToObsidian = false
): Promise<WebSearchPackage> {
  // Parallel search on Bing, Wikipedia ID, and Wikipedia EN
  const [bingResults, wikiIdResults, wikiEnResults] = await Promise.all([
    searchBing(query, 4),
    searchWikipedia(query, "id"),
    searchWikipedia(query, "en"),
  ]);

  // Prioritize verified Wikipedia ID facts alongside Bing web results, then Wikipedia EN
  const combined = [...wikiIdResults.slice(0, 1), ...bingResults, ...wikiIdResults.slice(1), ...wikiEnResults.slice(0, 1)];

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

  // 2. Pure casual conversation & assistant capability queries
  const pureCasualQueries = [
    /^(halo|hai|hi|hello|hey|hei|pagi|siang|sore|malam|good morning|good evening|good day)[\s!.,]*$/i,
    /^(siapa kamu|kamu siapa|siapa anda|who are you|sopo kowe|kamu itu apa|siapa namamu|namamu siapa)[\s!.,?]*$/i,
    /^(apa kabar|how are you|piye kabare|sehat|kabar|gimana kabarnya)[\s!.,?]*$/i,
    /^(terima kasih|makasih|thanks|thank you|matur nuwun|syukron)[\s!.,]*$/i,
    /(bisa apa|fitur apa|kemampuan|apa saja yang bisa kamu|apa yang kamu bisa|kamu bisa apa|apa kemampuanmu)/i,
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
    "kurs dollar",
    "harga emas",
  ];

  if (explicitSearchTriggers.some((trigger) => lower.includes(trigger))) {
    return true;
  }

  // 4. Framework / Software installation queries that need live official documentation
  const installTriggers = [
    "cara install",
    "cara instal",
    "cara pasang",
    "cara setup",
    "how to install",
    "how to setup",
    "panduan install",
  ];

  if (installTriggers.some((trigger) => lower.includes(trigger))) {
    return true;
  }

  // 5. Knowledge, factual, concept, tutorial, and comparison questions
  const knowledgeTriggers = [
    "apa itu",
    "apa maksud",
    "apa arti",
    "pengertian",
    "definisi",
    "apakah ",
    "siapa ",
    "siapakah ",
    "berapa ",
    "berapakah ",
    "kapan ",
    "kapankah ",
    "dimana ",
    "di mana ",
    "dimanakah ",
    "sebutkan ",
    "daftar ",
    "bagaimana cara",
    "gimana cara",
    "cara membuat",
    "cara bikin",
    "cara kerja",
    "perbedaan ",
    "beda ",
    "vs ",
    "sejarah ",
    "kelebihan ",
    "kekurangan ",
    "tutorial",
    "panduan",
    "rekomendasi",
    "fungsi ",
    "manfaat ",
    "kenapa ",
    "mengapa ",
    "contoh ",
    "jelaskan ",
    "explain ",
    "what is ",
    "who is ",
    "who was ",
    "when did ",
    "when was ",
    "where is ",
    "how many ",
    "how much ",
    "how tall ",
    "how does ",
    "why does ",
  ];

  if (knowledgeTriggers.some((trigger) => lower.includes(trigger))) {
    return true;
  }

  // 6. Any general factual question ending with '?' that isn't pure casual chat
  if (lower.endsWith("?") && lower.length >= 10) {
    return true;
  }

  return false;
}
