> 📚 [Indeks Dokumentasi](../INDEX.md) | Kategori: Tim | Audience: semua agent

# Knowledge Base Tim — Barokah Core POS 2026

**Pemilik proyek:** Pak Zaki · **CEO:** Budi Santoso  
**Terakhir diperbarui:** 6 Juni 2026 (skill refresh Sprint 14 + Epic J live)  
**Tujuan:** Memastikan setiap divisi agent memakai praktik terbaru dan workflow paling efisien.

---

## Status Proyek (Jun 2026)

| Item | Status |
|------|--------|
| Sprint 13–14 | **CLOSED** |
| Epic J (storefront + `online_orders` + fulfillment) | **P0 live** |
| Test baseline | API 75/75 · web 60/60 |
| Local dev | `npm run dev` — unified launcher; `REDIS_DISABLED` fallback Windows |
| Tim | 15 anggota — lihat `AGENTS.md` |

---

## Indeks Keahlian per Divisi

| Agent | Divisi | Skill File | Ringkasan Fokus 2026 |
|-------|--------|------------|----------------------|
| **Rina** | POS Domain | `.cursor/skills/pos-domain-expert/SKILL.md` | Omnichannel, QRIS, offline-first; **keuangan & ekonomi retail SMB ID** (margin, working capital, KPI, pajak bisnis) — [FINANCE-ECONOMICS-POS.md](../domain/FINANCE-ECONOMICS-POS.md) |
| **Dewi** | Business Analyst | `.cursor/skills/pos-business-analyst/SKILL.md` | Story mapping, BDD/Gherkin, event storming, AI-assisted AC (review human) |
| **Hendra** | Project Planner | `.cursor/skills/pos-project-planner/SKILL.md` | Shape Up vs Scrum SMB, cycle planning, dependency map, AI estimasi + validasi |
| **Fitri** | Documentation | `.cursor/skills/pos-documentation/SKILL.md` | Docs-as-code, OpenAPI 3.1, Scalar/Mintlify, changelog automation |
| **Arif** | Integration | `.cursor/skills/pos-integration/SKILL.md` | Midtrans/Xendit SNAP, webhook idempotency, ESC/POS, ERP OAuth2 |
| **Eko** | Algorithm | `.cursor/skills/pos-algorithm/SKILL.md` | decimal.js, PPN 11%, promo stacking, Average Cost retail, pricing idempotent |
| **Maya** | UI/UX | `.cursor/skills/pos-ui-ux/SKILL.md` | WCAG 2.2, touch 48px, dark mode shift, skeleton, haptic mobile |
| **Fajar** | Senior Developer (Backend/API) | `.cursor/skills/pos-senior-developer/SKILL.md` | NestJS 11, Prisma 6, API contract, error envelope, Turborepo |
| **Andi** | Backend Developer (Mid) | `.cursor/skills/pos-backend-developer/SKILL.md` | NestJS modules assigned, unit/integration tests, PR under Fajar review |
| **Dimas** | Senior Frontend Developer | `.cursor/skills/pos-senior-frontend/SKILL.md` | Next.js 15, React 19, Expo 52, TanStack Query, Zustand, `@barokah/ui` |
| **Bima** | Frontend Developer (Mid) | `.cursor/skills/pos-frontend-developer/SKILL.md` | Assigned pages/components, Maya wireframe gate, Dimas PR review |
| **Citra** | QA Engineer | `.cursor/skills/pos-qa-engineer/SKILL.md` | Test plans, UAT checklists, Playwright smoke, regression gates |
| **Doni** | Full-stack Developer (Junior) | `.cursor/skills/pos-fullstack-developer/SKILL.md` | Scoped ≤3 SP tickets, dual Fajar+Dimas review, no arch ownership |
| **Yoga** | DevOps | `.cursor/skills/pos-devops/SKILL.md` | Node 22, `npm run dev`, Docker, REDIS_DISABLED fallback, GHA cache, pino, EAS |

