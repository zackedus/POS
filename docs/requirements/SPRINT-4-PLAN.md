> 📚 [Indeks Dokumentasi](../INDEX.md) | Kategori: Requirements | Audience: Pak Zaki, Hendra, Fajar, Dimas, Fitri

# Sprint 4 Plan — Stabilization + Payment Expansion

> **Sprint Master:** Hendra Pratama  
> **Periode:** Setelah penutupan Sprint 3  
> **Mengikuti:** [SPRINT-3-CLOSURE.md](../sprint/SPRINT-3-CLOSURE.md), [SPRINT-3-PROGRESS.md](../sprint/SPRINT-3-PROGRESS.md)

## Tujuan Sprint 4

> **"Menguatkan reliability operasional kasir dari baseline Sprint 3, merapikan kualitas build frontend, dan menyiapkan ekspansi metode split payment tanpa mengubah scope produk retail."**

## Prioritas Top 3 (Handoff dari Sprint 3)

1. Rapikan konfigurasi ESLint Next.js plugin di web sampai warning build hilang.
2. Ekspansi split payment bertahap (QRIS/e-wallet/card) beserta contract error map.
3. Tambah e2e reliability untuk hold/recall/split pada kasus concurrency dan gangguan jaringan intermittent.

## Scope Awal (Draft)

### In Scope ✅

- Hardening kualitas frontend build/lint untuk baseline CI yang bersih.
- Enhancement kontrak API payment untuk multi-metode (tetap tenant/outlet scoped).
- Test e2e prioritas operasional kasir:
  - hold/recall saat stok berubah
  - split payment gagal/retry
  - scenario race condition sederhana antar kasir

### Out of Scope ❌

- Perubahan domain produk di luar retail POS.
- Integrasi enterprise (accounting/marketplace).
- Perubahan arsitektur besar di luar kebutuhan hardening Sprint 4.

## Risiko Awal & Mitigasi

| Risiko | Mitigasi |
|---|---|
| Scope split payment melebar terlalu cepat | Lock fase metode pembayaran per milestone |
| Flaky test e2e di environment lokal | Standarisasi test data + retry strategy terbatas |
| Delay sinkron API contract web/api | Contract freeze awal sprint oleh Fajar sebelum implementasi UI |

## Exit Criteria Sprint 4 (Draft)

- Warning lint/build web terkait plugin Next.js tidak muncul lagi.
- Minimal satu metode split payment tambahan terimplementasi end-to-end dengan test memadai.
- E2E reliability suite inti untuk hold/recall/split lulus stabil pada rerun.

## Status Eksekusi Terkini (Update 2 Juni 2026, Gabungan)

- **Frontend progress:** 96%
  - lint/typecheck/test/build web sudah lulus
  - warning plugin Next.js ESLint masih tersisa (non-blocking, carry-over Sprint 5)
  - konsumsi kontrak response split payment frontend sudah sinkron ke format `payments`
- **Backend progress:** 94%
  - split payment API sudah diperluas (`CASH`, `TRANSFER`, `QRIS`, `E_WALLET`, `CARD`)
  - guard reliability recall concurrency + retry-safe split sudah aktif
  - lint/typecheck/test/build API lulus (`test` 20/20)
- **Progress gabungan Sprint 4:** 95%
- **Status sprint saat ini:** close-ready (siap ditutup dengan carry-over non-blocking)

## Checklist Eksekusi Frontend Sprint 4 (Update 2 Juni 2026)

- [x] UI split payment diperkuat dengan validasi nominal dan status metode aktif/nonaktif.
- [x] Feedback operasional kasir berbahasa Indonesia untuk gagal/retry/recovery.
- [x] Test frontend jalur sukses + edge-case split/hold/recall ditambah.
- [x] Verifikasi area web (`lint`, `typecheck`, `test`, `build`) dijalankan.
- [x] Kontrak backend untuk aktivasi metode tambahan (QRIS/e-wallet/card) difinalkan.
- [x] Konsumsi response split checkout frontend disesuaikan ke map `payments` dari backend.

## Checklist Eksekusi Backend Sprint 4 (Update 2 Juni 2026)

- [x] Ekspansi `checkout-split` ke metode `QRIS`, `E_WALLET`, `CARD` + validasi rekonsiliasi.
- [x] Error mapping backend untuk invalid split distandarkan (`INVALID_INPUT`, `CONFLICT` sesuai kasus).
- [x] Guard reliability hold/recall/split untuk concurrency/intermittent case ditambahkan.
- [x] Penambahan test backend kritikal untuk split expansion + recall concurrency.
- [x] Penambahan test retry serializable conflict (`P2034`) untuk reliability guard.
- [x] Verifikasi area API (`lint`, `typecheck`, `test`, `build`) dijalankan dan lulus.
- [ ] E2E reliability lintas layer (web + api) untuk intermittent network diselesaikan stabil.

## Keputusan Penutupan Sprint 4

- **Status:** Close-ready
- **Dokumen closure:** [SPRINT-4-CLOSURE.md](../sprint/SPRINT-4-CLOSURE.md)
- **Carry-over Sprint 5 (non-blocking):**
  1. Cleanup warning plugin ESLint Next.js saat `next build`.
  2. E2E lintas layer intermittent network untuk hold/recall/split.
  3. Aktivasi dan verifikasi mapping error gateway-level.

---

*Draft awal untuk sinkronisasi planning pasca-closure Sprint 3. Detail task/SP final ditetapkan Hendra pada sesi planning resmi Sprint 4.*
