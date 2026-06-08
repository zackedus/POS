# Manajemen Pengiriman — Domain Spec

> 📚 [Indeks Dokumentasi](../INDEX.md) | Owner: **Rina** · API: **Fajar** · UI: **Dimas**

Modul antrian pengiriman barang ke proyek / alamat pelanggan — terintegrasi dengan transaksi POS dan alamat CRM.

---

## Ringkasan Bisnis

Toko bahan bangunan sering mengantar material ke lokasi proyek pelanggan. Kasir menandai transaksi **"Antar ke alamat"**, memilih alamat dari CRM (atau input sekali pakai), lalu setelah checkout sukses pesanan masuk antrian operasional dengan status workflow.

---

## Entitas

| Entitas | Deskripsi |
|---------|-----------|
| `DeliveryOrder` | Satu permintaan pengiriman — terhubung ke `Transaction` (POS) atau standalone |
| `DeliveryStatusLog` | Audit trail perubahan status |
| `CustomerAddress` | Sumber alamat tersimpan (CRM) — snapshot disimpan saat create |

---

## Status Flow

```
MENUNGGU → DISIAPKAN → DIKIRIM → SELESAI
    ↓         ↓           ↓
  BATAL     BATAL       BATAL
```

| Status | Label UI | Peran |
|--------|----------|-------|
| `MENUNGGU` | Menunggu | Baru masuk antrian setelah checkout POS |
| `DISIAPKAN` | Disiapkan | Gudang/kasir menyiapkan barang |
| `DIKIRIM` | Dikirim | Barang sudah di jalan |
| `SELESAI` | Selesai | Diterima pelanggan |
| `BATAL` | Batal | Dibatalkan dengan alasan |

Transisi diatur di `@barokah/shared` (`DELIVERY_STATUS_TRANSITIONS`). Update status: **Manager+** RBAC.

---

## Alamat Pengiriman

1. **Alamat CRM** — pilih `CustomerAddress` via `addressId`; snapshot disimpan ke `DeliveryOrder`.
2. **Sekali pakai** — kasir isi manual (label, alamat, kota); tidak menambah record CRM otomatis.

Pelanggan **wajib terhubung** saat mode pengiriman aktif di POS.

---

## Integrasi POS

1. Toggle **Antar ke alamat** di panel keranjang.
2. Dropdown alamat pelanggan atau input manual.
3. Checkout sukses → `POST /deliveries` dengan `transactionId` + alamat.
4. Konfirmasi kasir: *"Masuk antrian pengiriman #DLV-…"*.

---

## Scope & Batasan

| Dalam scope | Di luar scope |
|-------------|---------------|
| Antrian per outlet | Live GPS tracking |
| Snapshot alamat | Integrasi kurir JNE/J&T |
| Link ke transaksi & item summary | Routing optimasi |
| Dashboard manager | Notifikasi SMS driver |

---

## API Endpoints

| Method | Path | Role |
|--------|------|------|
| `GET` | `/deliveries` | Kasir+ — list queue |
| `GET` | `/deliveries/:id` | Kasir+ — detail |
| `POST` | `/deliveries` | Kasir+ — create dari POS |
| `PATCH` | `/deliveries/:id/status` | Manager+ — advance/cancel |
| `GET` | `/deliveries/queue/summary` | Kasir+ — badge counts |

---

## Error Codes

- `DELIVERY_NOT_FOUND`
- `DELIVERY_ADDRESS_REQUIRED`
- `DELIVERY_CUSTOMER_REQUIRED`
- `DELIVERY_TRANSACTION_NOT_FOUND`
- `DELIVERY_ALREADY_EXISTS`
- `DELIVERY_STATUS_TRANSITION_INVALID`
- `DELIVERY_CANCEL_REASON_REQUIRED`

---

## Referensi Teknis

- Prisma: `DeliveryOrder`, `DeliveryStatusLog`, `DeliveryOrderSequence`
- Shared: `packages/shared/src/types/delivery-types.ts`, `constants/delivery.ts`
- API: `apps/api/src/modules/deliveries/`
- Web POS: `PosDeliverySelector`, `/dashboard/deliveries`
