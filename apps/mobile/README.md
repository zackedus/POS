# Barokah POS — Mobile (Expo)

> **Status Phase 6 (Jun 2026):** Scaffold MVP — login API + layar home/kasir placeholder. Full offline kasir = **Fase 2**.

## What's included

| Screen | Route | Status |
|--------|-------|--------|
| Home | `/` | ✅ Link ke login & kasir |
| Login | `/login` | ✅ POST `/api/v1/auth/login` |
| Kasir | `/pos` | 🚧 Placeholder UI (Phase 2) |

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
npm run dev:mobile
```

## Dev credentials (seed)

| Role | Email | Password |
|------|-------|----------|
| Kasir | `kasir@barokah.local` | `Kasir123!` |
| Owner | `owner@barokah.local` | `Owner123!` |

## Phase 2 roadmap

- Secure token storage (`expo-secure-store`)
- POS catalog + checkout (shared logic with web)
- Offline queue sync (ADR-003 optional track)

Owner: **Dimas Pratama** · `@frontend`
