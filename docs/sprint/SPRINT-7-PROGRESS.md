> 📚 [Indeks Dokumentasi](../INDEX.md) | Kategori: Sprint | Audience: Pak Zaki, Hendra, Fajar, Dimas, Arif, Fitri

# Sprint 7 — Progress Report (Final)

> **Tanggal update:** 2 Juni 2026  
> **Orchestrator:** Budi Santoso (CEO)  
> **Jalur:** Backend + Integrasi + Frontend + dokumentasi

---

## Status Ringkas Sprint 7

| Jalur | Progress | Status |
|---|---|---|
| Backend / Integrasi | 100% | **CLOSED** |
| Frontend / UX kasir | 100% | **CLOSED** |
| UAT final | 100% | **CLOSED** |

- **Scope produk aman:** tidak ada perubahan scope retail omnichannel (ADR-003 tetap).

---

## Deliverables Backend / Integrasi

### 1) Outlet-level bundle policy dengan validasi aman

- Model + migrasi: `product_bundle_outlet_policies`.
- Endpoint: `POST /api/v1/products/bundles/outlet-policy`.
- Validasi: outlet wajib valid milik tenant; bundle harus sudah terdaftar.
- `GET /api/v1/products/bundles` mengembalikan policy outlet per bundle.

### 2) E2E reliability flow backend

- Checkout bundle memilih policy efektif per outlet (override → fallback tenant-level).
- Idempotensi `clientRequestId` dipertahankan pada `checkout-cash` / `checkout-split`.
- Konversi satuan tetap kompatibel (tanpa regresi Sprint 6).

### 3) Gateway-level error mapping dasar

- Prefix `GW_` pada referensi non-cash split payment:
  - `GW_TIMEOUT` → `PAYMENT_TIMEOUT`
  - `GW_UNAVAILABLE` → `EXTERNAL_SERVICE_UNAVAILABLE`
  - `GW_*` lainnya → `PAYMENT_GATEWAY_ERROR`

### 4) Test kritikal backend

- Validasi outlet policy tenant safety (`CatalogService`).
- Outlet policy `isActive=false` → deduction stok SKU bundle langsung.
- Mapping `GW_TIMEOUT` → `PAYMENT_TIMEOUT` (`TransactionsService`).

---

## Deliverables Frontend

- Halaman `/pos` menampilkan metadata policy bundle (outlet vs tenant, behavior, pesan).
- Ringkasan sinkron policy di area katalog kasir.
- Fallback aman saat metadata policy tidak ada (UI tetap stabil).
- Pesan error split payment termapping ke copy operasional (mis. duplikat metode).
- Test web `/pos` mencakup skenario policy + error mapping.

---

## Endpoint / Flow Siap Uji

- `POST /api/v1/products/bundles`
- `POST /api/v1/products/bundles/outlet-policy`
- `GET /api/v1/products/bundles`
- `POST /api/v1/products/unit-conversions`
- `POST /api/v1/products/unit-conversions/convert`
- `POST /api/v1/transactions/checkout-split`

---

## Hasil Verifikasi Final (Re-run 2 Juni 2026)

| Command | API | Web |
|---|---|---|
| lint | ✅ | ✅ |
| typecheck | ✅ | ✅ |
| test | ✅ 33/33 | ✅ 19/19 |
| build | ✅ | ✅ |
| `npm run db:generate` | ✅ | — |

UAT final: [SPRINT-7-UAT-FINAL.md](../testing/SPRINT-7-UAT-FINAL.md).

---

## URL Uji (Dev)

| Layar | URL |
|---|---|
| Login | http://localhost:3001/login |
| Kasir | http://localhost:3001/pos |
| Master Produk | http://localhost:3001/master/products |
| Health API | http://localhost:3000/api/v1/health |

---

## Blocker yang Diselesaikan

| Blocker | Resolusi |
|---|---|
| `npm run db:generate` EPERM lock `query_engine-windows.dll.node` | Hentikan proses `node.exe` dari instalasi Node.js (`C:\Program Files\nodejs\`) yang memegang engine; generate ulang berhasil |

**Workaround jika EPERM muncul lagi:** tutup `npm run dev` API/web, jalankan `Get-Process node | Where-Object { $_.Path -like '*\nodejs\*' } | Stop-Process -Force`, lalu `npm run db:generate`. Jangan commit file engine di `.prisma/client/`.

---

## Risiko Tersisa (Non-Blocking)

- E2E browser lintas app penuh belum diaktifkan (reliability test API + unit/integration web).
- Gateway mapping masih level prefix simulasi, belum adaptor payment gateway produksi.
- Warning konfigurasi Next.js ESLint plugin saat build web.
