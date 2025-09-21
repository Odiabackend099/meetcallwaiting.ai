import { NextRequest } from "next/server";
import { logger } from "@/lib/logger";
import { validateTwilioRequest } from "@/lib/twilio";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const params: Record<string, string> = {};
  for (const [k, v] of form.entries()) params[k] = String(v);

  const signature = req.headers.get("x-twilio-signature");
  const absoluteUrl = process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio/status`
    : req.url;

  if (!validateTwilioRequest({ url: absoluteUrl, params, signature })) {
    return new Response("invalid signature", { status: 403 });
  }

  logger.info("Call status update:", params.CallSid, params.CallStatus, params.CallDuration);
  return new Response("ok", { status: 200 });
}
