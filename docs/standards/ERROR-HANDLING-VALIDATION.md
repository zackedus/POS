> 📚 [Indeks Dokumentasi](../INDEX.md) | Kategori: Standar | Audience: Fajar, Fitri, semua dev

# Standar Error Handling & Validasi Input/Output

> **Status:** Wajib · **Prioritas:** P0 MVP Sprint 1–4  
> **Owner teknis:** Fajar Ramadhan (Senior Developer)  
> **Disetujui:** Budi Santoso · 1 Juni 2026  
> **Referensi:** [OVERVIEW.md](../architecture/OVERVIEW.md), [SPRINT-1-PLAN.md](../requirements/SPRINT-1-PLAN.md), `@barokah/shared`

---

## Ringkasan Eksekutif

Dokumen ini mendefinisikan standar **wajib P0** untuk error handling, validasi input, format response API, dan kontrak tipe TypeScript di seluruh Barokah Core POS. Semua endpoint, user story, wireframe, dan integrasi eksternal **harus** mengikuti standar ini sebelum merge ke `main`.

**Prinsip inti:** Fail fast, fail clearly — kasir dan merchant mendapat pesan yang actionable dalam Bahasa Indonesia; developer mendapat error code konsisten untuk debugging.

---

## A. Prinsip Umum

| Prinsip | Aturan |
|---------|--------|
| **Fail fast, fail clearly** | Validasi di boundary (DTO/controller) sebelum masuk service; business rule di service layer |
| **Never expose stack trace** | Production response tidak boleh berisi stack, SQL, path file, atau secret |
| **Consistent error codes** | Semua error API punya `code` SCREAMING_SNAKE_CASE dari enum `@barokah/shared` |
| **Dual-layer validation** | Layer 1: format/type (DTO + class-validator). Layer 2: business rule (service) |
| **User vs developer message** | `message` ke client = Bahasa Indonesia user-friendly; `code` untuk log & mapping |
| **Immutable audit** | Error transaksi POS tidak menghapus data — catat attempt + alasan |

### Boundary Validation vs Business Rule

```
Request → ValidationPipe (DTO) → Service (business rules) → Repository
              ↓ 400/422                           ↓ 409/422
         VALIDATION_FAILED                   INSUFFICIENT_STOCK
```

---

## B. Input Validation

### NestJS + class-validator (Wajib)

Global `ValidationPipe` sudah aktif di `apps/api/src/main.ts`:

```typescript
new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});
```

**Setiap DTO wajib:**

- Dekorator `@Is*`, `@Min`, `@Max`, `@Matches`, `@ValidateNested`
- `@Type()` dari `class-transformer` untuk nested object dan array
- Pesan custom Bahasa Indonesia via `message` option jika field user-facing

### Aturan Format Field

| Tipe | Format | Contoh Valid | Contoh Invalid |
|------|--------|--------------|----------------|
| **Money (IDR)** | Integer rupiah **atau** Decimal string | `15000`, `"15000.00"` | `15.5` (float), `"Rp 15.000"` |
| **UUID** | RFC 4122 v4 | `550e8400-e29b-41d4-a716-446655440000` | `"123"`, `"abc-def"` |
| **Date/Time** | ISO 8601 UTC | `"2026-06-01T08:00:00.000Z"` | `"01/06/2026"`, timestamp number |
| **Pagination** | `page >= 1`, `limit 1–100` | `page=1&limit=20` | `page=0`, `limit=500` |
| **Email** | `@IsEmail()` | `kasir@toko.id` | `kasir@` |
| **Barcode** | `@Matches(/^[0-9A-Za-z\-]{4,32}$/)` | `8991234567890` | empty, special chars |

### POS-Specific Validation (P0)

| Rule | Validasi | Error Code |
|------|----------|------------|
| Qty item | `@Min(1)` integer | `INVALID_QUANTITY` |
| Shift terbuka | Service check sebelum transaksi | `SHIFT_NOT_OPEN` |
| Stok cukup | Service check sebelum checkout | `INSUFFICIENT_STOCK` |
| Barcode produk | Format + exists di catalog | `INVALID_BARCODE` / `NOT_FOUND` |
| Tenant/outlet scope | Guard + service filter | `FORBIDDEN` / `NOT_FOUND` |
| Transaksi closed | Immutable — no update | `TRANSACTION_ALREADY_CLOSED` |

