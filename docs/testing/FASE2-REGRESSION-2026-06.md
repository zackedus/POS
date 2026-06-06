# Fase 2 Regression — Juni 2026

> **Owner:** Citra Lestari (QA) · **Scope:** Growth milestone lanes A–G

## Automated

| Suite | Command | Coverage |
|-------|---------|----------|
| API unit | `npm run test --workspace=@barokah/api` | Customers, online orders, promo stacking, sync |
| Shared | `npm run test --workspace=@barokah/shared` | `pickBestPromo` anti-stack |
| Playwright | `npm run test:e2e` | Smoke + Phase 8 + Fase 2 online fulfill |

## Playwright — Fase 2 online order

File: `e2e/fase2-online-order.spec.ts`

1. Storefront slug `barokah-bangunan` — create order via API mock pay
2. Kasir login — buka `/pos/online-orders`
3. Assert order muncul di antrian fulfillment

**CI:** set `PLAYWRIGHT_SKIP_WEBSERVER=1` jika stack sudah jalan; API di `PLAYWRIGHT_API_URL`.

## Manual UAT checklist

- [ ] Checkout storefront → mock pay → stok berkurang di dashboard inventory
- [ ] Kasir fulfill PAID → READY → COMPLETED tanpa double movement
- [ ] POS walk-in dengan nama+HP → customer tercatat (`GET /customers`)
- [ ] Promo kategori — hanya line kategori terdiskon
- [ ] Offline enqueue → online replay — tidak double receipt
- [ ] QRIS mock — satu transaksi, satu SALE movement

## Sign-off

| Role | Nama | Status |
|------|------|--------|
| QA | Citra | ✅ Regression doc + e2e |
| Domain | Rina | ✅ Audit Fase 2 |
| Algo | Eko | ✅ Promo + stok policy |
| Backend | Fajar | ✅ API lanes B–D |
| Frontend | Dimas | ✅ POS customer + storefront |

*7 Juni 2026*
