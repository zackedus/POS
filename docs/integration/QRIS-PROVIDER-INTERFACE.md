# QRIS Provider Interface — Fase 2

> **Owner:** Arif Hidayat · **Tanggal:** 7 Juni 2026

## Abstraksi

File: `apps/api/src/modules/transactions/qris-provider.interface.ts`

```typescript
export interface QrisProvider {
  readonly providerId: string;
  initiate(input: QrisInitiateInput): QrisInitiateResult;
  getStatus(paymentId: string): QrisStatusResult | null;
  confirmMock?(paymentId: string): QrisStatusResult | null;
}
```

Implementasi saat ini: `MockQrisProvider` (static QR + auto-confirm dev).

## Roadmap provider

| Provider | Fase | Status |
|----------|------|--------|
| Mock (internal) | MVP–F2 | ✅ Production path kasir |
| Midtrans QRIS | F3 | Planned |
| Xendit | F3 | Interface ready |
| Duitku | F3 | Interface ready |

## Wiring

`QrisPaymentService` tetap owner session + idempotent `checkoutSplit`. Provider live akan swap `buildQrPayload` / polling tanpa mengubah deduct stok.

Lihat: [QRIS-PHASE-10.md](./QRIS-PHASE-10.md)
