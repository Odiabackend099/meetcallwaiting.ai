# Architecture (Phase 1)

- **Twilio → API**: inbound calls hit Studio Flow → HTTP Request Widget → `POST /ivr/handle`.
- **API** performs: caller intent capture (DTMF/speech text), creates **order/appointment**, calls **Stripe** for Payment Links, calls **Calendar** for booking, sends **SMS/Email**.
- **TTS Gateway** provides `/v1/tts:synthesize` and `/v1/tts:stream` (stub). Engines pluggable (Riva/CosyVoice/Piper).
- **n8n** orchestrates merchant onboarding, stripe webhooks, unpaid reminders.
- **Supabase** stores merchants, orders, appointments, consents, events.
