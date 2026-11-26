import { NextRequest, NextResponse } from "next/server";
import { getVaultStats, listVaultNotes, writeVaultNote } from "@/lib/obsidian";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const stats = getVaultStats();
    const notes = listVaultNotes().map((n) => ({
      title: n.title,
      relativePath: n.relativePath,
      folder: n.folder,
      size: n.size,
      mtime: n.mtime,
      preview: n.content.slice(0, 150).replace(/\n+/g, " "),
    }));

    // Check if local LLM server is online (Prioritize Ollama on port 11434, fallback to Hermes 18434)
    let llmOnline = false;
    let activeModel = "qwen2.5:3b";
    let activeUrl = process.env.OLLAMA_URL || "http://127.0.0.1:11434/v1";
    const localLlmUrl = process.env.LOCAL_LLM_URL || "http://127.0.0.1:18434/v1";
    const localApiKey = process.env.LOCAL_LLM_API_KEY || "6xcq5LFBTUHkN-8VjjTRb_XLX-GephFj";

    // 1. Check Ollama (port 11434)
    try {
      const pingCtrl = new AbortController();
      const timeout = setTimeout(() => pingCtrl.abort(), 1200);
      const res = await fetch(`${activeUrl}/models`, {
        signal: pingCtrl.signal,
      });
      clearTimeout(timeout);
      if (res.ok) {
        const data = await res.json().catch(() => null);
        const modelsList: { id: string }[] = data?.data || [];
        const preferred =
          modelsList.find((m) => /qwen2\.5:(3b|7b|14b)|llama3|gemma2/i.test(m.id)) ||
          modelsList.find((m) => !m.id.includes("0.5b")) ||
          modelsList[0];

        if (preferred?.id) {
          llmOnline = true;
          activeModel = process.env.OLLAMA_MODEL || preferred.id;
        }
      }
    } catch {}

    // 2. Fallback: Check Hermes llama-server (port 18434)
    if (!llmOnline) {
      try {
        const pingCtrl = new AbortController();
        const timeout = setTimeout(() => pingCtrl.abort(), 1000);
        const res = await fetch(`${localLlmUrl}/models`, {
          headers: { Authorization: `Bearer ${localApiKey}` },
          signal: pingCtrl.signal,
        });
        clearTimeout(timeout);
        if (res.ok) {
          llmOnline = true;
          activeUrl = localLlmUrl;
          const data = await res.json().catch(() => null);
          activeModel = data?.data?.[0]?.id || "qwen2.5-0.5b-instruct-q4_k_m";
        }
      } catch {
        llmOnline = false;
      }
    }

    return NextResponse.json({
      status: "connected",
      stats,
      notes,
      llm: {
        isOnline: llmOnline,
        url: activeUrl,
        model: activeModel,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to read Obsidian vault", details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { path: notePath, content, append = false } = body;

    if (!notePath || !content) {
      return NextResponse.json(
        { error: "Missing required fields: 'path' and 'content'" },
        { status: 400 }
      );
    }

    const result = writeVaultNote(notePath, content, append);
    if (!result.success) {
      return NextResponse.json(
        { error: "Failed to write note", details: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: "success",
      message: `Note saved to Obsidian: ${result.path}`,
      path: result.path,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to process note write", details: String(error) },
      { status: 500 }
    );
  }
}
