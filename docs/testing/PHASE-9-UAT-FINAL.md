# Phase 9 UAT Final — Barokah Core POS

> **Tanggal:** 6 Juni 2026  
> **QA:** Citra Lestari · **Domain:** Rina Wulandari · **Docs:** Fitri Nugroho

## Ringkasan

| Lane | Area | Hasil UAT |
|------|------|-----------|
| A | Weighted average HPP | **PASS** |
| B | Offline conflict modal | **PASS** |
| C | Mobile shift + QRIS stub | **PASS** |
| D | Midtrans live guardrails | **PASS** (mock tanpa key Pak Zaki) |
| E | Thermal WebUSB + browser fallback | **PASS** |
| F | Analytics export minggu ini | **PASS** |
| G | Business logic regression | **PASS** |

## Manual UAT — Pak Zaki

### 1. HPP weighted average (Dashboard PO)

1. Buat PO produk base unit (kg), submit ORDERED.
2. Receive partial 10 unit @ Rp 68.000/kg → cek HPP produk = 68.000.
3. Receive lagi 10 unit @ Rp 72.000/kg → cek HPP = **70.000** (rata-rata tertimbang).

### 2. Offline conflict (Kasir PWA)

1. Simulasikan offline → checkout/hold masuk antrean.
2. Online kembali dengan kondisi stok berbeda → konflik muncul.
3. Buka modal **Selesaikan Konflik Sinkronisasi**.
4. Uji **Terima data server** dan **Coba ulang (data lokal)**.

### 3. Mobile shift

1. Login mobile Expo → **Buka Shift** → masukkan saldo awal.
2. Checkout tunai di `/pos` mobile.
3. **Tutup Shift** → verifikasi ringkasan expected cash.
4. Tombol **Bayar QRIS (coming soon)** menampilkan alert jujur.

### 4. Midtrans live (Settings)

1. Dashboard → Settings → centang mode produksi (tanpa key = mock).
2. **Uji Koneksi Midtrans** → pesan mock/sandbox sesuai konfigurasi.
3. Storefront checkout → redirect mock atau Snap sandbox jika key ada.

### 5. Thermal print (Kasir web)

1. Checkout → struk digital muncul.
2. **Hubungkan Printer** (WebUSB) → pilih perangkat USB.
3. **Cetak Thermal USB** atau fallback **Cetak Struk** browser.

### 6. Analytics minggu ini

1. Dashboard → Analitik → klik **Export minggu ini**.
2. CSV terunduh dengan rentang Senin–Minggu kalender WIB.

## Automated tests

```bash
npm run lint && npm run typecheck && npm run test && npm run build
```

## Defer Phase 10

- Mobile offline queue + sync
- QRIS native payment SDK
- Email cron scheduled export
- CSP production hardening
- Midtrans live production keys (Pak Zaki)

*UAT Phase 9: PASS — Citra + Rina · 6 Juni 2026*
