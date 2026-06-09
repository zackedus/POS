> 📚 [Indeks Dokumentasi](../INDEX.md) | Kategori: Standar | Audience: Fajar, Yoga, semua dev

# Struktur Codebase — Barokah Core POS

> **Status:** Wajib · **Prioritas:** P0  
> **Owner teknis:** Fajar Ramadhan (Senior Developer)  
> **Infra owner:** Yoga Permana (DevOps)  
> **Disetujui:** Budi Santoso · 1 Juni 2026

---

## Ringkasan

Dokumen ini adalah **panduan definitif** layout monorepo, konvensi penamaan, aturan import, dan batas modul untuk Barokah Core POS. Semua agent dan developer **wajib** mengikuti sebelum menambah fitur baru.

**Prinsip:** Modular monolith — satu repo, package reusable, API NestJS modular, tanpa microservices di MVP.

---

## A. Layout Monorepo

```
barokah-pos/
├── apps/
│   ├── api/          # NestJS REST API
│   ├── web/          # Next.js 15 App Router (admin + kasir web)
│   └── mobile/       # Expo Router (kasir mobile)
├── packages/
│   ├── shared/       # Types, constants, utils — semua app
│   ├── ui/           # Design tokens + komponen React reusable
│   └── database/     # Prisma schema + client export
├── docker/           # Docker Compose dev/prod
├── docs/             # Dokumentasi tim & domain
├── .cursor/rules/    # Cursor AI rules
├── .github/workflows/# CI/CD
├── package.json      # Root workspace scripts
├── turbo.json        # Turborepo task pipeline
├── tsconfig.base.json
├── eslint.config.js
└── .prettierrc
```

### Tanggung Jawab per Layer

| Layer | Isi | Bukan di sini |
|-------|-----|---------------|
| `apps/*` | Entry point, routing, wiring | Business logic duplikat |
| `packages/shared` | Types, enums, constants, utils murni | React components, Prisma |
| `packages/ui` | Tokens + komponen UI | API calls, domain logic |
| `packages/database` | Prisma schema, migrations, client | Service layer |

---

## B. Konvensi Penamaan

### File & Folder

| Konteks | Konvensi | Contoh |
|---------|----------|--------|
| NestJS module folder | kebab-case plural | `transactions/`, `health/` |
| NestJS class files | kebab-case + suffix | `transactions.service.ts` |
| React component file | PascalCase | `HomeHero.tsx`, `Button.tsx` |
| Hook file | camelCase dengan prefix `use` | `useHealthCheck.ts` |
| Utility file | kebab-case | `format-currency.ts` |
| Constant file | kebab-case atau grouped | `constants/app.ts` |
| Test file | `*.spec.ts` / `*.test.ts` | `transactions.service.spec.ts` |

### TypeScript / Code

| Item | Konvensi | Contoh |
|------|----------|--------|
| Interface / Type | PascalCase | `ApiSuccessResponse<T>` |
| Enum | PascalCase name, SCREAMING values | `ErrorCodes.VALIDATION_FAILED` |
| Constant | SCREAMING_SNAKE | `API_ROUTE_PREFIX` |
| Function | camelCase | `formatCurrency()` |
| NestJS class | PascalCase + suffix | `HealthController` |
| DTO class | PascalCase + Dto suffix | `CreateTransactionDto` |

---

## C. Aturan Import (@barokah/*)

### Pagination (list tables)

- **Backend:** extend `PaginationQueryDto` (`apps/api/src/common/dto/pagination-query.dto.ts`); gunakan `resolvePagination` + `buildPaginationMeta` dari `apps/api/src/common/utils/pagination.util.ts`. Response shape: `{ items, meta: { page, limit, total, totalPages } }`.
- **Frontend:** `TablePagination` + `DEFAULT_PAGE_SIZE` (25) dari `@barokah/shared`; page sizes 10/25/50/100. Helper query: `apps/web/src/lib/pagination.ts`.
- **Default page size:** 25 baris (kecuali halaman legacy yang sudah punya default berbeda, mis. deliveries dashboard 20).