Setiap skill file memiliki section **`## Knowledge Base 2026`** + **`## Cross-links`** — baca saat mengerjakan task di divisi terkait.

---

## Stack Teknis Bersama (Referensi Cepat)

| Komponen | Versi Proyek |
|----------|--------------|
| Node.js | 22 LTS |
| NestJS | ^11.1 |
| Next.js | ^15.3 |
| Expo | ~52 |
| Prisma | ^6.8 |
| PostgreSQL | 16 |
| Redis | 7 |
| Turborepo | ^2.5 |
| TypeScript | ^5.8 |

**Local dev:** `npm run dev` (Docker infra + hot reload). Windows tanpa Redis → otomatis `REDIS_DISABLED=true`. Detail: [LOCAL-DEV.md](../dev/LOCAL-DEV.md).

---

## Prinsip Efisiensi Lintas Tim

### 1. Shared Context
- Requirement mengalir **Rina → Dewi → Hendra** sebelum dev start (sequential wajib).
- API contract + Prisma schema **freeze** sebelum web/mobile parallel.
- Handoff log format standar di `AGENTS.md` — selalu isi Deliverable + Parallel OK? + Next action.

### 2. Docs-as-Code
- Dokumentasi hidup di repo (`docs/`), review lewat PR.
- OpenAPI 3.1 = kontrak API; Fitri update bersamaan merge API (Fajar).
- Changelog semver per release; user guide **Bahasa Indonesia** untuk modul operasional kasir.

### 3. Trunk-Based Development
- Branch pendek, merge ke main frequently.
- Feature flag untuk fitur besar (Shape Up cycle).
- CI (Yoga): lint → test → build via Turborepo cache — gate sebelum deploy staging.

### 4. AI-Assist, Human-Validate
- Agent/Cursor boleh draft checklist, AC, estimasi, docs.
- **Human review wajib** untuk: edge case domain, regulasi ID, security, UX kasir, angka estimasi.

### 5. Quality Gates (Tidak Boleh Skip)
| Gate | Owner |
|------|-------|
| Wireframe kasir | Maya → baru Dimas/Bima coding UI |
| API contract | Fajar freeze → Dimas/Bima/Andi implement |
| Backend implement | Fajar assign → Andi PR → Fajar review |
| Frontend implement | Dimas assign → Bima PR → Dimas review |
| UAT / regression | Citra → sebelum sprint close & prod |
| Spec algo/integrasi | Eko/Arif → baru Fajar/Andi logic |
| Docs release | Fitri → sebelum prod deploy |
| Infra deploy | Yoga + Fajar smoke + Citra sign-off |

---

## Reminder Refresh Bulanan (untuk Budi)

**Setiap tanggal 1**, CEO review:

- [ ] Scan release notes stack utama (NestJS, Next.js, Expo, Prisma, Node LTS).
- [ ] Cek regulasi payment/PPN BI & DJP jika ada update.
- [ ] Tanya 1 agent per minggu: "Apakah Knowledge Base 2026 di skill masih akurat?"
- [ ] Update section `Knowledge Base 2026` jika ada breaking change atau tool baru verified.
- [ ] Catat perubahan di changelog internal tim (`docs/team/` atau PR dedicated).

**Owner update skill:** masing-masing agent untuk divisinya; Budi approve merge PR knowledge refresh.

---

## Dokumen Terkait

- [AGENTS.md](../../AGENTS.md) — struktur tim + protokol koordinasi
- [COORDINATION-PLAYBOOK.md](./COORDINATION-PLAYBOOK.md) — playbook handoff detail
- [FINANCE-ECONOMICS-POS.md](../domain/FINANCE-ECONOMICS-POS.md) — domain keuangan & ekonomi POS (Rina)
- [LOCAL-DEV.md](../dev/LOCAL-DEV.md) — unified dev + Redis fallback (Yoga)
- [SPRINT-14-CLOSURE.md](../sprint/SPRINT-14-CLOSURE.md) — Epic J live milestone
- `.cursor/rules/team-communication.mdc` — protokol komunikasi agent
