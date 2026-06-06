# Pilot Go-Live Checklist — Toko Bahan Bangunan Pak Zaki

> 📚 [Indeks Dokumentasi](../INDEX.md) | Owner: **Yoga** · **Fitri** · **Budi**

Checklist langkah demi langkah sebelum operasional harian di toko fisik.

---

## Smoke staging (pre-flight)

Jalankan dari **root monorepo** (`barokah-pos`), **bukan** dari `packages/database`:

```powershell
cd "g:\\baru 2026\\juni\\pos"
npm run smoke:staging
# Dev lokal (API port 3000, tanpa Docker staging):
npm run smoke:dev
```

**Prasyarat:** API staging/dev sudah jalan (`smoke:staging` → port **3010**; `smoke:dev` → auto-detect **3000** lalu **3010**), DB migrate + seed.

| Variabel opsional | Default |
|-------------------|---------|
| `STAGING_API_URL` | `http://localhost:3010/api/v1` |
| `STAGING_SMOKE_EMAIL` | `kasir@barokah.local` |
| `STAGING_SMOKE_PASSWORD` | `Kasir123!` (dev seed) |
| `STAGING_TENANT_SLUG` | `barokah-bangunan` |

Skrip memeriksa: health, storefront outlets, login, `/auth/me`, daftar produk, shift aktif.

---

## 1. Infrastruktur (Yoga)

- [ ] PostgreSQL 16+ dan Redis 7+ running (Docker Compose staging/prod)
- [ ] Salin `.env.production.example` → `.env`, isi secret kuat (JWT, DB password)
- [ ] `npm run build` sukses di server staging
- [ ] `npm run smoke:staging` dari root repo → semua PASS (lihat bagian Smoke staging di atas)
- [ ] HTTPS aktif (reverse proxy nginx/Caddy)
- [ ] Backup DB otomatis harian dikonfigurasi

## 2. Master Data (Manager)

- [ ] Kategori produk (semen, cat, besi, dll.) lengkap
- [ ] Satuan dasar + multi satuan jual (kg/dus, m/roll) diuji
- [ ] Import CSV produk awal (`GET /products/import/template`)
- [ ] Stok awal per outlet diisi (via import atau adjust)
- [ ] Supplier master untuk PO

## 3. Pengaturan Tenant (Owner)

- [ ] Dashboard → **Settings**: PPN aktif/nonaktif sesuai kebutuhan PKP
- [ ] Loyalty earn: 1 poin / Rp 10.000 (default OK)
- [ ] Loyalty redeem: 1 poin = Rp 1.000, maks 50% total (default OK)
- [ ] Midtrans: sandbox key untuk uji online; live key **defer** sampai ready

## 4. Akun & RBAC

- [ ] Owner: Pak Zaki
- [ ] Manager: 1 akun (void approval, tutup shift paksa)
- [ ] Kasir: minimal 2 akun shift bergantian
- [ ] Uji login/logout + outlet scope

## 5. Shift & Kasir Harian

- [ ] Baca [KASIR-QUICK-START](./KASIR-QUICK-START.md)
- [ ] UAT: buka shift → transaksi tunai → hold/recall → void → tutup shift
- [ ] Rekonsiliasi kas: `expectedCash = opening + cashSales`
- [ ] Thermal printer: PDF fallback OK; WebUSB **stub** — defer hardware prod

## 6. Payment

- [ ] Tunai, transfer manual, split cash+transfer: PASS
- [ ] QRIS mock/sandbox: PASS di staging
- [ ] QRIS live + EDC: **defer** (butuh key Pak Zaki + hardware Arif)

## 7. Inventory & PO

- [ ] PO: draft → order → terima partial → HPP weighted average
- [ ] Retur PO partial
- [ ] Transfer stok antar cabang (jika multi-outlet)
- [ ] Opname scan SKU/barcode

## 8. Online (jika aktif Fase 2)

- [ ] Storefront `/store/[slug]` publik
- [ ] Order mock pay → stok deduct sekali → kasir fulfill
- [ ] Order expired TTL 60 menit

## 9. QA Sign-off (Citra)

- [ ] Regresi automated: `npm run test` → 411+ PASS
- [ ] Playwright smoke CI green
- [ ] [BUSINESS-LOGIC-E2E-VERIFICATION](../domain/BUSINESS-LOGIC-E2E-VERIFICATION-2026-06.md) reviewed

## 10. Go / No-Go (Budi → Pak Zaki)

| Kriteria | Wajib |
|----------|-------|
| P0 automated tests PASS | Ya |
| Shift + checkout + void PASS manual | Ya |
| Stok tidak double-deduct online | Ya |
| Midtrans live | Tidak (pilot mock/sandbox OK) |
| Thermal prod | Tidak (PDF OK) |
| Fase 3 enterprise | Tidak |

**Keputusan pilot:** ☐ GO ☐ NO-GO — tanggal: ___________