### Package Aliases

| Alias | Path | Dipakai di |
|-------|------|------------|
| `@barokah/shared` | `packages/shared/src` | api, web, mobile |
| `@barokah/ui` | `packages/ui/src` | web (mobile P1) |
| `@barokah/database` | `packages/database/src` | api only |

### Aturan Wajib

```typescript
// ✅ Import dari package alias
import { APP_NAME, ErrorCodes, formatCurrency } from '@barokah/shared';
import { Button } from '@barokah/ui';

// ✅ Web internal alias
import { apiConfig } from '@/lib/api';

// ❌ Jangan deep-import lintas app
import { something } from '../../../apps/api/src/...';

// ❌ Jangan duplikasi type yang sudah ada di shared
interface ApiResponse { ... } // use @barokah/shared
```

### Dependency Direction

```
apps/api  ──► @barokah/database, @barokah/shared
apps/web  ──► @barokah/ui, @barokah/shared
apps/mobile ──► @barokah/shared (ui P1)

packages/ui ──► (standalone, peer react)
packages/shared ──► (zero app deps)
packages/database ──► (zero app deps)
```

**Larangan:** `packages/*` tidak boleh import dari `apps/*`.

---

## D. Struktur per App

### apps/api (NestJS)

```
apps/api/src/
├── main.ts                 # Bootstrap, global pipes/filters/interceptors
├── app.module.ts
├── config/                 # Config factories (app.config.ts)
├── common/
│   ├── filters/            # HttpExceptionFilter
│   ├── interceptors/       # ResponseInterceptor
│   ├── guards/             # JwtAuthGuard, RolesGuard, TenantGuard
│   └── pipes/              # validation-exception.factory
└── modules/
    └── {feature}/
        ├── {feature}.module.ts
        ├── {feature}.controller.ts
        ├── {feature}.service.ts
        └── dto/
```

**Pattern:** Controller tipis → Service (business logic) → Prisma (data access).

### apps/web (Next.js)

```
apps/web/src/
├── app/                    # App Router pages & layouts
├── components/             # App-specific components
├── hooks/                  # Custom React hooks
└── lib/                    # API client, helpers
```

**Pattern:** Server Components default; `'use client'` hanya jika perlu interaktivitas.

### apps/mobile (Expo)

```
apps/mobile/
├── app/                    # Expo Router screens
└── (components/, hooks/ — tambah saat fitur berkembang)
```

---

## E. packages/shared

```
packages/shared/src/
├── types/
│   ├── api-types.ts        # ApiResponse, ErrorCodes, PaginationMeta
│   └── enums.ts            # UserRole, PaymentMethod, TransactionStatus
├── constants/
│   ├── app.ts              # APP_NAME, APP_VERSION
│   ├── api.ts              # API_ROUTE_PREFIX, ports
│   └── tax.ts              # TAX_RATE
├── utils/
│   ├── format-currency.ts  # formatCurrency, parseCurrency (IDR)
│   └── format-date.ts      # formatDate (id-ID)
└── index.ts                # Barrel export
```

**Keputusan:** Logic murni tanpa side-effect → `utils/`. Nilai konfigurasi statis → `constants/`. Kontrak data → `types/`.

---

## F. packages/ui

```
packages/ui/src/
├── tokens/                 # colors, spacing, typography
├── components/             # Button, Input, (Modal, Toast — P1)
└── index.ts
```

Komponen wajib pakai design tokens dari `tokens/`. Lihat `docs/design/DESIGN-SYSTEM.md`.

---

## G. Decision Tree — "Taruh di Mana?"

```
Apakah dipakai 2+ app (api/web/mobile)?
├── Ya → Apakah React component?
│   ├── Ya → packages/ui
│   └── Tidak → packages/shared
└── Tidak → Apakah akses database?
    ├── Ya → apps/api/src/modules/{feature}/
    └── Tidak → Apakah halaman/route?
        ├── Web → apps/web/src/app/ atau components/
        └── Mobile → apps/mobile/app/
```

---

## H. Standar Teknis Terkait

