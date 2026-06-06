# Production Deployment — Barokah Core POS

> **Owner:** Yoga (DevOps) + Fajar (API) · **Tanggal:** 6 Juni 2026

## Environment Variables (Production)

| Variable | Wajib | Catatan |
|----------|-------|---------|
| `NODE_ENV` | Ya | `production` |
| `JWT_SECRET` | Ya | Secret kuat, bukan default dev |
| `JWT_REFRESH_SECRET` | Ya | Terpisah dari access secret |
| `DATABASE_URL` | Ya | PostgreSQL connection string |
| `REDIS_URL` | Disarankan | BullMQ sync replay + queue |
| `MIDTRANS_SERVER_KEY` | Jika live | Sandbox/live key Midtrans |
| `MIDTRANS_IS_PRODUCTION` | Jika live | `true` untuk gateway produksi |
| `SMTP_HOST` | Opsional | Laporan mingguan email; tanpa ini = log console |
| `ANALYTICS_EMAIL_CRON` | Opsional | Default `true`; set `false` untuk matikan scheduler |

## API Startup Guardrails

Saat `NODE_ENV=production`, API **warn** (tidak crash) jika:

- `MIDTRANS_IS_PRODUCTION=true` tanpa `MIDTRANS_SERVER_KEY`
- `JWT_SECRET` lemah / default
- `SMTP_HOST` tidak diset (email mock console)

Implementasi: `apps/api/src/config/production-startup.util.ts`

## Next.js CSP (Production)

Header otomatis di `apps/web/next.config.js` saat `NODE_ENV=production`:

- `Content-Security-Policy` — default-src self, connect-src API
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`

## Secure Cookies (httpOnly Auth)

Production web auth via BFF routes:

- `/api/auth/login` — set httpOnly cookies
- `/api/auth/refresh` — rotate tokens
- `/api/auth/logout` — clear cookies

Detail: `docs/testing/HTTPONLY-AUTH-PRODUCTION.md`

Flags yang disarankan di reverse proxy:

- `Secure` — HTTPS only
- `HttpOnly` — no JS access
- `SameSite=Lax` — CSRF mitigation

## Deploy Checklist

1. `npm run db:migrate:deploy`
2. Set env production (lihat tabel di atas)
3. `npm run build`
4. Smoke: `npm run smoke`
5. Sign-off: Yoga + Fajar + Fitri + Citra

## Midtrans Live (Pak Zaki)

Lihat `docs/integration/MIDTRANS-LIVE-PRODUCTION.md` — kredensial live **belum** disertakan; infra siap dengan mock fallback.

*Standar Phase 10 — Yoga + Fajar*
