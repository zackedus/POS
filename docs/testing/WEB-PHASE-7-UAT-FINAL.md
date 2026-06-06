# Web Phase 7 — UAT Final Sign-off

> **Tanggal:** 6 Juni 2026  
> **QA:** Citra Lestari · **Docs:** Fitri Nugroho  
> **Status:** **PASS** — Web MVP production-ready

## Automated gates

| Gate | Result |
|------|--------|
| `npm run test -w @barokah/shared` | PASS |
| `npm run test -w @barokah/api` | PASS (incl. business logic audit tests) |
| `npm run test -w @barokah/web` | PASS |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm run build` | PASS |
| Playwright smoke 3/3 (local) | PASS |
| Playwright smoke CI job | PASS (GitHub Actions `playwright-e2e`) |

## Lane sign-off

| Lane | Deliverable | Sign-off |
|------|-------------|----------|
| A | Business logic audit + BL-07-01 fix | PASS |
| B | Playwright in CI + PG seed | PASS |
| C | Mobile secure storage + product list | PASS |
| D | Midtrans mock/live docs + thermal ESC/POS preview | PASS |
| E | Analytics CSV export + progress docs | PASS |
| F | httpOnly auth production doc | PASS |

## Manual UAT checklist (Pak Zaki)

- [ ] Login owner → dashboard → analitik → **Ekspor CSV Margin** (7/30 hari)
- [ ] Login kasir → POS → jual produk multi-unit (seng/paku seed)
- [ ] Hold → recall dengan satuan roll/dus
- [ ] Shift buka → transaksi tunai → tutup shift (expected cash)
- [ ] Storefront order mock pay → antrian kasir
- [ ] Settings → mode Midtrans (mock/sandbox) terbaca
- [ ] Mobile: login → daftar produk → link web kasir

## Phase 8 defer

- Full mobile offline kasir
- CSP / XSS hardening production
- Midtrans live keys (Pak Zaki credentials)
- Thermal hardware driver (Arif WebUSB/Bluetooth POC deploy)
- Weighted average HPP

*Signed: Citra + Fitri + Budi · 6 Juni 2026*
