> 📚 [Indeks Dokumentasi](../INDEX.md) | Kategori: Integration | Audience: Arif, Dimas, Fajar

# Thermal Print — MVP Stub (Sprint 10)

> **Arif** · Integration Specialist — placeholder ESC/POS sampai driver hardware terpasang.

## Status Sprint 10

| Layer | Implementasi |
|-------|----------------|
| API | `GET /api/v1/transactions/:id/receipt` mengembalikan `receipt` + `escpos` stub (base64) |
| Web kasir | Pratinjau struk 58mm + **Cetak Struk** via `window.print()` |
| Hardware | **Belum** — gunakan payload `escpos` untuk POC driver berikutnya |

## Kontrak `escpos` (stub)

```json
{
  "format": "escpos",
  "encoding": "base64",
  "width": 32,
  "payload": "<base64 UTF-8 text + escape sequences>",
  "commands": ["INIT", "TEXT", "CUT"]
}
```

Generator: `apps/api/src/modules/transactions/receipt.util.ts` → `buildEscPosStub()`.

## Alur Web

1. Checkout sukses → auto-buka panel **Struk Digital** di `/pos`.
2. Tombol **Cetak Struk** → `printReceiptBrowser('barokah-receipt-print')` (`apps/web/src/lib/thermal-print.ts`).
3. Banner hint: stub ESC/POS menunggu integrasi Bluetooth/USB.

## Handoff ke Integrasi Hardware (Fase berikutnya)

| Task | Owner |
|------|-------|
| Driver ESC/POS (Bluetooth/USB) untuk Windows kasir | Arif |
| Map `escpos.payload` → byte stream printer | Arif + Dimas (Expo/PWA jika perlu) |
| Offline queue cetak | Defer Fase 2 |

**Parallel OK?** Ya — frontend print browser independen dari driver hardware.
