import { NextRequest } from "next/server";
import twilio from "twilio";
import { validateTwilioRequest } from "@/lib/twilio";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const params: Record<string, string> = {};
  for (const [k, v] of form.entries()) params[k] = String(v);

  const signature = req.headers.get("x-twilio-signature");
  const absoluteUrl = process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio/voice`
    : req.url;

  if (!validateTwilioRequest({ url: absoluteUrl, params, signature })) {
    return new Response("invalid signature", { status: 403 });
  }

  const vr = new twilio.twiml.VoiceResponse();

  // Immediate fallback using Twilio's own TTS (fast)
  vr.say({ voice: "Polly.Joanna" }, "Hi! This is your Callwaiting A I receptionist. Connecting your audio now.");

  // Primary audio via mocked TTS endpoint
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const text = `Hi! This is your Callwaiting AI receptionist. I am a mocked T T S voice. How can I help you today?`;
  const ttsUrl = `${appUrl}/api/tts?text=${encodeURIComponent(text)}`;
  vr.play(ttsUrl);

  // Optionally gather input to demo flow
  const gather = vr.gather({
    input: "speech dtmf",
    numDigits: 1,
    action: "/api/webhooks/twilio/voice",
    method: "POST",
    timeout: 5,
  });
  gather.say({ voice: "Polly.Joanna" }, "Press one to book an appointment, or say order to place an order.");

  logger.info("Served Twilio voice TwiML.");
  return new Response(vr.toString(), { headers: { "Content-Type": "text/xml" } });
}

export async function GET() {
  const vr = new twilio.twiml.VoiceResponse();
  vr.say({ voice: "Polly.Joanna" }, "Callwaiting A I voice webhook GET is alive.");
  return new Response(vr.toString(), { headers: { "Content-Type": "text/xml" } });
}
