> 📚 [Indeks Dokumentasi](../INDEX.md) | Kategori: Rapat | Audience: Pak Zaki, Fajar, Hendra, Dewi

# Gap Analysis — Visi Pak Zaki vs State Proyek

> **Tanggal:** 1 Juni 2026  
> **Sumber visi:** [`.cursor/dokument rencana zaki.md`](../../.cursor/dokument%20rencana%20zaki.md)  
> **Baseline proyek:** Kickoff 1 Jun 2026, Prisma MVP schema, [FEATURE-BACKLOG](../requirements/FEATURE-BACKLOG.md)  
> **Visi matang:** [VISION-ZAKI-MATURED.md](../requirements/VISION-ZAKI-MATURED.md)

---

## Legenda Status

| Status | Arti |
|--------|------|
| ✅ **Ada** | Sudah di backlog/schema/kickoff MVP |
| 🟡 **Partial** | Konsep ada, implementasi tidak lengkap vs visi |
| 🔴 **Gap** | Belum direncanakan atau belum ada di schema |
| ⏸️ **Ditunda** | Sengaja Won't MVP / fase berikutnya |

---

## Tabel per Section Dokumen Pak Zaki

| § | Topik | Visi Pak Zaki | State proyek saat ini | Status | Fase target | Owner |
|---|-------|---------------|----------------------|--------|-------------|-------|
| — | Arsitektur | Next.js + Expo + **Supabase** + pnpm | NestJS + Prisma + PG + **npm** | 🟡 | Tetap stack proyek | Fajar |
| 1.1 | Produk induk | Parent + `has_variants`, `is_bundle` | `products` flat | 🟡 | P0 flat / P2 varian | Fajar |
| 1.2 | Multi varian SKU | attributes, values, product_skus | Tidak ada tabel | 🔴 | **Fase 2 Sprint 5** (Q6 varian dulu) | Fajar |
| 1.3 | Multi satuan jual | sku_units + conversion | Satu `unit_id` per produk | 🔴 | Fase 2 | Eko + Fajar |
| 1.4 | Bundling atomik | bundle_items, RPC sell | Tidak ada | 🔴 | **Fase 2 Sprint 6+** (setelah varian) | Eko + Fajar |
| 1.5 | Kategori nested | Tree + drag sort | `categories.parent_id` ada, UI 1 level MVP | 🟡 | P0 flat / P2 nested UI | Maya |
| 1.6 | Fuzzy search | pg_trgm / Fuse <300ms | Search exact + barcode MVP | 🔴 | P1 | Fajar |
| 2.1 | Multi stok lokasi | 4 tipe lokasi per SKU | `inventory_items` per outlet | 🟡 | P0 1 outlet / F2 multi | Fajar |
| 2.2 | Transfer stok | pending → transit → received | Enum movement ada, workflow tidak | 🔴 | Fase 2 | Fajar |
| 2.3 | Alert stok min | Push + email + WA | Tidak ada | 🔴 | P1 in-app / F2 WA | Arif |
| 2.4 | Opname digital | Sesi scan + adjust | Tidak ada | 🔴 | Fase 2 | Rina |
| 2.5 | Riwayat mutasi | stock_mutations lengkap | `stock_movements` ✅ | ✅ | MVP | Fajar |
| 2.6 | Prediksi AI stok | ML reorder | Tidak ada | 🔴 | Fase 3 | Eko |
| 3.1 | Keranjang dinamis | Item note, diskon item | Keranjang qty +/- MVP | 🟡 | P0 cart / F2 diskon item | Maya |
| 3.2 | Hold & recall | Unlimited hold | Hold TTL 30m Sprint 4 | ✅ | P0 — **TTL 30m dikonfirmasi Pak Zaki (Q2)** | Dewi |
| 3.3 | Split payment | Multi metode | Sprint 4 P0 | ✅ | MVP S4 | Arif |
| 3.4 | Diskon transaksi + PIN | Role limits | Won't MVP kickoff | ⏸️ | Fase 2 | Eko |
| 3.5 | Voucher | Multi tipe | Tidak ada | 🔴 | Fase 2 | Eko |
| 3.6 | Promo terjadwal | Cron happy hour | `promo_rules` minimal | 🔴 | Fase 2 | Eko |
| 3.7 | Void/refund window | 30 menit configurable | P1 post-MVP | ⏸️ | P1 | Fajar |
| 3.8 | Validasi real-time | Rugi, stok, diskon | Sebagian di AC checkout | 🟡 | P0 partial | Fajar |
| 3.9 | Catatan transaksi | Order notes | Field bisa ditambah | 🟡 | P0 | Dewi |
| 4.1 | QRIS terpadu | Webhook auto | Midtrans Sprint 4 | ✅ | MVP S4 | Arif |
| 4.2 | EDC kartu | NFC/chip/cicilan | Tidak ada | 🔴 | Fase 2 | Arif |
| 4.3 | Kembalian otomatis | Numpad cash | Sprint 3 | ✅ | MVP S3 | Maya |
| 4.4 | Bayar poin | Loyalty payment | Tidak ada | 🔴 | Fase 2 | Eko |
| 4.5 | Rekap metode bayar | Per shift | Tutup shift Sprint 4 | ✅ | MVP S4 | Rina |
| 5.1 | CRM lite | customers table | Tidak ada | 🔴 | P1/F2 | Dewi |
| 5.2 | Poin loyalitas | loyalty_points | Tidak ada | 🔴 | Fase 2 | Eko |
| 5.3 | Segmentasi | Auto segments | Tidak ada | 🔴 | Fase 2 | Eko |
| 5.4 | Broadcast WA promo | Template + jadwal | Tidak ada | 🔴 | Fase 2 | Arif |
| 5.5 | Struk digital WA/email | Auto kirim | PDF/preview MVP | 🟡 | P0 preview / F2 kirim | Arif |
| 6.1 | Laporan penjualan | Trend, perbandingan | Harian MVP | 🟡 | P0 harian / F2 trend | Rina |
| 6.2 | Terlaris vs paling untung | Dual ranking | Tidak ada | 🔴 | Fase 2 | Eko |
| 6.3 | Kinerja kasir | Void, diskon metrics | Tidak ada | 🔴 | Fase 2 | Rina |
| 6.4 | Laporan stok nilai Rp | Kartu stok | Movements only MVP | 🟡 | Fase 2 | Fajar |
| 6.5 | Laba kotor | HPP × qty | Conditional Sprint 4 | ✅ | MVP S4 | Rina |
| 6.6 | Dashboard real-time | Owner mobile | Socket.io rencana | 🔴 | Fase 2 | Dimas |
| 6.7 | Export + jadwal WA | xlsx/pdf scheduled | Tidak ada | 🔴 | F2–F3 | Fitri |
| 7.1 | RBAC 4 role | Kasir/Supervisor/Owner/Admin | Owner/Manager/Cashier | 🟡 | P0 map Manager=Supervisor | Fajar |
| 7.2 | PIN/biometrik | Expo LocalAuth | Tidak ada | 🔴 | Fase 2 | Dimas |
| 7.3 | Audit trail | audit_logs | ✅ schema | ✅ | MVP S4 | Fajar |
| 7.4 | Deteksi anomali | Pattern alerts | Tidak ada | 🔴 | Fase 3 | Eko |
| 7.5 | Session timeout | 5 menit lock | Tidak ada | 🔴 | Fase 2 | Dimas |
| 7.6 | Backup cloud | Supabase PITR 90d | PG backup Yoga | 🟡 | P0 staging / prod S4 | Yoga |
| 8.1 | Open/close shift | Full wizard | Sprint 2–4 | ✅ | MVP | Fajar |
| 8.2 | Offline penuh | SQLite queue / PWA | Won't MVP | ⏸️ | **Fase 2** — PWA prioritas, Expo opsional (ADR-003) | Dimas |
| — | Penjualan online web | Storefront + order sync | Tidak ada | 🔴 | **Fase 2** (ADR-003) | Dimas + Fajar |
| 8.3 | Multi cabang | Pusat + per cabang | 1 outlet MVP | 🟡 | P0 1 / F2 multi | Fajar |
| 8.4 | Struk thermal | Bluetooth/USB | Sprint 4 | ✅ | MVP S4 | Arif |
| 8.5 | Meja & antrian | Grid meja F&B | Tidak ada | ❌ **OUT OF SCOPE** | **CANCELLED** — ADR-003 | — |
| 8.6 | KDS | Dapur real-time | Tidak ada | ❌ **OUT OF SCOPE** | **CANCELLED** — ADR-003 | — |
| 9.1 | WhatsApp API | Terpusat | Tidak ada | 🔴 | Fase 2 | Arif |
| 9.2 | E-commerce sync | Tokopedia/Shopee | Fase 3 roadmap | ⏸️ | Fase 3 | Arif |
| 9.3 | Akuntansi | Jurnal/Accurate | Fase 3 roadmap | ⏸️ | Fase 3 | Arif |
| 9.4 | PO Supplier | Full workflow | Supplier master Could S2 | 🟡 | Fase 2 | Rina |
| 10.1 | Layout per role | Guided vs pro | Single layout MVP | 🟡 | F2 | Maya |
| 10.2 | Numpad cepat | USB numpad | Wireframe SCR-K01 | ✅ | MVP S3 | Maya |
| 10.3 | Grid gambar | Tap add | Sprint 2–3 | ✅ | MVP | Maya |
| 10.4 | Shortcut favorit | Pin terlaris | Tidak ada | 🔴 | P1–P2 | Maya |
| 10.5 | Indikator sync | Offline banner | Tidak ada | 🔴 | Fase 2 | Dimas |

