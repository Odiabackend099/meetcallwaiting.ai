# Callwaiting AI – Mock TTS Gateway + Twilio Voice Webhooks (Patch)

This patch **adds** a minimal, production-friendly mock TTS endpoint and Twilio Voice webhook routes
**without changing your existing file structure**. Unzip this into your project root and it will **only add** files.

## What’s included

- `app/api/tts/route.ts` — **Mock TTS Gateway** (Next.js API route). Returns speech audio.
  - If `TTS_GATEWAY_URL` is set, it proxies to your real TTS gateway (`GET /synthesize?text=...`).
  - Otherwise, it serves a bundled demo WAV so Twilio can `<Play>` something immediately.
- `app/api/webhooks/twilio/voice/route.ts` — Voice webhook returning TwiML with `<Play>` pointing to `/api/tts`.
- `app/api/webhooks/twilio/sms/route.ts` — Basic inbound SMS handler (echo).
- `app/api/webhooks/twilio/status/route.ts` — Call status callback receiver (logs only).
- `lib/twilio.ts` — Twilio helpers: signature validation + client factory.
- `lib/logger.ts` — Tiny logger utility.
- `public/audio/demo-voice.wav` — Demo audio used by the mock TTS when no real gateway is configured.
- `.env.example.patch` — Add-only env vars for this patch.

> We **do not modify** current files. If any of the paths already exist in your app, please diff & merge.

## Setup

1) Add the new env keys (see `.env.example.patch`) to your real `.env.local` (or equivalent).
2) Install dependency (if not already):
   ```bash
   npm i twilio
   ```
3) Run locally:
   ```bash
   npm run dev
   ```
4) Expose it (local dev) and configure Twilio voice webhook to:
   ```
   https://YOUR-NGROK.ngrok.io/api/webhooks/twilio/voice
   ```

## Verify

- Visit `http://localhost:3000/api/tts?text=Hello%20from%20Callwaiting%20AI` → you should download/play audio.
- `POST` a Twilio-style form to `/api/webhooks/twilio/voice` or call your Twilio number to hear the mock TTS.

## Best practice notes

- Always return **absolute HTTPS URLs** in TwiML `<Play>` so Twilio can fetch the media.
- Keep `<Say>` as a short **fallback** (fast + resilient) and use `<Play>` for your custom TTS audio.
- When you cut over to your real TTS, just set `TTS_GATEWAY_URL`. No code changes required.