### Contoh DTO

```typescript
import { IsUUID, IsInt, Min, Max, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationQueryDto {
  @Type(() => Number)
  @IsInt({ message: 'Halaman harus bilangan bulat' })
  @Min(1, { message: 'Halaman minimal 1' })
  page: number = 1;

  @Type(() => Number)
  @IsInt({ message: 'Limit harus bilangan bulat' })
  @Min(1, { message: 'Limit minimal 1' })
  @Max(100, { message: 'Limit maksimal 100' })
  limit: number = 20;
}

export class CreateTransactionItemDto {
  @IsUUID('4', { message: 'ID produk tidak valid' })
  productId: string;

  @IsInt({ message: 'Qty harus bilangan bulat' })
  @Min(1, { message: 'Qty minimal 1' })
  quantity: number;
}
```

---

## C. Output Format (API Response Envelope)

### Success Response

```json
{
  "success": true,
  "data": {},
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

`meta` opsional — wajib untuk endpoint paginated list.

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "message": "Stok produk tidak mencukupi untuk transaksi ini.",
    "details": [
      {
        "field": "items[0].quantity",
        "message": "Stok tersedia: 3",
        "value": 5,
        "constraint": "maxStock"
      }
    ]
  }
}
```

`details` wajib untuk validation errors (field-level). Opsional untuk business errors.

### HTTP Status Mapping

| HTTP | Kapan Dipakai | Error Code Contoh |
|------|---------------|-------------------|
| **400** | Bad request, malformed JSON | `INVALID_INPUT` |
| **401** | Token missing/invalid/expired | `UNAUTHORIZED`, `TOKEN_EXPIRED` |
| **403** | Authenticated tapi tidak punya akses | `FORBIDDEN`, `INSUFFICIENT_PERMISSION` |
| **404** | Resource tidak ditemukan (scoped) | `NOT_FOUND` |
| **409** | Conflict bisnis / state | `INSUFFICIENT_STOCK`, `SHIFT_ALREADY_OPEN`, `DUPLICATE_ENTRY` |
| **422** | Semantik valid tapi tidak bisa diproses | `VALIDATION_FAILED`, `SHIFT_NOT_OPEN` |
| **500** | Unexpected server error | `INTERNAL_ERROR` |
| **502** | Upstream gateway error | `PAYMENT_GATEWAY_ERROR` |
| **503** | Service unavailable | `EXTERNAL_SERVICE_UNAVAILABLE` |

### Konvensi Error Code

- Format: **SCREAMING_SNAKE_CASE**
- Prefix domain opsional: `AUTH_`, `TXN_`, `INV_`, `PAY_`
- Gunakan enum `ErrorCodes` dari `@barokah/shared` — jangan hardcode string bebas
- Pesan `message` ke client: **Bahasa Indonesia**, jelas, actionable
- Jangan expose `code` teknis ke layar kasir — mapping di frontend (lihat section E)

---

## D. TypeScript Shared Types

Lokasi: `packages/shared/src/api-types.ts` — diekspor via `@barokah/shared`.

| Type | Deskripsi |
|------|-----------|
| `ApiResponse<T>` | Union success \| error envelope |
| `ApiSuccessResponse<T>` | `{ success: true, data, meta? }` |
| `ApiErrorResponse` | `{ success: false, error: ApiErrorPayload }` |
| `ApiErrorPayload` | `{ code, message, details? }` |
| `PaginationMeta` | `{ page, limit, total, totalPages? }` |
| `ValidationErrorDetail` | `{ field, message, value?, constraint? }` |
| `ErrorCodes` | Enum error codes umum + POS domain |

**Konsumen:** `apps/api`, `apps/web`, `apps/mobile` — import dari `@barokah/shared`, jangan duplikasi type lokal.

---

## E. UI Error Handling (Maya · UI/UX)

### Severity → Presentation

| Severity | Presentasi | Contoh |
|----------|------------|--------|
| **Info** | Toast hijau/biru, auto-dismiss 3s | "Produk ditambahkan ke keranjang" |
| **Warning** | Banner kuning inline / toast 5s | Stok menipis, shift hampir tutup |
| **Error (recoverable)** | Toast merah + tombol Retry | Network timeout, printer gagal |
| **Error (blocking)** | Modal + aksi utama | Shift belum dibuka, stok habis block checkout |
| **Critical** | Modal full-screen + hubungi manager | Auth expired mid-transaction |

