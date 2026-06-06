> 📚 [Indeks Dokumentasi](../INDEX.md) | Kategori: API | Audience: Fitri, Fajar, Arif

# Error Codes Catalog — Barokah Core POS API

> **Maintainer:** Fitri Nugroho  
> **Source of truth (code):** `packages/shared/src/api-types.ts` → `ErrorCodes` enum  
> **Standar:** [ERROR-HANDLING-VALIDATION.md](../standards/ERROR-HANDLING-VALIDATION.md)

---

## Format Response Error

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Pesan Bahasa Indonesia untuk client.",
    "details": []
  }
}
```

---

## Global Error Codes

| Code | HTTP | Module | Message (ID) | Trigger |
|------|------|--------|--------------|---------|
| `VALIDATION_FAILED` | 422 | global | Data tidak valid. Periksa field yang ditandai. | class-validator fail |
| `INVALID_INPUT` | 400 | global | Permintaan tidak valid. | Malformed request |
| `INVALID_UUID` | 422 | global | ID tidak valid. | UUID format fail |
| `INVALID_MONEY_FORMAT` | 422 | global | Nominal harus bilangan bulat rupiah. | Float atau format salah |
| `INVALID_DATE_FORMAT` | 422 | global | Format tanggal tidak valid. | Non ISO 8601 |
| `INVALID_PAGINATION` | 422 | global | Parameter halaman tidak valid. | page < 1 atau limit > 100 |
| `UNAUTHORIZED` | 401 | auth | Sesi tidak valid. Silakan login kembali. | No/invalid token |
| `INVALID_CREDENTIALS` | 401 | auth | Email atau password salah. | Login fail |
| `TOKEN_EXPIRED` | 401 | auth | Sesi habis. Silakan login kembali. | Expired JWT |
| `FORBIDDEN` | 403 | auth | Anda tidak memiliki akses. | RBAC fail |
| `INSUFFICIENT_PERMISSION` | 403 | auth | Izin tidak cukup untuk aksi ini. | Role mismatch |
| `NOT_FOUND` | 404 | global | Data tidak ditemukan. | Resource missing (scoped) |
| `CONFLICT` | 409 | global | Konflik data. | Generic conflict |
| `DUPLICATE_ENTRY` | 409 | global | Data sudah ada. | Unique constraint |
| `INTERNAL_ERROR` | 500 | global | Terjadi kesalahan sistem. Coba lagi. | Unexpected error |

---

## POS Domain Error Codes

| Code | HTTP | Module | Message (ID) | Trigger |
|------|------|--------|--------------|---------|
| `INSUFFICIENT_STOCK` | 409 | transactions | Stok produk tidak mencukupi. | qty > available |
| `SHIFT_NOT_OPEN` | 422 | shift | Shift belum dibuka. Buka shift terlebih dahulu. | No open shift |
| `SHIFT_ALREADY_OPEN` | 409 | shift | Shift sudah dibuka. | Duplicate open |
| `SHIFT_ALREADY_CLOSED` | 409 | shift | Shift sudah ditutup. | Duplicate force-close |
| `TRANSACTION_ALREADY_CLOSED` | 409 | transactions | Transaksi sudah selesai dan tidak dapat diubah. | Update closed txn |
| `INVALID_BARCODE` | 422 | catalog | Barcode tidak valid. | Format fail |
| `INVALID_QUANTITY` | 422 | transactions | Qty minimal 1. | qty < 1 |
| `SYNC_CONFLICT` | 409 | sync | Replay antrian gagal karena konflik bisnis. | Stock/shift saat replay |
| `SYNC_INVALID_PAYLOAD` | 400 | sync | Payload antrian tidak valid. | Payload checkout tidak match operasi |
| `SYNC_QUEUE_NOT_FOUND` | 404 | sync | Entri antrian sync tidak ditemukan. | Lookup id/outlet miss |

---

## Integration Error Codes

| Code | HTTP | Module | Message (ID) | Trigger |
|------|------|--------|--------------|---------|
| `PAYMENT_GATEWAY_ERROR` | 502 | payment | Verifikasi pembayaran gagal. | Provider error |
| `PAYMENT_TIMEOUT` | 502 | payment | Pembayaran timeout. Coba lagi atau ganti metode. | Gateway timeout |
| `PRINTER_OFFLINE` | 503 | printer | Printer tidak terhubung. | Device unreachable |
| `EXTERNAL_SERVICE_UNAVAILABLE` | 503 | integration | Layanan eksternal tidak tersedia. | Circuit open |

---

## Module Index

| Modul | Doc | Status |
|-------|-----|--------|
| Auth | [AUTH.md](./AUTH.md) | Sprint 1 |
| Health | inline | Sprint 1 |
| Catalog | TBD | Sprint 2 |
| Shift | TBD | Sprint 2 |
| Transactions | TBD | Sprint 3 |
| Payment | TBD | Sprint 4 |
| Sync (offline PWA) | [SYNC.md](./SYNC.md) | Sprint 11 |
| Online orders (Epic J) | [ONLINE-ORDERS-RFC.md](./ONLINE-ORDERS-RFC.md) | Sprint 13 **DRAFT** — kode `ONLINE_*` belum di `ErrorCodes` |

---

*Update catalog ini setiap modul API baru di-freeze oleh Fajar.*