---

## Pertanyaan Terbuka — ✅ Ditutup (1 Juni 2026)

Semua pertanyaan di [VISION-ZAKI-MATURED.md](../requirements/VISION-ZAKI-MATURED.md) § Open Questions telah dijawab Pak Zaki. Ringkasan:

| # | Jawaban singkat | ADR |
|---|-----------------|-----|
| Q1 | Retail bahan bangunan | [ADR-002](../decisions/ADR-002-PAK-ZAKI-CONFIRMATIONS.md) |
| Q2 | Hold TTL 30 menit | ADR-002 |
| Q3 | Web kasir MVP; Expo Fase 2 | ADR-002 |
| Q4 | Satu paket MVP | ADR-002 |
| Q5 | NestJS + Prisma | ADR-002 |
| Q6 | Varian sebelum bundling (minggu 9–10) | ADR-002 |
| ADR-003 | Retail + online web + offline toko; **tanpa F&B** | [ADR-003](../decisions/ADR-003-SCOPE-RETAIL-ONLINE-OFFLINE.md) |

**Lampiran jawaban lengkap:** [2026-06-01-VISION-ZAKI-DISCUSSION.md](./2026-06-01-VISION-ZAKI-DISCUSSION.md) § Lampiran A & C.

---

## Ringkasan Gap per Prioritas