### Aturan Copy Kasir

- **Bahasa Indonesia** — tidak ada HTTP status atau error code di UI kasir
- Map `error.code` → copy user-friendly di `packages/shared` atau constants frontend
- Format angka: `id-ID` locale
- Network/offline: banner persistent top + queue indicator (mobile P1)
- Retry: exponential backoff max 3x untuk API read; write butuh konfirmasi user

### Wireframe Notes (P0 Sprint 1–4)

| Screen | Error State | Referensi |
|--------|-------------|-----------|
| SCR-L02 Login gagal | Inline field error + toast | `INVALID_CREDENTIALS` |
| SCR-S01 Buka shift | Modal blocking, saldo awal validation | `INVALID_MONEY_FORMAT` |
| SCR-K01 Kasir | Toast scan fail, banner stok | `INVALID_BARCODE`, `INSUFFICIENT_STOCK` |
| SCR-P01 Payment | Modal QRIS timeout + "Ganti Cash" | `PAYMENT_TIMEOUT` |

---

## F. Integration Error Handling (Arif · Integration)

### Webhook Pattern

```
Receive → Verify signature → Idempotency check (Redis) → Process → ACK 200
                ↓ fail                    ↓ duplicate
           401/403                   200 (no-op)
```

### Retry & Resilience

| Mekanisme | Aturan |
|-----------|--------|
| **Webhook retry** | BullMQ, exponential backoff 1s→30s, max 5 attempts |
| **Idempotency key** | `webhook:{provider}:{eventId}` Redis TTL 24h |
| **Timeout** | HTTP client 10s connect, 30s read (payment 60s) |
| **Circuit breaker** | Open after 5 failures/60s; half-open after 30s |

### External → Internal Error Mapping

| Provider Error | Internal Code | HTTP | User Message (ID) |
|----------------|---------------|------|-------------------|
| Midtrans timeout | `PAYMENT_TIMEOUT` | 502 | "Pembayaran QRIS timeout. Coba lagi atau ganti metode." |
| Midtrans invalid signature | `PAYMENT_GATEWAY_ERROR` | 502 | "Verifikasi pembayaran gagal. Hubungi support." |
| Printer not connected | `PRINTER_OFFLINE` | 503 | "Printer tidak terhubung. Cetak PDF atau coba lagi." |

Detail spec: `docs/integration/README.md`

---

## G. Algorithm Validation (Eko · Algorithm)

### Money Precision

- **Never float** — gunakan integer rupiah atau `Decimal` string
- Internal calculation: `decimal.js` atau BigInt pattern
- Display: banker's rounding ke integer IDR
- Bounds: amount >= 0; max single line item 999_999_999 IDR (configurable)

### Tax Calculation Bounds

- PPN rate: 0–100% (default 11% tenant PKP)
- DPP + PPN must reconcile to total (tolerance 0 IDR)
- Inclusive vs exclusive mode per tenant — tidak boleh mix dalam satu transaksi

### Validation Before Calculate

- Reject cart with zero/negative qty
- Reject discount > subtotal
- Price snapshot version must match active session

Spec lengkap: `docs/algorithms/PPN-SPEC.md`

---

## H. Analyst AC Templates (Dewi · Business Analyst)

**Setiap user story wajib** memiliki minimal 2 AC validasi/error:

### Template AC Validasi

```markdown
### Acceptance Criteria — Validasi & Error

- [ ] AC-VAL-1: Given input [field] invalid When submit Then response 422 + code VALIDATION_FAILED + details[field]
- [ ] AC-VAL-2: Given [business precondition fail] When action Then response 409 + code [DOMAIN_CODE] + message ID user-friendly
- [ ] AC-ERR-1: Given network timeout When retry Then UI toast + retry button max 3x
- [ ] AC-ERR-2: Given unauthorized role When access endpoint Then 403 + redirect/block UI
```

### Definition of Ready (tambahan)

- [ ] Error codes disebut eksplisit di AC (dari `ErrorCodes` enum)
- [ ] Pesan user-facing Bahasa Indonesia didefinisikan
- [ ] Edge case: empty input, boundary values, concurrent access

