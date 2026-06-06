# httpOnly Auth — Production Path Verification

> **Owner:** Fajar (API) + Dimas (web) · Phase 7 Lane F · 6 Juni 2026

## Aktivasi

Set di environment web (build-time):

```bash
NEXT_PUBLIC_USE_HTTPONLY_AUTH=true
NODE_ENV=production
```

Dev lokal (tanpa production build):

```bash
NEXT_PUBLIC_USE_HTTPONLY_AUTH=true npm run dev:web:fallback
```

## Alur yang diverifikasi

| Step | Path | Expected |
|------|------|----------|
| Login | `POST /api/auth/login` | Set cookie `barokah_access_token` + `barokah_refresh_token` (httpOnly) |
| API call | `/api/proxy/[...path]` | Bearer dari cookie server-side |
| Refresh | `POST /api/auth/refresh` | Cookie refresh → access token baru |
| Logout | `POST /api/auth/logout` | Cookie di-clear |
| Middleware | `/pos`, `/dashboard` | `barokah_access_token` atau session cookie = akses OK |

## Automated coverage

- `apps/web/src/middleware.test.ts` — cookie `barokah_access_token` mengizinkan `/pos`
- `apps/web/src/lib/auth.ts` — `useHttpOnlyAuthPath()` + `credentials: 'include'`
- Playwright smoke — login owner/kasir (localStorage path di dev; production pakai cookie)

## Manual UAT (Pak Zaki)

1. Build production web: `npm run build --workspace=@barokah/web`
2. Jalankan dengan `NEXT_PUBLIC_USE_HTTPONLY_AUTH=true` + API running
3. Login owner → dashboard tanpa token di localStorage (cek DevTools Application)
4. Refresh halaman → tetap login
5. Logout → redirect login, cookie hilang

## Catatan keamanan

- Dev default tetap localStorage (dokumentasi di Sprint 1) — production wajib httpOnly
- CSP hardening = defer Phase 8 (lihat `BUGS-GAPS-AUDIT-2026-06.md`)
