import twilio, { Twilio } from "twilio";
import { logger } from "@/lib/logger";

/**
 * Validate a Twilio webhook request using x-twilio-signature header.
 * Returns true when token is missing (dev mode) to avoid blocking.
 */
export function validateTwilioRequest({
  url,
  params,
  signature,
}: {
  url: string;
  params: Record<string, string>;
  signature: string | null;
}): boolean {
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!token) {
    logger.warn("TWILIO_AUTH_TOKEN not set — skipping Twilio signature validation (dev mode).");
    return true;
  }
  if (!signature) {
    logger.error("Missing x-twilio-signature header.");
    return false;
  }
  try {
    const ok = twilio.validateRequest(token, signature, url, params);
    if (!ok) logger.error("Invalid Twilio signature for URL:", url);
    return ok;
  } catch (e) {
    logger.error("Twilio signature validation error:", e);
    return false;
  }
}

export function getTwilioClient(): Twilio | null {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) {
    logger.warn("Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN — not creating Twilio client.");
    return null;
  }
  return twilio(sid, token);
}
