# Midtrans Live Production — Barokah Core POS

> **Owner:** Arif Hidayat · **API:** Fajar Ramadhan · **Tanggal:** 6 Juni 2026

## Mode operasi

| Mode | Kondisi | Checkout storefront | Webhook |
|------|---------|---------------------|---------|
| **mock** | Tidak ada server key (env/tenant) | Redirect mock success | Skip verify hanya dev (`MIDTRANS_WEBHOOK_SKIP_VERIFY=true`) |
| **sandbox** | Server key sandbox + produksi OFF | Snap sandbox | Signature SHA512 wajib |
| **live** | Server key live + produksi ON | Snap live | Signature SHA512 wajib — **tidak ada skip** |

## Konfigurasi

### Environment (infra)

```env
MIDTRANS_SERVER_KEY=SB-Mid-server-...   # fallback global
MIDTRANS_IS_PRODUCTION=false
STOREFRONT_BASE_URL=https://pos.example.com
# Dev only:
MIDTRANS_WEBHOOK_SKIP_VERIFY=true
```

### Tenant (dashboard Settings — Owner)

- Simpan **Server Key** per tenant (override env).
- Toggle **Mode produksi Midtrans (live)**.
- Tombol **Uji Koneksi Midtrans** → ping `/v2/ping`.

## Production guardrails (Phase 9)

1. **Live tanpa key** → checkout fallback mock + warning di settings.
2. **Webhook production** → `verifySignature` menolak jika `signature_key` invalid/missing.
3. **Tenant-aware** → storefront & webhook memakai kunci tenant jika disimpan.

## Webhook

- Endpoint: `POST /api/v1/webhooks/midtrans/online`
- Health: `GET /api/v1/webhooks/midtrans/online/health`

## Uji dengan mock credentials

Tanpa key Pak Zaki, sistem tetap operasional mock — cocok untuk UAT pilot toko bahan bangunan.

*Integrasi live penuh menunggu kredensial produksi Pak Zaki — Phase 10.*
