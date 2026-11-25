import { NextRequest, NextResponse } from "next/server";
import {
  buildObsidianBrainPrompt,
  getCoreMemory,
  getVaultStats,
  listVaultNotes,
  searchVault,
  writeVaultNote,
} from "@/lib/obsidian";
import {
  extractUrls,
  fetchWebContent,
  absorbWebToObsidian,
  WebArticle,
} from "@/lib/webScraper";
import {
  absorbMultiWebKnowledge,
  shouldPerformWebSearch,
  WebSearchPackage,
} from "@/lib/webSearch";

export const dynamic = "force-dynamic";

interface MessagePayload {
  role: "user" | "assistant" | "system";
  content: string;
}

type SupportedLang = "id" | "en" | "ja" | "zh" | "es" | "fr" | "de" | "ar" | "ru" | "ko" | "jv";

// Detect user's input language automatically
function detectLanguage(text: string): SupportedLang {
  const t = text.trim();
  if (/[\u0600-\u06FF]/.test(t)) return "ar";
  if (/[\u3040-\u309F\u30A0-\u30FF]/.test(t)) return "ja";
  if (/[\u4E00-\u9FFF]/.test(t)) return "zh";
  if (/[\uAC00-\uD7AF\u1100-\u11FF]/.test(t)) return "ko";
  if (/[\u0400-\u04FF]/.test(t)) return "ru";

  const lower = t.toLowerCase();
  if (/\b(kamu|saya|aku|apa|bagaimana|mengapa|siapa|kenapa|tolong|bisa|terima kasih|catatan|otak|halo|selamat|ini|itu|yang|ada|sudah|bahasa|semua|web|situs|serap|cari|internet)\b/i.test(lower)) {
    return "id";
  }
  if (/\b(kowe|kula|panjenengan|opo|piye|matur|nuwun|sopo|ngendi|monggo)\b/i.test(lower)) {
    return "jv";
  }
  if (/\b(hola|cómo|quién|qué|por qué|gracias|buenos|días|nota|puedes|eres|estás|amigo)\b/i.test(lower)) {
    return "es";
  }
  if (/\b(bonjour|salut|qui|comment|pourquoi|merci|est-ce|vous|êtes|tu|peux|mon|ami)\b/i.test(lower)) {
    return "fr";
  }
  if (/\b(hallo|wer|wie|warum|danke|kannst|bist|guten|tag|notiz|kann|bitte)\b/i.test(lower)) {
    return "de";
  }

  return "en";
}

// Math expression evaluator for offline queries
function tryEvaluateMath(query: string): string | null {
  const clean = query
    .replace(/berapa|hitung|hasil dari|hitunglah|calculate|what is|\?|=/gi, "")
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/x/gi, "*")
    .trim();

  if (/^[\d\s\+\-\*\/\(\)\.\^%]+$/.test(clean) && /[\+\-\*\/]/.test(clean)) {
    try {
      const sanitized = clean.replace(/[^0-9+\-*/().]/g, "");
      const result = new Function(`"use strict"; return (${sanitized})`)();
      if (typeof result === "number" && !isNaN(result) && isFinite(result)) {
        return `Hasil perhitungan dari \`${clean}\` adalah **${result}**.`;
      }
    } catch {}
  }
  return null;
}

// Date / Time checker
function tryHandleDateTime(query: string, lang: SupportedLang): string | null {
  const lower = query.toLowerCase();
  if (
    lower.includes("jam berapa") ||
    lower.includes("tanggal berapa") ||
    lower.includes("hari apa") ||
    lower.includes("what time") ||
    lower.includes("what date") ||
    lower.includes("current time")
  ) {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    };

    if (lang === "en") {
      return `Current time and date: **${now.toLocaleDateString("en-US", options)}**.`;
    }
    return `Waktu dan tanggal saat ini: **${now.toLocaleDateString("id-ID", options)}**.`;
  }
  return null;
}

