# Manajemen Pengiriman — Domain Spec

> 📚 [Indeks Dokumentasi](../INDEX.md) | Owner: **Rina** · API: **Fajar** · UI: **Dimas**

Modul antrian pengiriman barang ke proyek / alamat pelanggan — terintegrasi dengan transaksi POS, order web, dan marketplace.

---

## Ringkasan Bisnis

Toko bahan bangunan sering mengantar material ke lokasi proyek pelanggan. Sumber pengiriman:

| Sumber | `deliveryType` | Channel | Pembuatan |
|--------|----------------|---------|-----------|
| POS checkout (toko langsung) | `STORE_DIRECT` | — | Otomatis setelah checkout + alamat |
| Order web storefront | `ONLINE_ORDER` | `WEB` | Saat staff konfirmasi/disipakan order |
| Order marketplace (entri manual) | `ONLINE_ORDER` | `TOKOPEDIA` / `SHOPEE` | Saat staff konfirmasi/disipakan order |

---

## Entitas

| Entitas | Deskripsi |
|---------|-----------|
| `DeliveryOrder` | Satu permintaan pengiriman — terhubung ke `Transaction` (POS) atau `OnlineOrder` |
| `DeliveryType` | `STORE_DIRECT` · `ONLINE_ORDER` |
| `DeliveryStatusLog` | Audit trail perubahan status (`changedById`, notes) |
| `CustomerAddress` | Sumber alamat CRM — snapshot disimpan saat create |

---

## Status Flow

```
MENUNGGU → DISIAPKAN → DIKIRIM → SELESAI
    ↓         ↓           ↓
  BATAL     BATAL       BATAL
```

| Status | Label UI | Warna UI |
|--------|----------|----------|
| `MENUNGGU` | Menunggu | Amber |
| `DISIAPKAN` | Disiapkan | Biru |
| `DIKIRIM` | Dikirim | Ungu |
| `SELESAI` | Selesai | Hijau |
| `BATAL` | Batal | Abu-abu |

Transisi diatur di `@barokah/shared` (`DELIVERY_STATUS_TRANSITIONS`). Update status: **Manager+** RBAC. Pembatalan wajib `cancelReason` (min. 3 karakter).

Pembatalan order online (`CANCELLED`) otomatis sinkron ke delivery `BATAL`.

---

## Integrasi POS (STORE_DIRECT)

1. Toggle **Kirim ke alamat** di panel checkout.
2. Alamat CRM atau input sekali pakai (walk-in butuh nama + HP).
3. Checkout sukses → `DeliveriesService.createForCompletedTransaction` (server-side) + fallback `POST /deliveries`.
4. Konfirmasi kasir: *"Masuk antrian pengiriman DLV-…"* + link `/pos/deliveries`.

---

## Integrasi Order Web / Marketplace (ONLINE_ORDER)

1. Order `PAID` → staff **Konfirmasi** → delivery `MENUNGGU`.
2. **Disiapkan** (`READY`) → delivery `DISIAPKAN`.
3. **Kirim** (`POST /online-orders/:id/ship`) → delivery `DIKIRIM`.
4. **Selesai** (`COMPLETED`) → delivery `SELESAI`.
5. **Batal** order → delivery `BATAL` + alasan.

Label pengiriman: `GET /online-orders/:id/shipping-label` atau `GET /deliveries/:id/shipping-label`.

---

## Dashboard & Kasir UI

| Route | Role | Fungsi |
|-------|------|--------|
| `/dashboard/deliveries` | Manager+ | Antrian penuh: filter, summary cards, ubah status, cetak label |
| `/pos/deliveries` | Kasir+ | Baca saja — lihat antrian hari ini tanpa ubah status |
| `/pos/online-orders` | Kasir+ | Fulfillment order web |
| `/pos/marketplace-orders` | Kasir+ | Entri + fulfillment marketplace |

Filter dashboard: cabang, tipe, channel (WEB/Tokopedia/Shopee), status, tanggal WIB (default hari ini), pencarian DLV/pelanggan/struk/order.

---

## Realtime & Sync

| Mekanisme | Event |
|-----------|-------|
| Socket.io | `delivery:created`, `delivery:updated` per outlet room |
| BroadcastChannel | Cross-tab refresh saat POS buat delivery |
| Tab focus | Refetch antrian |

---

## API Endpoints

| Method | Path | Role |
|--------|------|------|
| `GET` | `/deliveries` | Kasir+ — list (filter WIB, channel, search) |
| `GET` | `/deliveries/:id` | Kasir+ — detail + `statusHistory` |
| `GET` | `/deliveries/:id/shipping-label` | Kasir+ — label cetak (toko langsung & online) |
| `POST` | `/deliveries` | Kasir+ — create `STORE_DIRECT` dari POS |
| `PATCH` | `/deliveries/:id/status` | Manager+ — advance/cancel |
| `GET` | `/deliveries/queue/summary` | Kasir+ — badge counts (filter tanggal WIB) |

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
- Web: `PosDeliverySelector`, `/dashboard/deliveries`, `/pos/deliveries`