---

## I. Documentation (Fitri · Documentation)

### Error Codes Catalog

Lokasi: `docs/api/ERROR-CODES.md` (Fitri maintain)

Format per code:

```markdown
| Code | HTTP | Module | Message (ID) | Trigger |
|------|------|--------|--------------|---------|
| INSUFFICIENT_STOCK | 409 | transactions | Stok tidak mencukupi | qty > available |
```

### Sync Rules

- Setiap modul API baru → update ERROR-CODES.md + module API doc
- OpenAPI spec: document error responses per endpoint
- Changelog: breaking error code change = semver minor/major

---

## Priority Matrix

### P0 — Wajib MVP Sprint 1–4

| Area | Deliverable | Owner | Sprint |
|------|-------------|-------|--------|
| Global ValidationPipe + exception filter | API envelope konsisten | Fajar | S1 |
| Shared types `ApiResponse`, `ErrorCodes` | `@barokah/shared` | Fajar | S1 |
| Auth validation + error AC | Login invalid, token expired | Dewi + Fajar | S1 |
| Health check no secrets | `/health` safe response | Yoga + Fajar | S1 |
| Money/qty/barcode DTO rules | Catalog + transaction DTOs | Fajar + Eko | S2–S3 |
| Shift open gate | `SHIFT_NOT_OPEN` | Fajar | S2 |
| Stock check | `INSUFFICIENT_STOCK` | Fajar + Eko | S3 |
| UI error states wireframe | SCR-L02, K01, P01 | Maya | S1–S4 |
| ERROR-CODES.md catalog | docs/api/ | Fitri | S1 stub, S2+ per modul |
| Integration error mapping draft | Midtrans, printer | Arif | S2 draft, S4 impl |

### P1 — Post-MVP

| Area | Catatan |
|------|---------|
| OpenAPI 3.1 auto-generate dari DTO | Scalar dev portal |
| i18n multi-language error messages | Tetap ID default |
| Offline queue error sync | Mobile Expo |
| Circuit breaker dashboard | Yoga monitoring |
| Rate limit error `RATE_LIMIT_EXCEEDED` | API gateway |

---

## Sprint 1 Tasks (Fajar)

Terkait standar ini di [SPRINT-1-PLAN.md](../requirements/SPRINT-1-PLAN.md):

| Task | Action |
|------|--------|
| S1-06 Auth module | DTO validation + map ke `ErrorCodes` |
| S1-10 Health endpoint | Response envelope; **no DB credentials/secrets** |
| Global enhancement | Exception filter → `{ success: false, error: {...} }` envelope |
| ValidationPipe | Sudah ada — tambah `exceptionFactory` custom (Sprint 1 week 2) |

---

## Referensi Implementasi

- `apps/api/src/main.ts` — ValidationPipe global
- `packages/shared/src/api-types.ts` — shared types
- `.cursor/rules/api-validation-errors.mdc` — Cursor rule untuk dev
- `.cursor/skills/pos-senior-developer/SKILL.md` — section Prioritas Error Handling

---

# Pengumuman Tim — Standar Validasi & Error Handling P0

> **Tanggal:** 1 Juni 2026 · **From:** Budi Santoso (CEO)

---

**Budi** · CEO / Orchestrator

Halo tim,

**Pak Zaki** (pemilik proyek) menetapkan **standar error handling & validasi input/output sebagai prioritas P0** untuk seluruh MVP Sprint 1–4. CEO Budi mengumumkan ke tim. Dokumen lengkap: **docs/standards/ERROR-HANDLING-VALIDATION.md**.

Semua agent di bawah wajib baca, implement, dan handoff sesuai peran. **Tidak ada merge API/UI tanpa compliance standar ini.**

---

**Budi** → **Fajar (Senior Developer):**

Halo Fajar, Anda **primary owner** teknis standar ini.

| Field | Isi |
|-------|-----|
| **Task** | Implement API envelope, exception filter, DTO validation patterns |
| **Deliverable** | Exception filter, DTO examples per modul, `@barokah/shared` types |
| **P0 Sprint 1** | Enhance ValidationPipe; auth errors pakai `ErrorCodes`; health endpoint aman |
| **Parallel OK?** | Ya — shared types parallel dengan auth module |
| **Next action** | Review `api-validation-errors.mdc`; implement exception filter week 2 Sprint 1 |

