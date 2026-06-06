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

## ESC/POS Preview (Phase 7)

- `renderEscPosPreview(escpos)` — decode base64 + token command (`[INIT]`, `[CUT]`, dll.)
- `formatWebUsbIntegrationHint()` — deteksi `navigator.usb` untuk POC Arif

## WebUSB stub (Phase 8)

- `connectWebUsbThermalStub()` — `requestDevice` class printer 0x07 (stub, no driver write)
- `printEscPosWebUsbStub(previewText)` — validasi preview struk terakhir sebelum driver penuh
- Fallback: **Cetak Struk** browser tetap default production

Browser Chromium desktop mendukung [WebUSB API](https://developer.mozilla.org/en-US/docs/Web/API/USB). Alur POC yang direncanakan:

1. Kasir klik **Hubungkan Printer USB** (UI menyusul)
2. `navigator.usb.requestDevice({ filters: [{ classCode: 7 }] })` — printer class
3. Kirim byte dari `escpos.payload` (decode base64) via bulk OUT endpoint
4. Fallback: `printReceiptBrowser()` (sudah ada)

**Status:** stub helper saja — tidak memerlukan hardware Pak Zaki untuk test.

## Handoff ke Integrasi Hardware (Fase berikutnya)

| Task | Owner |
|------|-------|
| Driver ESC/POS (Bluetooth/USB) untuk Windows kasir | Arif |
| Map `escpos.payload` → byte stream printer | Arif + Dimas (Expo/PWA jika perlu) |
| Offline queue cetak | Defer Fase 2 |

**Parallel OK?** Ya — frontend print browser independen dari driver hardware.
