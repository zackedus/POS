# QRIS Integration — Phase 10 MVP

> **Owner:** Arif (Integration) · **API:** Fajar · **Web/Mobile:** Dimas  
> **Tanggal:** 6 Juni 2026

## Ringkasan

Phase 10 menambahkan alur QRIS mock untuk kasir web dan mobile — pola retail Indonesia (static QR + polling status). Transaksi selesai **PAID** dengan metode `QRIS`, stok deduct **sekali** via `checkoutSplit` idempotent.

## API Endpoints

| Method | Path | Deskripsi |
|--------|------|-----------|
| `POST` | `/api/v1/transactions/qris/initiate` | Buat sesi QRIS pending + `qrPayload` mock |
| `GET` | `/api/v1/transactions/qris/:paymentId/status` | Poll status (`PENDING` / `PAID` / `EXPIRED`) |
| `POST` | `/api/v1/transactions/qris/:paymentId/confirm-mock` | Simulasi bayar (dev/UAT) |

### Request initiate

```json
{
  "items": [{ "productId": "uuid", "quantity": 2 }],
  "clientRequestId": "optional-idempotency-key",
  "promoRuleId": "optional-uuid"
}
```

### Response initiate

```json
{
  "paymentId": "QRIS-…",
  "status": "PENDING",
  "amount": 150000,
  "qrPayload": "ID.QRIS.MOCK|QRIS-…|150000|BAROKAH-CORE-POS",
  "mockAutoConfirmMs": 3000,
  "expiresAt": "2026-06-06T12:15:00.000Z"
}
```

## Alur Web Kasir

1. Kasir pilih **QRIS** → klik checkout.
2. Modal menampilkan `qrPayload` (static mock QR string).
3. Frontend poll `GET …/status` setiap ~3 detik.
4. Mock auto-confirm setelah 3 detik **atau** tombol **Simulasi Bayar**.
5. Status `PAID` → struk dibuka, keranjang dikosongkan.

## Alur Mobile

1. Tombol **Bayar QRIS (Mock API)** memanggil `initiate`.
2. QR string ditampilkan di layar.
3. Poll status → checkout selesai.
4. Deep link stub: `barokahpos://qris/{paymentId}` (Fase 2 native SDK).

## Business Logic

- Pembayaran QRIS memanggil `checkoutSplit` dengan `{ method: QRIS, amount: total }`.
- `clientRequestId` mencegah double stock deduct (idempotensi).
- PPN + promo diterapkan sama seperti checkout split biasa.

## Production Path (defer)

- Integrasi Midtrans QRIS / payment gateway live (butuh kredensial Pak Zaki).
- Native QRIS SDK mobile (Fase 2).

*Dokumen Phase 10 — Arif + Fajar + Dimas*
