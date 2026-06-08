# Customer / Member CRM — Domain Spec

> Modul CRM pelanggan retail SMB Barokah Core POS (Fase 2).
> Owner domain: **Rina** · Algoritma poin: **Eko** · API: **Fajar** · UI: **Dimas**

---

## Ringkasan

Modul ini mengelola **profil member**, **alamat ganda**, **poin loyalitas** (ledger), **piutang/deposit** (integrasi finance P0), dan **kartu member** (digital + cetak).

## Entitas

| Entitas | Deskripsi |
|---------|-----------|
| `Customer` | Profil member: nama, HP (unik per tenant), email opsional, `memberCode`, `memberSince`, `notes`, `points` (saldo agregat), `creditLimit` |
| `CustomerAddress` | Alamat ganda: label (Rumah/Kantor/Proyek), baris alamat, kota, provinsi, kode pos, `isDefault` |
| `LoyaltyPointLedger` | Audit trail poin: `EARN`, `REDEEM`, `ADJUST` — immutable |
| `Receivable` / `CustomerDeposit` | Piutang & deposit — modul finance existing |

## Aturan Bisnis

### Member code
- Auto-generate saat create/register: format `MBR-XXXXXXXX`
- Unik per tenant
- Regenerate hanya **Owner** (`POST /customers/:id/member-card/regenerate-code`)

### Alamat
- Satu alamat `isDefault` per pelanggan
- Alamat pertama otomatis jadi default
- Hapus default → promote alamat tertua

### Poin loyalitas
- **Earn:** saat checkout selesai — rate dari tenant settings
- **Redeem:** saat checkout — max % dari net setelah promo
- Setiap perubahan saldo **wajib** catat `LoyaltyPointLedger` dengan `balanceAfter`
- `Customer.points` = saldo agregat (cache); ledger = source of truth historis

### Kartu member
- QR payload: `barokah:member:{tenantSlug}:{memberCode}`
- POS dapat scan QR atau ketik kode `MBR-…` → lookup pelanggan
- Tier: stub `Standard` (Fase 3: tier engine)

### RBAC
| Aksi | Owner | Manager | Kasir |
|------|-------|---------|-------|
| List / lookup / detail | ✓ | ✓ | ✓ |
| Edit profil / alamat | ✓ | ✓ | — |
| Regenerate member code | ✓ | — | — |
| Lihat piutang/deposit/poin | ✓ | ✓ | ✓ (POS) |

## API Endpoints

| Method | Route | Deskripsi |
|--------|-------|-----------|
| GET | `/customers` | List + search (nama/HP/kode) + snapshot piutang/deposit |
| GET | `/customers/lookup?phone=` | Lookup POS by HP |
| GET | `/customers/lookup/by-code?code=` | Lookup POS by member code / QR |
| GET/PATCH | `/customers/:id` | Profil |
| GET/POST/PATCH/DELETE | `/customers/:id/addresses` | CRUD alamat |
| GET | `/customers/:id/loyalty-ledger` | Riwayat poin |
| GET | `/customers/:id/finance-summary` | Piutang + deposit + limit |
| GET | `/customers/:id/member-card` | Data kartu + QR payload |
| POST | `/customers/:id/member-card/regenerate-code` | Regenerate (owner) |

Finance existing (tetap dipakai):
- `GET /receivables/customers/:id/summary`
- `GET /deposits/customers/:id`

## UI Dashboard

- `/dashboard/customers` — list dengan badge member, poin, piutang, deposit
- `/dashboard/customers/[id]` — tab: Profil, Alamat, Poin, Piutang, Deposit, Kartu Member

## POS

- Input HP + scan/ketik kode member
- Panel info: kode member, poin, piutang, deposit, limit kredit
- Checkout: earn/redeem poin + tempo/deposit (existing)

## Out of Scope (Fase 2)

- Login member dengan password
- Tier loyalty otomatis
- Storefront public member card URL (P1)

---

*Terakhir diperbarui: 9 Jun 2026*
