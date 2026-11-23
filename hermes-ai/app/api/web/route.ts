import { NextRequest, NextResponse } from "next/server";
import { fetchWebContent, absorbWebToObsidian } from "@/lib/webScraper";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const targetUrl = searchParams.get("url");

    if (!targetUrl) {
      return NextResponse.json(
        { error: "Parameter 'url' diperlukan." },
        { status: 400 }
      );
    }

    const article = await fetchWebContent(targetUrl);
    return NextResponse.json({
      status: "success",
      article,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Gagal mengambil konten web", details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, title, saveToObsidian = true } = body;

    if (!url) {
      return NextResponse.json(
        { error: "Parameter 'url' diperlukan dalam body." },
        { status: 400 }
      );
    }

    if (saveToObsidian) {
      const result = await absorbWebToObsidian(url, title);
      if (!result.success) {
        return NextResponse.json(
          { error: "Gagal menyimpan ke Obsidian", details: result.error },
          { status: 500 }
        );
      }
      return NextResponse.json({
        status: "success",
        message: `Web berhasil diserap dan disimpan ke Obsidian: ${result.path}`,
        path: result.path,
        title: result.title,
        article: result.article,
      });
    }

    const article = await fetchWebContent(url);
    return NextResponse.json({
      status: "success",
      article,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Gagal memproses penyerapan web", details: String(error) },
      { status: 500 }
    );
  }
}
