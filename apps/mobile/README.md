# Barokah POS — Mobile (Expo)

> **Status Phase 7 (Jun 2026):** Login + secure session + daftar produk read-only. Full offline kasir = **Fase 2**.

## What's included

| Screen | Route | Status |
|--------|-------|--------|
| Home | `/` | ✅ Session restore + link kasir |
| Login | `/login` | ✅ POST auth + `expo-secure-store` |
| Kasir | `/pos` | ✅ Product grid API (read-only) + link web POS |

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

- **Included:** auth, session persist, preview katalog 15 SKU
- **Not included:** checkout, shift, offline queue, thermal print
- **Workaround:** tap link **Buka kasir web** di layar `/pos`

## Phase 8 roadmap

- POS catalog + checkout (shared logic with web)
- Offline queue sync (ADR-003 optional track)

Owner: **Dimas Pratama** · `@frontend`
