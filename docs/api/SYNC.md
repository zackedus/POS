> 📚 [Indeks Dokumentasi](../INDEX.md) | Kategori: API | Audience: Fajar, Dimas, Fitri

# Sync API — Offline PWA Toko Fisik (Sprint 11)

> **Prefix:** `api/v1/sync`  
> **Auth:** JWT + outlet scope (kasir diizinkan)  
> **Processor:** BullMQ (`bullmq`) saat Redis tersedia; fallback `inline-fallback` jika Redis down/disabled (Sprint 12)  
> **Konsumen PWA:** `apps/web/src/lib/offline-sync.ts` memanggil `POST /sync/queue` saat sinkron ulang (bukan checkout langsung).

---

## Endpoints

| Method | Path | Deskripsi |
|--------|------|-----------|
| `POST` | `/sync/queue` | Terima batch transaksi antrian client; idempotent via `clientRequestId` |
| `GET` | `/sync/status` | Ringkasan jumlah antrian per status + `lastProcessedAt` |
| `GET` | `/sync/conflicts` | Daftar entri `CONFLICT` untuk resolve manual |

---

## POST /sync/queue

**Body:**

```json
{
  "outletId": "uuid-opsional",
  "entries": [
    {
      "clientRequestId": "offline-req-20260602-001",
      "operation": "CHECKOUT_CASH",
      "payload": {
        "items": [{ "productId": "...", "quantity": 1 }],
        "cashReceived": 50000
      },
      "clientCreatedAt": "2026-06-02T09:00:00.000Z",
      "deviceId": "pwa-kasir-01"
    }
  ]
}
```

**Operasi:**

| Operasi | Payload |
|---------|---------|
| `CHECKOUT_CASH` | DTO `CheckoutCashDto` |
| `CHECKOUT_SPLIT` | DTO `CheckoutSplitDto` |
| `HOLD_BILL` | DTO `HoldTransactionDto` (spike offline — Sprint 12) |
| `RECALL_HOLD` | `{ "heldId": "uuid", "outletId?": "uuid" }` |

Untuk `HOLD_BILL`, field `transactionId` pada response entri berisi **held bill id** (bukan transaksi penjualan).

**Idempotensi:** `outletId` + `clientRequestId` unik di `sync_queue_entries`; replay checkout memakai `clientRequestId` yang sama di `transactions`.

**Response (data):**

```json
{
  "outletId": "...",
  "processor": "bullmq",
  "replayedCount": 1,
  "entries": [
    {
      "clientRequestId": "offline-req-20260602-001",
      "status": "APPLIED",
      "transactionId": "uuid",
      "conflictCode": null,
      "conflictMessage": null,
      "idempotentReplay": false
    }
  ]
}
```

**Status antrian:** `PENDING` → `PROCESSING` → `APPLIED` | `CONFLICT` | `FAILED`

---

## GET /sync/status

**Query:** `outletId` (opsional jika user single-outlet)

**Response (data):**

```json
{
  "outletId": "...",
  "processor": "bullmq",
  "queue": {
    "pending": 0,
    "processing": 0,
    "applied": 12,
    "conflict": 1,
    "failed": 0
  },
  "pendingTotal": 0,
  "conflictTotal": 1,
  "lastProcessedAt": "2026-06-02T10:00:00.000Z",
  "bullmq": {
    "waiting": 0,
    "active": 1,
    "failed": 2,
    "completed": 10
  }
}
```

> Field `bullmq` hanya ada saat processor `bullmq` (Redis aktif). Tidak ada pada mode `inline-fallback`.

---

## GET /sync/conflicts

**Query:** `outletId`, `limit` (default 20, max 100)

Menampilkan entri dengan `status: CONFLICT` (mis. `INSUFFICIENT_STOCK` saat replay — kebijakan server-wins per ADR-003).

---

## Kebijakan Sync (ADR-003)

- Transaksi lokal client immutable; upload idempotent.
- Konflik stok → status `CONFLICT`, kasir resolve manual (UI konflik di banner — defer Sprint 12).
- BullMQ worker: queue `barokah-sync-replay`, attempts 3, backoff eksponensial 2s.
- Hold/recall offline: operasi sync `HOLD_BILL` / `RECALL_HOLD`; `clientRequestId` antrean diteruskan ke `POST /transactions/hold` (idempotent per outlet, Sprint 13).
- PWA Sprint 11: enqueue via endpoint ini; IndexedDB lokal dihapus setelah status `APPLIED`.
