import { NextRequest } from "next/server";
import twilio from "twilio";
import { validateTwilioRequest } from "@/lib/twilio";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const params: Record<string, string> = {};
  for (const [k, v] of form.entries()) params[k] = String(v);

  const signature = req.headers.get("x-twilio-signature");
  const absoluteUrl = process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio/sms`
    : req.url;

  if (!validateTwilioRequest({ url: absoluteUrl, params, signature })) {
    return new Response("invalid signature", { status: 403 });
  }

  const mr = new (twilio.twiml as any).MessagingResponse();
  const inbound = params.Body || "";
  mr.message(`You said: ${inbound}`);
  return new Response(mr.toString(), { headers: { "Content-Type": "text/xml" } });
}
