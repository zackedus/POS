# Midtrans Sandbox E2E + Webhook Tunnel

> **Owner:** Arif Hidayat · **Tanggal:** 7 Juni 2026

## Prasyarat

- API running (`npm run dev:api:fallback` atau Docker)
- Tenant seed: `barokah-bangunan`
- Midtrans **sandbox** Server Key di Settings owner atau env `MIDTRANS_SERVER_KEY`
- `MIDTRANS_IS_PRODUCTION=false`

## Alur E2E storefront

1. Buka `http://localhost:3001/store/barokah-bangunan`
2. Tambah produk → checkout pickup/delivery
3. Submit order → redirect Snap mock atau mock pay endpoint
4. **Dev mock:** `POST /api/v1/store/barokah-bangunan/orders/:orderNo/mock-pay` dengan body `{ "phone": "08..." }`
5. Verifikasi status `PAID` + stok berkurang (`SALE_ONLINE` movement)

## Webhook lokal dengan ngrok

```bash
ngrok http 3000
```

Set Midtrans Dashboard → Settings → Configuration:

- Payment notification URL: `https://<ngrok-id>.ngrok.io/api/v1/webhooks/midtrans`

Uji dengan Snap sandbox transaction; webhook harus idempotent (duplicate `transaction_id` ignored).

## Verifikasi bisnis

| Step | Expected |
|------|----------|
| Order create | `PENDING_PAYMENT`, stok belum berubah |
| Webhook settlement | `PAID`, stok deduct sekali |
| Kasir fulfill COMPLETED | Status selesai, **no** second deduct |
| Socket | `online-order:paid` + `stock:changed` |

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Signature invalid | Pastikan Server Key sandbox match tenant settings |
| Order not found | `order_id` Midtrans = `orderNo` internal |
| Stok conflict | Produk habis — reject PAID dengan `INSUFFICIENT_STOCK` |

Lihat juga: [MIDTRANS-PHASE-8.md](./MIDTRANS-PHASE-8.md), [MIDTRANS-LIVE-PRODUCTION.md](./MIDTRANS-LIVE-PRODUCTION.md)
