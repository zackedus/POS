# Phase 8 — Regression Checklist

> **Owner:** Citra Lestari (QA) + Yoga Permana (CI)  
> **Tanggal:** 6 Juni 2026

## Automated

| Suite | Command | Gate |
|-------|---------|------|
| Shared | `npm run test -w @barokah/shared` | P0 |
| API | `npm run test -w @barokah/api` | P0 |
| Web | `npm run test -w @barokah/web` | P0 |
| Typecheck | `npm run typecheck` | P0 |
| Lint | `npm run lint` | P0 |
| Build | `npm run build` | P0 |
| Playwright smoke | `npm run test:e2e -- e2e/smoke.spec.ts` | P1 |
| Playwright Phase 8 | `npm run test:e2e -- e2e/phase8-regression.spec.ts` | P1 best effort |

## Business logic regression (Lane A)

- [x] Split + promo + multi-unit cart (`BL-08-01`)
- [x] PPN toggle checkout (`BL-08-02`)
- [x] Void multi-unit stock restore (`BL-08-03`)
- [x] Shift close with held warning
- [x] Expense no stock side effect
- [x] PO partial receive + return (existing suite)

## Integration regression (Lane E)

- [x] Midtrans mock ping / test connection endpoint
- [x] Webhook health GET `/webhooks/midtrans/online/health`
- [x] WebUSB thermal stub unit tests

## Manual UAT (Pak Zaki)

Lihat `docs/testing/PHASE-8-UAT-FINAL.md`.