| Prioritas | Jumlah item gap 🔴/🟡 utama | Aksi |
|-----------|----------------------------|------|
| **P0 MVP** | 12 🟡 partial — cukup untuk demo kasir 1 outlet | Lanjut Sprint 1–4 |
| **P1** | Fuzzy search, CRM field, void, favorit | Backlog post-MVP |
| **P2** | ~25 fitur (varian, stok lanjutan, loyalty, promo, WA, offline) | Epic F2 di backlog |
| **P3** | AI, marketplace, accounting, anomali — **tanpa F&B** | Epic K |
| **OUT OF SCOPE** | F&B, meja, KDS (permanen) | ADR-003 — tidak di backlog |

---

## Schema Gap (Prisma MVP → Visi Lengkap)

| Tabel visi Pak Zaki | Prisma MVP | Aksi migrasi |
|---------------------|------------|--------------|
| `product_attributes` | — | Add Fase 2 |
| `attribute_values` | — | Add Fase 2 |
| `product_skus` | — | Add Fase 2 |
| `sku_units` | `units` (global) | Add Fase 2 |
| `bundle_items` | — | Add Fase 2 |
| `locations` (multi-type) | `outlets` | Extend `outlet.type` F2 |
| `sku_stock` | `inventory_items` | Equivalent MVP |
| `stock_transfers` | — | Add Fase 2 |
| `customers` | — | Add Fase 2 |
| `loyalty_points` | — | Add Fase 2 |
| `vouchers` | — | Add Fase 2 |
| `promotions` | `promo_rules` (minimal) | Extend F2 |
| `transactions` | ✅ | — |
| `audit_logs` | ✅ | — |

---

## Kesimpulan

Visi Pak Zaki **~85% selaras secara bisnis** dengan arah Barokah Core; gap terbesar di **implementasi fase** dan **kedalaman schema** (varian, bundle, loyalty), bukan di arah produk. MVP kickoff tetap valid sebagai **Fase 1** dari visi matang. Tidak ada rekomendasi reset proyek — hanya perluasan backlog terkontrol.

---

*Maintainer: Fitri Nugroho · 1 Juni 2026 · Diperbarui: ADR-003 — F&B OUT OF SCOPE, gap online web Fase 2*
