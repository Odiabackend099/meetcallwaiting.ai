# API

## Endpoints
- `GET /health` — liveness.
- `POST /ivr/handle` — Twilio Studio HTTP Request target.
- `POST /webhooks/twilio/voice` — optional direct TwiML endpoint (signature verified).
- `POST /webhooks/stripe` — Stripe webhook; verify signature; idempotent updates.
- `POST /bookings/create` — create appointment (Calendly/Google).
- `POST /orders/create` — create order and Payment Link.
- `POST /notify/send` — send SMS/Email via Twilio/SendGrid.

## Conventions
- Every request logs a `x-request-id`.
- No PII in logs; phone numbers masked `***####`.
- Idempotency via `Idempotency-Key` header on mutating routes.
