# Midtrans Integration — Phase 8

> **Arif** · Integration Specialist · 6 Juni 2026

## Test connection (sandbox)

- **UI:** Dashboard → Settings → **Uji Koneksi Midtrans**
- **API:** `POST /api/v1/settings/tenant/midtrans/test` (OWNER)
- Mock mode (tanpa server key): returns OK dengan pesan mock
- Sandbox/live: ping `GET /v2/ping` Midtrans API

## Webhook health

- **Public:** `GET /api/v1/webhooks/midtrans/online/health`
- **Authenticated:** `GET /api/v1/settings/tenant/midtrans/webhook-health`
- Response: `endpoint`, `mockMode`, `signatureVerification`

## Defer Phase 9

- Live production server key (Pak Zaki)
- IP allowlist Midtrans production webhook
