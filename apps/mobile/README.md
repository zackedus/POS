# Barokah POS — Mobile (Expo)

> **Status Phase 7 (Jun 2026):** Login + secure session + daftar produk read-only. Full offline kasir = **Fase 2**.

## What's included

| Screen | Route | Status |
|--------|-------|--------|
| Home | `/` | ✅ Session restore + link kasir |
| Login | `/login` | ✅ POST auth + `expo-secure-store` |
| Kasir | `/pos` | ✅ Product grid + keranjang tunai sederhana + deep link web POS |

## Phase 8 scope (Jun 2026)

- **Included:** secure session, product grid API, keranjang + checkout cash (butuh shift aktif di API)
- **Deep link:** `EXPO_PUBLIC_WEB_POS_URL` + token query untuk lanjut di web kasir
- **Not included:** offline queue, split/QRIS, thermal, shift UI native
- **Workaround:** tombol **Buka kasir web lengkap** di layar `/pos`

## Secure storage

Token disimpan via `expo-secure-store` (`apps/mobile/lib/session.ts`):

- `barokah_mobile_access`
- `barokah_mobile_refresh`
- `barokah_mobile_user`

Session di-restore saat app boot (`app/_layout.tsx`).

## Run locally

```bash
# From monorepo root — API + web + mobile
npm run dev:all:mobile

# Or mobile only (API must be running on :3000)
npm run dev:mobile
```

Set API URL for physical device / emulator:

```bash
# PowerShell example
$env:EXPO_PUBLIC_API_URL = "http://192.168.1.10:3000/api/v1"
$env:EXPO_PUBLIC_WEB_POS_URL = "http://192.168.1.10:3001/pos"
npm run dev:mobile
```

## Dev credentials (seed)

| Role | Email | Password |
|------|-------|----------|
| Kasir | `kasir@barokah.local` | `Kasir123!` |
| Owner | `owner@barokah.local` | `Owner123!` |

## Honest scope

- **Included:** auth, session persist, preview katalog 20 SKU, keranjang tunai MVP
- **Not included:** offline queue, thermal print, shift open/close native
- **Workaround:** tap link **Buka kasir web** di layar `/pos`

## Phase 9 roadmap

- Offline queue sync (ADR-003 optional track)
- Native shift + QRIS checkout

Owner: **Dimas Pratama** · `@frontend`