| Dokumen | Scope |
|---------|-------|
| [ERROR-HANDLING-VALIDATION.md](./ERROR-HANDLING-VALIDATION.md) | API envelope, error codes, validasi DTO |
| [DESIGN-SYSTEM.md](../design/DESIGN-SYSTEM.md) | Tokens & komponen UI |
| `.cursor/rules/api-validation-errors.mdc` | Rule Cursor untuk API |
| `.cursor/rules/codebase-structure.mdc` | Rule Cursor struktur repo |

---

## I. Scripts Workspace

| Script | Perintah | Keterangan |
|--------|----------|------------|
| Dev | `npm run dev` | Turbo dev semua app |
| Build | `npm run build` | Build packages + apps |
| Lint | `npm run lint` | ESLint monorepo |
| Typecheck | `npm run typecheck` | tsc --noEmit |
| Format | `npm run format` | Prettier write |
| DB | `npm run db:generate` | Prisma generate |
| Docker | `npm run docker:up` | Postgres + Redis local |

---

## J. CI/CD (Yoga)

Pipeline: `.github/workflows/ci.yml`

1. `npm ci`
2. `npm run db:generate`
3. `npm run lint`
4. `npm run typecheck`
5. `npm run test`
6. `npm run build`

Docker dev: `docker/docker-compose.dev.yml` — network `barokah-dev`, healthcheck postgres & redis.

---

# Pengumuman Tim — Standar Struktur Codebase P0

> **Tanggal:** 1 Juni 2026 · **From:** Budi Santoso (CEO)

---

**Budi** · CEO / Orchestrator

Halo tim,

**Pak Zaki** (pemilik proyek) menetapkan **standar struktur codebase & infrastruktur sebagai prioritas P0**. CEO Budi mengumumkan ke tim. Dokumen lengkap: **docs/standards/CODEBASE-STRUCTURE.md**.

Semua agent wajib patuh sebelum menambah modul/fitur baru. Tidak ada PR merge tanpa compliance lint + typecheck + build.

---

**Budi** → **Fajar (Senior Developer):**

Halo Fajar, Anda **owner struktur kode**.

| Field | Isi |
|-------|-----|
| **Task** | Enforce module boundaries, shared package layout, API common layer |
| **Deliverable** | `common/filters`, `common/interceptors`, packages/shared restructure |
| **P0** | Exception filter + response interceptor; barrel exports clean |
| **Parallel OK?** | Ya — shared restructure parallel dengan infra Yoga |
| **Next action** | Review semua PR baru vs decision tree section G |

---

**Budi** → **Yoga (DevOps):**

Halo Yoga, Anda **owner infrastruktur dev & CI**.

| Field | Isi |
|-------|-----|
| **Task** | CI pipeline, Docker compose network, Dockerfiles, env template |
| **Deliverable** | `.github/workflows/ci.yml`, `docker/docker-compose.dev.yml`, Dockerfiles |
| **P0** | CI lint + typecheck + build pass di setiap PR |
| **Parallel OK?** | Ya — CI parallel dengan struktur Fajar |
| **Next action** | Monitor CI green; staging deploy Sprint 2 |

---

**Budi** → **Tim (semua agent):**

Halo semua,

| Agent | Kewajiban |
|-------|-----------|
| **Rina, Dewi, Hendra** | Requirement docs refer ke `@barokah/shared` types, bukan duplikasi |
| **Maya** | Komponen UI baru → `@barokah/ui`, bukan inline di apps/web |
| **Arif, Eko** | Spec algorithm/integration → constants/utils di shared jika reusable |
| **Fitri** | Update docs API saat modul baru; sync ERROR-CODES.md |
| **Semua dev** | `npm run lint && npm run typecheck && npm run build` sebelum handoff |

**Parallel OK?** Tidak untuk modul baru — tunggu struktur P0 merged.

**Next action:** Baca CODEBASE-STRUCTURE.md hari ini. Eskalasi ke Budi jika ada konflik pattern.

---

*— Budi Santoso, CEO Barokah Core*