---

**Budi** → **Dewi (Business Analyst):**

Halo Dewi, setiap user story **wajib** punya AC validasi & error (min 2).

| Field | Isi |
|-------|-----|
| **Task** | Tambah section AC-VAL / AC-ERR ke semua user story Epic A–D |
| **Deliverable** | Updated `docs/requirements/user-stories/*.md` |
| **P0** | Epic A Auth error AC sebelum Fajar coding login (4 Jun) |
| **Parallel OK?** | Ya — Epic B stubs parallel setelah Epic A final |
| **Next action** | Update EPIC-A-AUTH.md hari ini dengan template section H |

---

**Budi** → **Eko (Algorithm Specialist):**

Halo Eko, definisi validasi money/tax/qty untuk service layer.

| Field | Isi |
|-------|-----|
| **Task** | Money precision rules, tax bounds, rounding validation |
| **Deliverable** | Appendix di `docs/algorithms/PPN-SPEC.md` + validation bounds table |
| **P0** | Integer IDR only; reject float; tax reconcile tolerance 0 |
| **Parallel OK?** | Ya — parallel PPN spec draft Sprint 1 |
| **Next action** | Handoff bounds table ke Fajar sebelum Sprint 3 transaction module |

---

**Budi** → **Arif (Integration Specialist):**

Halo Arif, mapping error eksternal ke internal codes.

| Field | Isi |
|-------|-----|
| **Task** | External → internal error mapping Midtrans, printer |
| **Deliverable** | Section di `docs/integration/README.md` |
| **P0** | Webhook idempotency + timeout + user message ID |
| **Parallel OK?** | Ya — draft parallel Sprint 1, impl Sprint 4 |
| **Next action** | Tambah error mapping table ke integration README |

---

**Budi** → **Maya (UI/UX Specialist):**

Halo Maya, wireframe notes untuk error states kasir.

| Field | Isi |
|-------|-----|
| **Task** | Toast vs inline vs modal matrix; error copy Bahasa Indonesia |
| **Deliverable** | Update WIREFRAMES-KASIR.md error states + handoff copy ke Fitri |
| **P0** | SCR-L02 login error, SCR-S01 shift validation, SCR-K01 scan fail |
| **Parallel OK?** | Ya — parallel wireframe review Sprint 1 |
| **Next action** | Tambah error state table ke design handoff template |

---

**Budi** → **Fitri (Documentation Specialist):**

Halo Fitri, maintain error codes catalog.

| Field | Isi |
|-------|-----|
| **Task** | Buat `docs/api/ERROR-CODES.md` catalog |
| **Deliverable** | Error codes table per modul; sync dengan `@barokah/shared` enum |
| **P0** | Stub catalog Sprint 1; update per modul saat Fajar freeze API |
| **Parallel OK?** | Ya — stub parallel auth docs |
| **Next action** | Create ERROR-CODES.md skeleton; link dari AUTH.md |

---

**Budi** → **Yoga (DevOps Engineer):**

Halo Yoga, pastikan health check & monitoring tidak leak secrets.

| Field | Isi |
|-------|-----|
| **Task** | Review `/health` response; CI lint for `.env` leaks |
| **Deliverable** | Health endpoint checklist; CI secret scan note |
| **P0** | Health returns `{ status, timestamp }` only — no DB URL, no Redis password |
| **Parallel OK?** | Ya |
| **Next action** | Review S1-10 health endpoint sebelum merge |

---

**Budi** → **Hendra (Project Planner):**

Halo Hendra, masukkan compliance standar ini ke Definition of Done semua sprint.

| Field | Isi |
|-------|-----|
| **Task** | Update DoD Sprint 1–4 dengan checklist validasi/error |
| **Next action** | Add DoD item: "API response envelope compliant" |

---

**Budi** → **Rina (Spesialis POS Domain):**

Halo Rina, review error messages kasir dari sudut operasional merchant.

| Field | Isi |
|-------|-----|
| **Task** | Review copy error P0 (shift, stok, payment) |
| **Next action** | Comment di WIREFRAMES-KASIR error copy table |

---

*Standar ini efektif segera. Eskalasi ke Budi jika konflik prioritas implementasi.*
