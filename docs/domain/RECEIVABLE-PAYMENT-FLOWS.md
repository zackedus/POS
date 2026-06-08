# Alur Pembayaran Piutang Pelanggan (AR Settlement)

> **Owner domain:** Rina · **Algoritma:** Eko · **API:** Fajar · **UI:** Dimas  
> **Tanggal:** 9 Jun 2026

---

## 1. Definisi

| Istilah | Arti |
|---------|------|
| **Piutang (AR)** | Tagihan yang **belum lunas** — pelanggan berutang ke toko |
| **ReceivablePayment** | Record **immutable** setiap pelunasan piutang |
| **Bukti pembayaran** | Referensi transfer, nama bank, URL gambar bukti (stub MVP) |

---

## 2. Metode Pelunasan Piutang

| Metode | Kode API | Keterangan |
|--------|----------|------------|
| Tunai | `CASH` | Masuk rekonsiliasi shift kasir (`shiftId`) |
| Transfer | `TRANSFER` | Wajib `transferReference`; opsional `bankName`, `proofUrl` |
| Deposit | `DEPOSIT` | Kurangi saldo deposit + kurangi outstanding piutang |
| QRIS | `QRIS` | Opsional; sama seperti transfer untuk bukti |

**Tidak dipakai untuk pelunasan:** `CREDIT` (itu membuat piutang, bukan melunasi).

---

## 3. Aturan Bisnis

1. Setiap pembayaran membuat **satu** `ReceivablePayment` — tidak boleh edit/hapus.
2. Void/koreksi → record **reversal** terpisah (Fase berikutnya); MVP: tidak ada delete.
3. **Deposit apply:** saldo `customer_deposits` berkurang; ledger `deposit_transactions` type `APPLY` dengan `referenceType=receivable_payment`.
4. **FIFO:** `POST /receivables/customers/:id/payments` tanpa `receivableId` → bayar piutang tertua dulu (`dueDate ASC`, `createdAt ASC`).
5. Validasi deposit: `DEPOSIT_INSUFFICIENT_BALANCE` jika saldo < nominal.
6. Validasi nominal: tidak boleh melebihi sisa piutang per header atau total outstanding (FIFO).

---

## 4. Model Data (perluasan)

```prisma
model ReceivablePayment {
  method               PaymentMethod
  transferReference    String?   // no ref TF
  bankName             String?
  proofUrl             String?   // URL bukti upload (stub MVP)
  notes                String?
  depositTransactionId String?   // jika bayar via deposit
  shiftId              String?   // link shift untuk rekonsiliasi kas tunai
  recordedById         String
}
```

---

## 5. API Endpoints

| Method | Route | Deskripsi |
|--------|-------|-----------|
| POST | `/receivables/:id/payments` | Bayar satu piutang spesifik |
| POST | `/receivables/customers/:id/payments` | Bayar FIFO atau `receivableId` tertentu |
| GET | `/receivables/customers/:id/payment-history` | Ledger pembayaran + bukti |
| GET | `/receivables/:id/payments` | Daftar pembayaran per piutang |

**Body pembayaran (contoh transfer):**

```json
{
  "amount": 500000,
  "method": "TRANSFER",
  "transferReference": "TRF-20260609-001",
  "bankName": "BCA",
  "proofUrl": "https://storage.example/bukti.jpg",
  "notes": "Pelunasan invoice TRX-100",
  "shiftId": null
}
```

---

## 6. Titik Akses UI

| Lokasi | Fitur |
|--------|-------|
| `/dashboard/receivables` | Modal Catat Pembayaran, filter riwayat per pelanggan, export CSV |
| `/dashboard/customers/[id]` tab Piutang | Daftar piutang + riwayat + cetak bukti |
| POS kasir | Modal Terima Pembayaran Piutang (link shift aktif) |

---

## 7. Error Codes

| Code | Kondisi |
|------|---------|
| `RECEIVABLE_NOT_OPEN` | Piutang sudah PAID/VOID |
| `DEPOSIT_INSUFFICIENT_BALANCE` | Saldo deposit tidak cukup |
| `INVALID_INPUT` | Nominal melebihi sisa / tidak valid |
| `NOT_FOUND` | Piutang/pelanggan tidak ditemukan |

---

## Handoff Log

| Field | Isi |
|-------|-----|
| **From** | Rina · Spesialis POS |
| **To** | Fajar · Senior Developer |
| **Task** | Domain spec pembayaran piutang multi-metode + bukti |
| **Deliverable** | `docs/domain/RECEIVABLE-PAYMENT-FLOWS.md` |
| **Parallel OK?** | Ya — API/UI setelah spec freeze |
| **Next action** | Implement Prisma + endpoint + UI modal |
