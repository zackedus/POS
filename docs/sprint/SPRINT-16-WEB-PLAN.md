> 📚 [Indeks Dokumentasi](../INDEX.md) | Kategori: Sprint Plan | Audience: Pak Zaki, Budi, Hendra, Dimas, Citra

# Sprint 16 Web Plan — Omnichannel Hardening + Admin Polish

> **Periode:** 6–20 Juni 2026  
> **Status:** **CLOSED** (6 Juni 2026 — UAT mock-only Midtrans per keputusan Pak Zaki)  
> **Orchestrator:** Budi Santoso (CEO)  
> **Carry-over:** [SPRINT-15-WEB-PROGRESS.md](./SPRINT-15-WEB-PROGRESS.md)  
> **UAT:** [SPRINT-16-UAT-FINAL.md](../testing/SPRINT-16-UAT-FINAL.md)  
> **Owner frontend:** Dimas Pratama · **Owner API:** Fajar Ramadhan

---

## Ringkasan Sprint

Sprint 16 web menutup defer Sprint 15 web: aktivasi delivery API end-to-end, admin `sellOnline`, rate limit storefront, dan hardening routing/auth.

| Prioritas | Deliverable | Owner | Status |
|-----------|-------------|-------|--------|
| **P0** | Delivery checkout E2E (API aktif + storefront wired) | Fajar + Dimas | ✅ |
| **P0** | Midtrans mock → PAID → kasir queue | Fajar + Dimas | ✅ |
| **P0** | Midtrans sandbox live smoke | Arif → Fajar | ⏸ Defer (kode siap; UAT live bukan gate close) |
| **P1** | Socket.io `online-order:paid` + toast kasir | Fajar + Dimas | ⏸ Defer Sprint 17 |
| **P1** | Owner UI `sellOnline` + gambar produk | Dimas + Bima | ✅ |
| **P1** | Rate limit storefront — error UI 429 | Fajar + Dimas | ✅ |
| **P2** | Middleware httpOnly cookie migration (prod) | Fajar + Yoga | ⏸ Defer |
| **P2** | Expo mobile storefront preview (opsional) | Dimas | ⏸ Defer |

---

## Milestone

| # | Milestone | Gate | Status |
|---|-----------|------|--------|
| S16-M1 | Sprint plan + test plan skeleton | Budi assign | ✅ |
| S16-M2 | Delivery API contract freeze | Fajar | ✅ |
| S16-M3 | Delivery checkout UAT + Midtrans mock | Citra | ✅ (mock-only) |
| S16-M4 | Admin katalog web + kasir polling | Maya approved UI | ✅ (Socket.io defer) |
| S16-M5 | Regression Epic J + offline PWA | Citra | ✅ |

---

## Acceptance Criteria — Web

### Delivery checkout (US-J-05)
- [x] Storefront tab Delivery submit sukses ke API (bukan stub error)
- [x] Form alamat + ongkir flat/refleksi API `shippingFee` (Rp25.000)
- [x] Order success menampilkan label fulfillment Delivery

### Midtrans storefront (US-J-06)
- [x] Mock mode: redirect success + auto PAID via `mock-pay`
- [x] Live sandbox: Snap redirect saat `MIDTRANS_SERVER_KEY` terisi (kode)
- [x] UAT mock mode — **PASS** (gate sprint close)
- [ ] UAT live sandbox dengan credential Midtrans — **defer** (keputusan Pak Zaki)

### Rate limit storefront
- [x] `POST /orders` throttle 10/menit per IP + slug
- [x] Storefront UI pesan 429 Bahasa Indonesia
- [ ] Badge `/pos` update real-time saat order PAID — **defer** (infra Socket.io)
- [x] Toast non-blocking di kasir; fallback polling 15s tetap ada

### Admin katalog web
- [x] Toggle `sellOnline`, upload/paste `imageUrl`
- [x] Preview tercermin di `GET /store/:slug/catalog/products`

### Routing & auth (carry-over Sprint 15 pass 2)
- [x] Redirect `/dashboard/categories` → `/master/categories`
- [x] Redirect `/dashboard/bundles` → `/master/bundles`
- [x] Middleware cookie session + `not-found` role-aware
- [ ] E2E test middleware redirect tanpa cookie — defer Sprint 17

---

## Defer (Post Sprint 16 Close)

| Item | Target |
|------|--------|
| Midtrans sandbox Snap live UAT | Sprint 17+ |
| Socket.io `online-order:paid` real-time | Sprint 17 |
| E2E middleware redirect test | Sprint 17 |
| CAPTCHA guest checkout | Backlog P1 |
| Multi-outlet storefront picker advanced | Sprint 17+ |
| httpOnly cookie production migration | Prod deploy |

---

## Parallel Lane (post contract freeze)

| Lane | Lead | Implement | Gate |
|------|------|-----------|------|
| Backend delivery + rate limit | **Fajar** | **Andi** | Fajar PR ✅ |
| Frontend delivery E2E + admin + kasir polling | **Dimas** | **Bima** | Maya wireframe ✅ |
| QA | **Citra** | — | UAT PASS ✅ |

**Parallel OK?** Ya — setelah S16-M2 delivery API freeze.

---

## Verifikasi Final

| Perintah | Hasil |
|----------|-------|
| `npm run test -w @barokah/api` | ✅ 117/117 |
| `npm run test -w @barokah/web` | ✅ 97/97 |
| `npm run typecheck` | ✅ 9/9 |

---

*Disusun: Dimas Pratama (Senior Frontend) · 6 Juni 2026 · UAT sign-off: Citra · Sprint close: Budi*
