> 📚 [Indeks Dokumentasi](../INDEX.md) | Kategori: Sprint Progress | Audience: Pak Zaki, Budi, Dimas, Citra



# Sprint 15 — Main Web Features Progress



> **Tanggal update:** 6 Juni 2026  

> **Status:** **PASS 2 COMPLETE** (routing hardening + carry-over web)  

> **Plan:** [SPRINT-15-PLAN.md](../requirements/SPRINT-15-PLAN.md) · **Sprint 16:** [SPRINT-16-WEB-PLAN.md](./SPRINT-16-WEB-PLAN.md)  

> **Owner frontend:** Dimas Pratama · **Owner API:** Fajar Ramadhan



---



## Ringkasan



Sprint pass fokus **alur web utama** (bukan ekspansi dashboard admin): kasir, shift, storefront, fulfillment online, offline PWA, login routing. **Pass 2 (6 Jun):** routing hardening, delivery tab stub, polling badge 15s, build ESLint fix, PWA dev stability.



| Prioritas | Fitur | Status | Catatan |

|-----------|-------|--------|---------|

| **P0** | POS Kasir `/pos` | ✅ Polish | Tab Tunai/Transfer/QRIS/Split, touch target, hold `clientRequestId` |

| **P0** | Shift buka/tutup + gate POS | ✅ Done | API `POST shifts/:id/close`, UI `/shift/close`, banner gate |

| **P0** | Storefront `/store/[slug]` | ✅ Live API | Error state ID, grid responsif |

| **P0** | Fulfillment `/pos/online-orders` | ✅ Polish | Polling 15s + timestamp |

| **P0** | Offline PWA | ✅ Verified | Banner, hold sync `clientRequestId` tetap |

| **P0** | Login routing | ✅ Done | Owner/Manager → `/dashboard`, Kasir → `/pos` |

| **P0** | Routing redirects + middleware | ✅ Done | categories/bundles redirect; auth cookie middleware |

| **P1** | Delivery checkout tab | 🟡 Stub UI | Form siap; API defer Sprint 16 (Fajar) |

| **P1** | Socket.io badge kasir | ⏳ Defer | Polling 15s + badge count (partial → S16) |



---



## Checklist P0 Main Web



| # | Item | Status |

|---|------|--------|

| 1 | Kasir: scan/search, cart, checkout cash/transfer/QRIS, hold, void | ✅ |

| 2 | Shift gate jika belum buka shift | ✅ |

| 3 | Buka shift `/shift/open` (kasir bisa akses) | ✅ |

| 4 | Tutup shift `/shift/close` + rekonsiliasi kas | ✅ |

| 5 | Storefront wired ke `store-api.ts` (bukan mock) | ✅ |

| 6 | Checkout pickup + order success | ✅ |

| 7 | Fulfillment queue PAID → READY → COMPLETED | ✅ |

| 8 | Offline banner + hold sync | ✅ |

| 9 | Login post-redirect by role | ✅ |

| 10 | Redirect `/dashboard/categories`, `/dashboard/bundles` | ✅ |

| 11 | Middleware auth + not-found role-aware | ✅ |



---



## URL Review (Dev)



| Route | Role | Kredensial seed |

|-------|------|-----------------|

| `/login` | Semua | — |

| `/dashboard` | Owner, Manager | `owner@barokah.local` / `Owner123!` · `manager@barokah.local` / `Manager123!` |

| `/dashboard/categories` | Owner, Manager | Redirect → `/master/categories` |

| `/dashboard/bundles` | Owner, Manager | Redirect → `/master/bundles` |

| `/pos` | Kasir (+ owner/manager) | `kasir@barokah.local` / `Kasir123!` |

| `/shift/open`, `/shift/close` | Kasir | Same as kasir |

| `/pos/online-orders` | Kasir (auth) | Same as kasir |

| `/store/barokah-bangunan/checkout` | Publik (guest) | Tab Pickup + Delivery (delivery stub) |



**Storefront slug seed:** `barokah-bangunan`



---



## Perubahan Teknis Pass 2 (Ringkas)



### Web (`@barokah/web`)

- `next.config.js` — redirect categories + bundles

- `src/middleware.ts` — auth session cookie guard `/dashboard/*`, `/master/*`

- `src/lib/auth.ts` — sync `barokah_auth_session` cookie

- `src/components/AuthSessionSync.tsx` — client cookie sync

- `src/app/not-found.tsx` — link dashboard untuk admin

- `src/app/store/[slug]/checkout/page.tsx` — tab Delivery + form alamat

- `src/hooks/useOnlineOrderBadge.ts` — polling 15s badge kasir

- `src/components/master/ProductFormWizard.tsx` — fix ESLint build

- `public/sw.js` + `pwa-register.ts` — skip stale chunk cache dev



---



## Verifikasi

| Perintah | Hasil |
|----------|-------|
| `npm run lint -w @barokah/web` | ✅ PASS |
| `npm run typecheck -w @barokah/web` | ✅ PASS |
| `npm run test -w @barokah/web -- --run` | ✅ **95/95** |
| `npm run build -w @barokah/web` | ✅ PASS |



---



## Defer Sprint 16



- US-J-05 Delivery API aktif (Fajar)

- Midtrans sandbox live (mock mode OK UAT)

- Socket.io real-time (polling fallback sudah ada)

- Owner admin `sellOnline` UI



---



*Disusun: Dimas Pratama (Senior Frontend) · 6 Juni 2026 · QA gate berikutnya: Citra*

