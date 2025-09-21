import { NextRequest } from "next/server";
import { logger } from "@/lib/logger";
import path from "path";
import { promises as fs } from "fs";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const text = searchParams.get("text") || "Hello from Callwaiting AI";
    const gateway = process.env.TTS_GATEWAY_URL;

    // If a real TTS gateway is configured, proxy to it (GET /synthesize?text=...)
    if (gateway) {
      const url = new URL("/synthesize", gateway);
      url.searchParams.set("text", text);

      const resp = await fetch(url.toString());
      if (!resp.ok) {
        throw new Error(`TTS gateway error: ${resp.status} ${resp.statusText}`);
      }
      const headers = new Headers(resp.headers);
      headers.set("Content-Type", headers.get("Content-Type") || "audio/wav");
      return new Response(resp.body, { headers });
    }

    // Fallback: serve a built-in demo wav
    const filePath = path.join(process.cwd(), "public", "audio", "demo-voice.wav");
    const data = await fs.readFile(filePath);
    return new Response(data, {
      headers: {
        "Content-Type": "audio/wav",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    logger.error("TTS route failed:", err);
    return new Response("TTS error", { status: 500 });
  }
}