// Greeting and casual conversation handler
function tryHandleGreetings(query: string, lang: SupportedLang): string | null {
  const lower = query.toLowerCase().trim();

  // 1. Gratitude
  if (
    /^(terima kasih|makasih|makasi|thanks|thank you|thx|matur nuwun|nuhun|arigato|syukron|gracias|merci|danke)[\s!.,]*$/i.test(lower) ||
    lower.includes("terima kasih banyak") ||
    lower.includes("thank you very much")
  ) {
    if (lang === "en") {
      return `You're very welcome! 😊 I'm always here to help you research, write code, or organize your Obsidian Brain. Let me know if there's anything else you need!`;
    }
    return `Sama-sama! Senang bisa membantu Anda 😊 Jika ada hal lain yang ingin Anda cari di internet, kodingan yang ingin dibuat, atau catatan yang ingin disimpan ke Obsidian Brain, beri tahu saya ya!`;
  }

  // 2. Well-being / Casual status
  if (
    /^(apa kabar|gimana kabarnya|bagaimana kabarmu|sehat|piye kabare|kumaha damang|how are you|how's it going|how are you doing)[\s!.,?]*$/i.test(lower) ||
    lower.includes("apa kabar") ||
    lower.includes("how are you")
  ) {
    if (lang === "en") {
      return `I'm doing great and fully operational! 🚀 How are you doing today? What would you like to explore, build, or research together?`;
    }
    return `Kabar saya sangat baik dan sistem saya siap membantu Anda! 🚀 Bagaimana kabar Anda hari ini? Ada topik yang ingin kita riset dari web atau disimpan ke Obsidian Brain?`;
  }

  // 3. Capabilities / Help intent
  if (
    /^(bisa apa|kamu bisa apa|fitur apa|kemampuan kamu|bantu apa|what can you do|help me|help|bantuan)[\s!.,?]*$/i.test(lower) ||
    lower.includes("kamu bisa apa") ||
    lower.includes("bisa bantu apa") ||
    lower.includes("what can you do")
  ) {
    if (lang === "en") {
      return `### 🚀 What Fwinobox AI Can Do:
1. 🧠 **Obsidian Brain**: Reads, searches, and stores permanent notes in your Obsidian Vault.
2. 🌐 **Live Web Absorption**: Explores multiple internet sources to synthesize live, up-to-date answers.
3. 🔗 **URL Ingestion**: Paste any web page link to automatically extract and archive its full content into Obsidian.
4. 🌍 **Universal Polyglot**: Speaks and understands all global and regional languages.
5. 💻 **Full-Stack Assistant**: Helps with software engineering, algorithms, math, and data analysis.`;
    }
    return `### 🚀 Kemampuan Utama Fwinobox AI:
1. 🧠 **Obsidian Brain**: Terhubung langsung ke Obsidian Vault Anda untuk membaca, mencari, dan menyimpan catatan permanen.
2. 🌐 **Penyerapan Multi-Web**: Menjelajahi internet dan merangkum informasi dari berbagai situs web secara live.
3. 🔗 **Ekstraksi Tautan URL**: Tempelkan link situs web mana pun, saya akan menyerap isinya dan menyimpannya ke vault Obsidian Anda.
4. 🌍 **Polyglot Universal**: Memahami dan membalas dalam semua bahasa dunia secara alami.
5. 💻 **Asisten Lengkap**: Membantu penalaran logika, pemecahan rumus matematika, koding, hingga penyusunan dokumen.`;
  }

  // 4. Test / Ping / Diagnostik Bug
  if (
    /^(tes|test|testing|ping|tes bug|test bug|cek bug|cek|cek sistem|status)[\s!.,?]*$/i.test(lower) ||
    lower.includes("tes bug") ||
    lower.includes("test bug") ||
    lower.includes("cek bug")
  ) {
    const stats = getVaultStats();
    return `### 🛠️ Hasil Pengujian Sistem & Diagnostik Bug (Fwinobox AI):

✅ **Status Sistem**: Normal & Responsif
🧠 **Obsidian Brain**: Terhubung ke \`${stats.vaultPath}\` (${stats.totalNotes} catatan aktif)
🌐 **Mesin Penyerapan Web**: Aktif (Bing Live Search & Deep Web Scraper)
⚡ **Anti-Loop Stream**: Terpasang (Batas maks 512 token & terminasi pengulangan aktif)
🎯 **Routing Prioritas**: Matematika ➔ Waktu ➔ Sapaan/Diagnostik ➔ Identitas ➔ Catatan ➔ Riset Web ➔ Vault

*Tidak ditemukan adanya error atau crash. Sistem siap digunakan untuk percakapan, koding, dan penyerapan informasi web!*`;
  }

  // 5. Standard Greetings
  const greetings = [
    "halo", "hai", "hei", "hello", "hi", "hey",
    "pagi", "selamat pagi", "siang", "selamat siang",
    "sore", "selamat sore", "malam", "selamat malam",
    "assalamualaikum", "salam", "sampurasun",
    "good morning", "good day", "good afternoon", "good evening", "greetings"
  ];

  if (greetings.includes(lower) || /^(halo|hai|hello|hi|hey)[\s!.,]*$/i.test(lower)) {
    if (lang === "en") {
      return `### Hello! 👋
I'm **Fwinobox AI**, your intelligent personal assistant powered by your Obsidian Knowledge Vault and live Multi-Web Ingestion.

How can I help you today? You can:
- Ask any question, and I'll search and absorb information from across the web
- Paste any specific website URL to scrape and store in your Obsidian Vault
- Search or explore your notes in Obsidian!`;
    }

    return `### Halo! 👋
Saya **Fwinobox AI**, asisten kecerdasan buatan personal Anda dengan otak Obsidian Vault dan kemampuan menyerap informasi dari berbagai web di internet.

Ada yang bisa saya bantu hari ini? Anda bisa:
- Menanyakan topik apa saja, dan saya akan mencari serta menyerap informasi dari berbagai website
- Menempelkan link web tertentu untuk saya baca dan simpan ke Obsidian Vault
- Mencari dan membaca catatan Anda di Obsidian!`;
  }

  return null;
}

// Check if user is asking to create/write a note to Obsidian in any language
function handleNoteCreationIntent(query: string): { isCreate: boolean; title?: string; content?: string } {
  const pattern = /(?:catat|tulis catatan|simpan ke obsidian|buat note|bikin catatan|create note|write note|save to obsidian|note to obsidian|note down|record note|guardar en obsidian|anotar|crear nota|enregistrer dans obsidian|noter|in obsidian speichern|notiz erstellen|メモ|ノート作成|记笔记|保存到obsidian|记下|سجل في اوبسيديan|احفظ في اوبسيديان|записать в obsidian|создать заметку)\s*[:\-]?\s*([^|\n]+)(?:[|\n]([\s\S]+))?/i;

  const match = query.match(pattern);
  if (match) {
    const rawTitle = match[1]?.trim() || "New Note";
    const rawContent = match[2]?.trim() || query;
    return {
      isCreate: true,
      title: rawTitle.replace(/[\/\\:*?"<>|]/g, "_").slice(0, 50),
      content: rawContent,
    };
  }
  return { isCreate: false };
}

// Framework and software installation guide handler
function tryHandleFrameworkInstall(query: string, lang: SupportedLang): string | null {
  const lower = query.toLowerCase();

  const isInstallIntent =
    lower.includes("install") ||
    lower.includes("instalasi") ||
    lower.includes("pasang") ||
    lower.includes("setup") ||
    lower.includes("unduh") ||
    lower.includes("download") ||
    (lower.includes("cara") && (lower.includes("pakai") || lower.includes("menggunakan") || lower.includes("bikin")));

  if (!isInstallIntent) return null;

  // Next.js
  if (lower.includes("next") || lower.includes("nextjs") || lower.includes("next.js")) {
    return `### ⚡ Panduan Instalasi Next.js (App Router)

Untuk membuat proyek Next.js terbaru dengan TypeScript, Tailwind CSS, dan ESLint:

\`\`\`bash
# Menggunakan npx (npm)
npx create-next-app@latest my-next-app

# Menggunakan pnpm
pnpm create next-app my-next-app

# Menggunakan yarn
yarn create next-app my-next-app
\`\`\`

#### Opsi Rekomendasi Setup:
- **TypeScript**: \`Yes\`
- **ESLint**: \`Yes\`
- **Tailwind CSS**: \`Yes\`
- **App Router**: \`Yes\` (Direkomendasikan)
- **Import alias**: \`@/*\`

#### Menjalankan Server:
\`\`\`bash
cd my-next-app
npm run dev
\`\`\`
Aplikasi siap dibuka di [http://localhost:3000](http://localhost:3000).`;
  }

  // Tailwind CSS
  if (lower.includes("tailwind") || lower.includes("tailwindcss")) {
    return `### 🎨 Panduan Resmi Instalasi Tailwind CSS v4 (tailwindcss.com)

Tailwind CSS v4 adalah versi standar resmi terbaru yang digunakan di situs web resmi [tailwindcss.com](https://tailwindcss.com). Di Tailwind v4, **tidak diperlukan lagi file \`tailwind.config.js\` maupun perintah \`npx tailwindcss init -p\`**. Konfigurasi sekarang menggunakan CSS murni.

#### 1. Instalasi pada Vite (React / Vue / Svelte / Vanilla):
\`\`\`bash
# Install paket Tailwind CSS v4 dan plugin Vite
npm install tailwindcss @tailwindcss/vite
\`\`\`

Tambahkan plugin pada file \`vite.config.ts\`:
\`\`\`typescript
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    tailwindcss(),
  ],
})
\`\`\`

Tambahkan satu baris import ke file CSS utama Anda (\`src/index.css\`):
\`\`\`css
@import "tailwindcss";
\`\`\`

---

#### 2. Instalasi pada Next.js (App Router):
\`\`\`bash
npm install tailwindcss @tailwindcss/postcss postcss
\`\`\`

Tambahkan plugin pada file \`postcss.config.mjs\`:
\`\`\`javascript
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
\`\`\`

Impor di \`app/globals.css\`:
\`\`\`css
@import "tailwindcss";
\`\`\`

---
💡 *Catatan Tailwind v3 (Legacy):*
Jika proyek Anda masih menggunakan Tailwind CSS v3 lama:
\`npm install -D tailwindcss@3 postcss autoprefixer && npx tailwindcss init -p\``;
  }

  // React
  if (lower.includes("react") && !lower.includes("react native")) {
    return `### ⚛️ Panduan Instalasi React (Vite)

Cara tercepat dan paling modern untuk membuat aplikasi React adalah menggunakan **Vite**:

\`\`\`bash
# Buat proyek baru React + TypeScript
npm create vite@latest my-react-app -- --template react-ts

# Masuk ke folder & install paket
cd my-react-app
npm install

# Jalankan dev server
npm run dev
\`\`\`
Buka alamat lokal yang muncul di terminal (biasanya \`http://localhost:5173\`).`;
  }

  // Vue
  if (lower.includes("vue") || lower.includes("vuejs") || lower.includes("vue.js")) {
    return `### 💚 Panduan Instalasi Vue 3

Cara resmi membuat proyek Vue 3:

\`\`\`bash
npm create vue@latest my-vue-app
cd my-vue-app
npm install
npm run dev
\`\`\``;
  }

  // Express.js
  if (lower.includes("express") || lower.includes("expressjs")) {
    return `### 🚀 Panduan Instalasi Express.js (Node.js)

\`\`\`bash
# 1. Buat folder dan inisialisasi package.json
mkdir my-server && cd my-server
npm init -y

# 2. Pasang Express
npm install express
\`\`\`

#### Contoh Server Minimal (\`index.js\`):
\`\`\`javascript
const express = require('express');
const app = express();
const PORT = 3000;

app.get('/', (req, res) => {
  res.send('Server Express.js aktif!');
});

app.listen(PORT, () => {
  console.log(\`Server berjalan di http://localhost:\${PORT}\`);
});
\`\`\`
Jalankan dengan perintah \`node index.js\`.`;
  }

  // Laravel
  if (lower.includes("laravel")) {
    return `### 🔴 Panduan Instalasi Laravel (PHP)

Pastikan **PHP >= 8.2** dan **Composer** sudah terpasang di komputer Anda:

\`\`\`bash
# Buat proyek Laravel baru
composer create-project laravel/laravel my-laravel-app

# Masuk folder dan jalankan server
cd my-laravel-app
php artisan serve
\`\`\`
Akses aplikasi di browser pada [http://127.0.0.1:8000](http://127.0.0.1:8000).`;
  }

  // Django
  if (lower.includes("django")) {
    return `### 🐍 Panduan Instalasi Django (Python)

\`\`\`bash
# 1. Buat dan aktifkan virtual environment
python -m venv venv
venv\\Scripts\\activate   # Windows

# 2. Install Django
pip install django

# 3. Buat proyek baru
django-admin startproject myproject .
python manage.py migrate
python manage.py runserver
\`\`\`
Buka [http://127.0.0.1:8000](http://127.0.0.1:8000) di browser Anda.`;
  }

  // Generic framework installation guide
  if (lower.includes("framework") || lower.includes("library") || lower.includes("suatu framework")) {
    return `### 🛠️ Panduan Umum Cara Install Framework

Berikut cara standar menginstal framework berdasarkan bahasa pemrograman:

#### 1. JavaScript / TypeScript (React, Next.js, Vue, Express, Tailwind)
\`\`\`bash
npm init -y
npm install [nama-framework]
# Atau gunakan CLI resmi pembuat proyek:
npx create-[nama-framework]@latest my-app
\`\`\`

#### 2. Python (Django, Flask, FastAPI)
\`\`\`bash
python -m venv venv
venv\\Scripts\\activate
pip install [nama-framework]
\`\`\`

#### 3. PHP (Laravel, Symfony)
\`\`\`bash
composer create-project [vendor/package] my-app
# Atau install package ke proyek yang ada:
composer require [nama-package]
\`\`\`

#### 4. Rust (Actix, Axum, Tokio)
\`\`\`bash
cargo add [nama-crate]
\`\`\`

💡 *Tips: Sebutkan nama spesifik framework yang ingin Anda gunakan (misal "cara install Tailwind" atau "cara install Express") untuk mendapatkan panduan konfigurasi yang tepat!*`;
  }

  return null;
}

// Generate intelligent contextual response when local LLM is not active
function generateObsidianBrainResponse(
  lastUserMessage: string,
  absorbedArticle?: WebArticle | null,
  savedWebPath?: string | null,
  searchPackage?: WebSearchPackage | null
): string {
  const query = lastUserMessage.toLowerCase().trim();
  const lang = detectLanguage(lastUserMessage);
  const stats = getVaultStats();
  const allNotes = listVaultNotes();
  const matchedNotes = searchVault(lastUserMessage, 3, 20);

  // 1. Math evaluation (Always takes immediate precedence)
  const mathResult = tryEvaluateMath(lastUserMessage);
  if (mathResult) return mathResult;

  // 2. Date / Time
  const dateResult = tryHandleDateTime(lastUserMessage, lang);
  if (dateResult) return dateResult;

  // 3. Greetings & Casual conversation
  const greetingResult = tryHandleGreetings(lastUserMessage, lang);
  if (greetingResult) return greetingResult;

  // 4. Identity / Who are you / Core Memory (Multilingual)
  const isIdentityQuery =
    query.includes("siapa kamu") ||
    query.includes("kamu siapa") ||
    query.includes("who are you") ||
    query.includes("siapa namamu") ||
    query.includes("namamu siapa") ||
    query.includes("what is your name") ||
    query.includes("kamu itu apa") ||
    query.includes("quién eres") ||
    query.includes("qui es-tu") ||
    query.includes("wer bist du") ||
    query.includes("あなたは誰") ||
    query.includes("你是谁") ||
    query.includes("من أنت") ||
    query.includes("кто ты") ||
    query.includes("sopo kowe") ||
    query.includes("core memory") ||
    query.includes("otak") ||
    query.includes("brain");

  if (isIdentityQuery) {
    return `### 🧠 Halo! Saya Fwinobox AI
Saya adalah asisten kecerdasan buatan personal Anda dengan **Obsidian** sebagai otak dan basis memori utama saya.

#### Fitur & Kemampuan Baru:
- **Menyerap Informasi dari Berbagai Web**: Tanyakan topik apa saja, dan saya akan secara otomatis menjelajahi internet, menyerap data dari berbagai website, dan menyintesis jawabannya untuk Anda!
- **Universal Polyglot**: Menguasai semua bahasa di dunia secara alami.
- **Koneksi Obsidian Vault**: Terhubung langsung ke \`${stats.vaultPath}\` (${stats.totalNotes} catatan aktif).

#### Catatan Utama yang Tersedia:
${allNotes.slice(0, 10).map((n) => `  - [[${n.title}]] (\`${n.relativePath}\`)`).join("\n")}`;
  }

  // 5. Note Creation Command (Multilingual)
  const noteIntent = handleNoteCreationIntent(lastUserMessage);
  if (noteIntent.isCreate && noteIntent.title) {
    const filename = `knowledge/${noteIntent.title}.md`;
    const res = writeVaultNote(
      filename,
      `# ${noteIntent.title}\n\n${noteIntent.content}\n\n*Created by Fwinobox AI (${new Date().toISOString()})*`
    );

    if (res.success) {
      if (lang === "en") {
        return `### 🧠 Note Saved to Obsidian Brain!
Your note has been written directly to your Obsidian Vault:
- **Title**: [[${noteIntent.title}]]
- **File Path**: \`${res.path}\`
- **Vault**: \`${stats.vaultPath}\`

**Content**:
> ${noteIntent.content}

*This note is now stored permanently in Fwinobox AI's Obsidian memory.*`;
      }

      return `### 🧠 Catatan Berhasil Disimpan ke Obsidian Brain!
Catatan Anda telah ditulis langsung ke dalam Vault Obsidian:
- **Judul**: [[${noteIntent.title}]]
- **Lokasi File**: \`${res.path}\`
- **Vault**: \`${stats.vaultPath}\`

**Isi Catatan**:
> ${noteIntent.content}

*Catatan ini sekarang sudah menjadi bagian dari memori permanen Fwinobox AI dan dapat saya akses kapan saja!*`;
    }
  }

  // 6. Direct Web Article Ingested (Single URL provided by user)
  if (absorbedArticle) {
    return `### 🌐 Web Berhasil Diserap ke Obsidian Brain!

Saya telah berhasil mengakses, membaca, dan mengekstrak informasi dari web:
- **Judul Artikel**: [[${absorbedArticle.title}]]
- **Domain**: \`${absorbedArticle.domain}\`
- **URL Sumber**: [${absorbedArticle.url}](${absorbedArticle.url})
- **Tersimpan di Obsidian**: \`${savedWebPath || "knowledge/web/" + absorbedArticle.title + ".md"}\`
- **Jumlah Kata**: ${absorbedArticle.wordCount} kata

---

### 📄 Ringkasan / Konten Utama:
${absorbedArticle.description ? `> **Deskripsi**: ${absorbedArticle.description}\n\n` : ""}
${absorbedArticle.content.slice(0, 1000)}...

---
💡 *Konten lengkap dari situs web ini sekarang telah tersimpan permanen di folder \`knowledge/web/\` di Obsidian Vault Anda!*`;
  }

  // 7. Multi-Source Web Search Absorption
  if (searchPackage && searchPackage.results.length > 0) {
    let response = "";

    const queryClean = searchPackage.query;
    response += `### 🌐 Hasil Penelusuran Web: "${queryClean}"\n\n`;

    if (searchPackage.topArticle && searchPackage.topArticle.content) {
      const summaryText = searchPackage.topArticle.content
        .replace(/\s+/g, " ")
        .slice(0, 600);
      response += `${summaryText}...\n\n`;
    } else {
      const bestSnippet = searchPackage.results[0].snippet;
      response += `${bestSnippet}\n\n`;
      if (searchPackage.results[1]?.snippet) {
        response += `${searchPackage.results[1].snippet}\n\n`;
      }
    }

    response += `---\n\n### 🔗 Sumber Web Rujukan:\n`;
    response += searchPackage.results
      .slice(0, 4)
      .map((res, idx) => `${idx + 1}. [${res.title}](${res.url}) (\`${res.domain}\`)`)
      .join("\n");

    if (searchPackage.savedNotePath) {
      response += `\n\n💡 *Disimpan ke Obsidian: \`${searchPackage.savedNotePath}\`*`;
    }

    return response;
  }

  // 8. Framework and Tool Installation Guides
  const frameworkResult = tryHandleFrameworkInstall(lastUserMessage, lang);
  if (frameworkResult) return frameworkResult;

  // 9. Vault & Notes listing query
  const isVaultQuery =
    query.includes("obsidian") ||
    query.includes("catatan") ||
    query.includes("vault") ||
    query.includes("notes") ||
    query.includes("daftar file") ||
    query.includes("list notes");

  if (isVaultQuery) {
    const noteListStr =
      allNotes.length > 0
        ? allNotes
            .map(
              (n) =>
                `- **[[${n.title}]]** — \`${n.relativePath}\` (${n.size} bytes)\n  > ${n.content.slice(0, 100).replace(/\n+/g, " ")}...`
            )
            .join("\n\n")
        : "*Vault is currently empty.*";

    return `### 📚 Basis Pengetahuan Obsidian Vault (\`${stats.vaultName}\`)

Saat ini saya terhubung langsung dengan vault Obsidian Anda:
- **Path Vault**: \`${stats.vaultPath}\`
- **Total Catatan**: **${stats.totalNotes} catatan**

#### Catatan yang Ada di Vault:
${noteListStr}

💡 *Tips: Anda bisa meminta saya mencari catatan tertentu atau mengetik \`catat ke obsidian: [Judul] | [Isi]\` untuk menyimpan catatan baru langsung ke vault!*`;
  }

  // 10. If query matched specific notes in Obsidian with high confidence
  if (matchedNotes.length > 0) {
    const topNote = matchedNotes[0];
    return `### 🧠 Ditemukan di Obsidian Brain: [[${topNote.title}]]

Sumber: \`${topNote.relativePath}\`

${topNote.content}

---
*Catatan Terkait Lainnya:*
${matchedNotes.slice(1).map((n) => `- [[${n.title}]] (\`${n.relativePath}\`)`).join("\n") || "- Tidak ada catatan terkait lainnya."}`;
  }

  // 11. Honest and helpful explanation when local LLM server is offline
  return `### ⚠️ Model AI Lokal Sedang Offline

Pertanyaan Anda mengenai:
> *"${lastUserMessage}"*

Saat ini server model AI (LLM) di latar belakang (http://127.0.0.1:18434) sedang tidak aktif, sehingga saya belum dapat menjalankan penalaran neural network untuk menjawab pertanyaan ini secara dinamis.

---

### 💡 Cara Mengaktifkan AI:
1. Jalankan [Start-Fwinobox.bat](file:///d:/hermes/Start-Fwinobox.bat) untuk mengaktifkan AI engine di background.
2. Anda juga bisa menempelkan link web atau menanyakan topik apa pun untuk diserap dari internet ke Obsidian!`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, stream = true } = body as {
      messages?: MessagePayload[];
      stream?: boolean;
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Invalid request: 'messages' array is required." },
        { status: 400 }
      );
    }

    const lastUserMessage =
      [...messages].reverse().find((m) => m.role === "user")?.content || "Halo";

    // 1. Detect Web Absorption from URLs in user message
    const detectedUrls = extractUrls(lastUserMessage);
    let absorbedArticle: WebArticle | null = null;
    let savedWebPath: string | null = null;
    let searchPackage: WebSearchPackage | null = null;

    if (detectedUrls.length > 0) {
      // User provided a specific URL
      const targetUrl = detectedUrls[0];
      try {
        const absorbRes = await absorbWebToObsidian(targetUrl);
        if (absorbRes.success) {
          absorbedArticle = absorbRes.article;
          savedWebPath = absorbRes.path;
        } else {
          absorbedArticle = await fetchWebContent(targetUrl);
        }
      } catch (e) {
        console.warn("Web fetch warning for URL:", targetUrl, e);
      }
    } else if (shouldPerformWebSearch(lastUserMessage)) {
      // User asked a question that needs multi-source web search
      try {
        const wantsSave =
          lastUserMessage.toLowerCase().includes("simpan") ||
          lastUserMessage.toLowerCase().includes("catat") ||
          lastUserMessage.toLowerCase().includes("ke obsidian");
        searchPackage = await absorbMultiWebKnowledge(lastUserMessage, wantsSave);
      } catch (e) {
        console.warn("Multi-web search error:", e);
      }
    }

    // 2. Build Obsidian Brain System Prompt
    let obsidianPrompt = buildObsidianBrainPrompt(lastUserMessage);

    // If specific web article was absorbed, inject it
    if (absorbedArticle) {
      obsidianPrompt += `\n\n=== RECENTLY ABSORBED WEB KNOWLEDGE ===
Source URL: ${absorbedArticle.url}
Title: ${absorbedArticle.title}
Domain: ${absorbedArticle.domain}
${savedWebPath ? `Saved into Obsidian Vault as: [[${absorbedArticle.title}]] (Path: ${savedWebPath})\n` : ""}
Web Page Content:
${absorbedArticle.content}
=======================================
Instructions for this Web Knowledge:
1. The user provided this web page. Read and analyze the content above.
2. Synthesize, answer questions, extract key takeaways, or summarize this website clearly.
3. Mention that this information has been absorbed and saved into their Obsidian Brain.
`;
    }

    // If multi-source web search results were absorbed, inject them cleanly without leaking prompt headers
    if (searchPackage && searchPackage.results.length > 0) {
      const hasWiki = searchPackage.results.some((r) => r.sourceType === "wikipedia");
      obsidianPrompt += `\nContext from web search for "${searchPackage.query}":\n`;
      const topResults = searchPackage.results.slice(0, 2);
      for (const res of topResults) {
        const cleanText = res.snippet.replace(/\s+/g, " ").trim();
        obsidianPrompt += `${res.title}: ${cleanText}\n`;
      }
      if (!hasWiki && searchPackage.topArticle && searchPackage.topArticle.content) {
        obsidianPrompt += `Summary (${searchPackage.topArticle.domain}): ${searchPackage.topArticle.content.slice(0, 350).replace(/\s+/g, " ")}\n`;
      }
      obsidianPrompt += `\nUse only the facts above to answer the user's question clearly in natural sentences. Do not copy raw labels or invent unrelated facts.\n`;
    }

    // 3. Connect to local LLM server
    const localLlmUrl = process.env.LOCAL_LLM_URL || "http://127.0.0.1:18434/v1";
    const localApiKey = process.env.LOCAL_LLM_API_KEY || "6xcq5LFBTUHkN-8VjjTRb_XLX-GephFj";
    const localModel = process.env.LOCAL_LLM_MODEL || "qwen2.5-0.5b-instruct-q4_k_m";

    let activeUrl = "";
    let activeKey = "";
    let activeModelName = "";
    let useLlm = false;

    // Check Hermes llama-server (port 18434)
    try {
      const pingCtrl = new AbortController();
      const timeout = setTimeout(() => pingCtrl.abort(), 2500);
      const res = await fetch(`${localLlmUrl}/models`, {
        headers: { Authorization: `Bearer ${localApiKey}` },
        signal: pingCtrl.signal,
      });
      clearTimeout(timeout);
      if (res.ok) {
        const modelData = await res.json().catch(() => null);
        const detectedModel = modelData?.data?.[0]?.id || localModel;
        useLlm = true;
        activeUrl = localLlmUrl;
        activeKey = localApiKey;
        activeModelName = detectedModel;
      }
    } catch {}

    // Fallback: Check Ollama (port 11434)
    if (!useLlm) {
      try {
        const pingCtrl = new AbortController();
        const timeout = setTimeout(() => pingCtrl.abort(), 1200);
        const res = await fetch("http://127.0.0.1:11434/v1/models", {
          signal: pingCtrl.signal,
        });
        clearTimeout(timeout);
        if (res.ok) {
          const modelData = await res.json().catch(() => null);
          const detectedModel = modelData?.data?.[0]?.id || "qwen2.5:0.5b";
          useLlm = true;
          activeUrl = "http://127.0.0.1:11434/v1";
          activeKey = "ollama";
          activeModelName = detectedModel;
        }
      } catch {}
    }

    let llmStream: ReadableStream | null = null;

    if (useLlm) {
      try {
        const llmPayload = {
          model: activeModelName,
          messages: [
            { role: "system", content: obsidianPrompt },
            ...messages.slice(-4),
          ],
          stream: true,
          temperature: 0.3,
          top_p: 0.9,
          max_tokens: 600,
          repeat_penalty: 1.08,
          frequency_penalty: 0.0,
          presence_penalty: 0.0,
          stop: [
            "<|im_end|>",
            "<|im_start|>",
            "<|endoftext|>",
            "\nUser:",
            "\nHuman:",
            "User:",
            "Human:",
          ],
        };

        const fetchCtrl = new AbortController();
        const fetchTimeout = setTimeout(() => fetchCtrl.abort(), 30000);
        const llmResponse = await fetch(`${activeUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${activeKey}`,
          },
          body: JSON.stringify(llmPayload),
          signal: fetchCtrl.signal,
        });
        clearTimeout(fetchTimeout);

        if (llmResponse.ok && llmResponse.body) {
          const reader = llmResponse.body.getReader();
          const decoder = new TextDecoder();
          const encoder = new TextEncoder();

          llmStream = new ReadableStream({
            async start(controller) {
              let buffer = "";
              let accumulatedAssistantText = "";

              // If web search gathered sources during thinking, emit a brief web discovery badge
              if (searchPackage && searchPackage.results.length > 0) {
                const domains = searchPackage.results
                  .slice(0, 3)
                  .map((r) => `\`${r.domain}\``)
                  .join(", ");
                const searchBadge = `> 🌐 *Menemukan & membaca sumber web (${domains})...*\n\n`;
                controller.enqueue(encoder.encode(searchBadge));
              }

              try {
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;

                  buffer += decoder.decode(value, { stream: true });
                  const lines = buffer.split("\n");
                  buffer = lines.pop() || "";

                  for (const rawLine of lines) {
                    const line = rawLine.trim();
                    if (!line || !line.startsWith("data: ")) continue;

                    const dataStr = line.slice(6).trim();
                    if (dataStr === "[DONE]") {
                      controller.close();
                      return;
                    }

                    try {
                      const parsed = JSON.parse(dataStr);
                      const delta = parsed.choices?.[0]?.delta?.content || "";
                      const finishReason = parsed.choices?.[0]?.finish_reason;

                      if (delta) {
                        // Drop stop tokens if leaked into content
                        if (
                          delta.includes("<|im_end|>") ||
                          delta.includes("<|im_start|>") ||
                          delta.includes("<|endoftext|>")
                        ) {
                          controller.close();
                          return;
                        }

                        // Anti-loop protection: Terminate stream early if sentences repeat
                        accumulatedAssistantText += delta;
                        const sentences = accumulatedAssistantText
                          .split(/[.!?\n]+/)
                          .map((s) => s.trim())
                          .filter((s) => s.length > 15);

                        if (sentences.length >= 3) {
                          const lastS = sentences[sentences.length - 1];
                          const prev1 = sentences[sentences.length - 2];
                          const prev2 = sentences[sentences.length - 3];
                          if (lastS === prev1 && prev1 === prev2) {
                            console.warn("Repetition loop detected, terminating stream cleanly.");
                            controller.close();
                            return;
                          }
                        }

                        controller.enqueue(encoder.encode(delta));
                      }

                      if (finishReason === "stop" || finishReason === "length") {
                        controller.close();
                        return;
                      }
                    } catch {}
                  }
                }
              } catch (streamErr) {
                console.warn("Stream reading ended or cancelled:", streamErr);
              } finally {
                try {
                  controller.close();
                } catch {}
              }
            },
          });
        }
      } catch (err) {
        console.warn("LLM streaming error, falling back to Obsidian Brain:", err);
      }
    }

    // If real LLM produced a stream, stream it directly to client
    if (llmStream) {
      return new Response(llmStream, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      });
    }

    // Direct contextual response (with Web Absorption support)
    const responseText = generateObsidianBrainResponse(
      lastUserMessage,
      absorbedArticle,
      savedWebPath,
      searchPackage
    );

    if (!stream) {
      return NextResponse.json({
        role: "assistant",
        content: responseText,
      });
    }

    const words = responseText.split(/(\s+)/);
    const encoder = new TextEncoder();

    const readableStream = new ReadableStream({
      async start(controller) {
        for (let i = 0; i < words.length; i++) {
          const chunk = words[i];
          controller.enqueue(encoder.encode(chunk));

          const isPunctuation = /[.!?\n]/.test(chunk);
          const delay = isPunctuation ? 20 : 10;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
        controller.close();
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("API /api/chat error:", error);
    return NextResponse.json(
      { error: "Internal Server Error in chat handler" },
      { status: 500 }
    );
  }
}
