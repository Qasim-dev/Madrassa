# E-Jamia Pro — Enterprise Audit Report

**Product:** Multi-Tenant Madrassa Management System (React + Node.js + MongoDB)  
**Audit date:** 2026-07-28  
**Scope:** Full stack — Dashboard → Profile, all modules, APIs, security, UX, a11y, performance  
**Mode:** Read-only (no code changes in this phase)  
**Verdict:** Strong domain coverage for a madrassa ERP, but **not yet production-ready for thousands of schools** without closing Critical/High security, RBAC, and money-path atomicity gaps.

---

## Executive Summary

| Dimension | Score (1–5) | One-line verdict |
|-----------|-------------|------------------|
| Product completeness | 3.5 | Core academic/finance ops strong; Hostel, Staff HR, Comms, Reports hub, Users/Roles missing |
| Functional quality | 3.5 | Most modules work; mega-pages and ad-hoc validation create regression risk |
| UI / Design system | 3.0 | Tokens exist; Bootstrap+Tailwind+duplicate CSS drift; mobile sidebar weak |
| Accessibility | 2.5 | Partial ARIA; modals/drawers lack focus traps; native `alert` still used |
| Performance | 2.5 | No route lazy-loading; Exams/Finance monoliths; limited virtualization |
| Security | 2.0 | Auth exists; **no RBAC**, mass-assignable `tenantId`, public uploads, open signup |
| Backend architecture | 3.0 | Clear route modules; manual tenant filters; thin validation outside auth |
| Database | 3.0 | Good unique indexes in places; Student/Teacher/Fee list indexes thin; no soft delete |
| Test coverage | 1.0 | 2 unit files (enums only); no API/integration/security tests |
| Scalability readiness | 2.5 | App-level multi-tenancy OK if mass-assignment fixed; money paths lack transactions |

**Top 5 blockers before multi-school launch**

1. Strip / allowlist update payloads so `tenantId` cannot be rewritten (tenant isolation break).  
2. Enforce RBAC (`admin` vs `staff` currently cosmetic).  
3. Lock down `/uploads`, photo MIME, SVG logos; minimize public ID-card PII.  
4. Mongo transactions (or equivalent) for fee collect / transfers / salary pay.  
5. Production defaults: `ALLOW_SIGNUP=false`, rate limits, helmet, stronger passwords, shorter JWT TTL.

---

## Inventory Snapshot

### Frontend (`client/`)
- React 19 + Vite 8 + RTK Query + Redux + i18next (UR default) + Bootstrap 5 + Tailwind 4
- ~35 routed pages; monolothic `services/api.js` (~150+ endpoints)
- Design tokens in `design-system/tokens.css` (green `#0f8f5f`, ivory canvas, Nastaliq + Inter)
- Locale key parity: **882 keys** each in `en.json` / `ur.json` (good)

### Backend (`server/`)
- Express ESM + Mongoose; JWT Bearer; bcryptjs
- ~25 route modules, ~150+ endpoints, **48 models**
- Tenant isolation: JWT `req.tenantId` + manual query filters (no mongoose auto-filter)
- Missing: helmet, rate-limit, CSRF, refresh tokens, soft delete, structured logging

### Modules present vs expected ERP

| Module | Status |
|--------|--------|
| Login / Signup / Profile | Present (no forgot-password) |
| Dashboard | Present |
| Students / Teachers | Present (import, print, salaries) |
| Staff HR | **Absent** |
| Tartibat (sessions, subjects, darajat, books, timetable) | Present |
| Grades | Routed but **hidden from sidebar** |
| Attendance | Present |
| Student character / activities | Present |
| Exams (full pipeline) | Present (mega-page) |
| Fees / Finance / Inventory | Present |
| Library | Present |
| Speeches / Book reading | Present |
| ID cards + public verify | Present |
| Hostel | **Absent** (enum labels only) |
| Communication / SMS / announcements | **Absent** |
| Users & Roles UI | **Absent** |
| Standalone Reports | **Absent** (embedded only) |
| Settings page | **Orphaned** (`/settings` → Profile) |

---

## Findings

Severity key: **C**ritical · **H**igh · **M**edium · **L**ow · **E**nhancement · **N**ice-to-have

For each issue: ID · Module · Page/Component · Severity · Category · Description · Root Cause · Expected · Current · Solution · UX Impact · Tech Impact · Effort · Risk

---

### 1. Critical

#### AUD-C01
| Field | Detail |
|-------|--------|
| **Module** | Security / Multi-tenancy |
| **Page / Component** | Multiple PUT routes (`students`, `teachers`, `grades`, `fees`, `inventory`, `finance/accounts`, `tartibat.*`, `timetable`) |
| **Severity** | Critical |
| **Category** | Security — Broken tenant isolation |
| **Description** | Authenticated updates use `$set: req.body` (or equivalent) after matching `{ _id, tenantId }`. Client can include `tenantId` and **reassign the document to another tenant**. |
| **Root Cause** | Mass assignment; no strip/allowlist of `tenantId` on updates |
| **Expected** | Updates never change `tenantId`; only allowlisted fields accepted |
| **Current** | Creates override `tenantId` from JWT (safe); updates do not |
| **Recommended Solution** | Central `sanitizeBody(req.body, allowlist)` / `delete body.tenantId`; prefer explicit `$set` maps; add integration test proving cross-tenant move fails |
| **UX Impact** | None until exploit; then silent data loss / leakage |
| **Technical Impact** | Compromises multi-tenant trust model |
| **Effort** | M |
| **Risk** | Critical |

#### AUD-C02
| Field | Detail |
|-------|--------|
| **Module** | AuthZ |
| **Page / Component** | All protected APIs + all client routes |
| **Severity** | Critical |
| **Category** | Security — Broken access control |
| **Description** | User `role` (`admin` \| `staff`) is stored in JWT but **never enforced**. Any tenant user can delete sessions, unlock exams, collect fees, transfer funds. |
| **Root Cause** | No `requireRole` / permission middleware; no frontend route guards |
| **Expected** | Least-privilege RBAC; finance/exam admin actions restricted |
| **Current** | Authenticate-only access |
| **Recommended Solution** | Permission matrix + `requirePermission` middleware + FE `RequirePermission`; start with admin-only destructive/money actions |
| **UX Impact** | Staff cannot be safely onboarded |
| **Technical Impact** | Blocks multi-user school deployments |
| **Effort** | L |
| **Risk** | Critical |

#### AUD-C03
| Field | Detail |
|-------|--------|
| **Module** | Finance / Fees |
| **Page / Component** | `financeFlows.js`, finance transfer, salary pay |
| **Severity** | Critical |
| **Category** | Data integrity |
| **Description** | Fee collection, account transfers, and salary payments perform multi-document writes **without Mongo transactions**. Mid-failure or concurrent requests can leave balances inconsistent. |
| **Root Cause** | No `session.withTransaction`; sequential save pattern |
| **Expected** | Atomic money movements; idempotent collect endpoints |
| **Current** | Best-effort sequential updates |
| **Recommended Solution** | Mongo transactions (replica set) or single-document ledger redesign; idempotency keys on collect |
| **UX Impact** | Wrong balances, support nightmares |
| **Technical Impact** | Financial trust failure |
| **Effort** | L |
| **Risk** | Critical |

---

### 2. High

#### AUD-H01 — Public `/uploads` without auth
- **Module:** Files · **Component:** `server/src/app.js`  
- **Category:** Security — Sensitive data exposure  
- **Description:** `express.static` serves photos, receipts, PDFs, audio to anyone with the URL.  
- **Root Cause:** Convenience static mount, no signed URLs / auth middleware.  
- **Expected:** Authenticated or signed, expiring URLs; private storage.  
- **Current:** Fully public.  
- **Solution:** Auth middleware for `/uploads`, or cloud private buckets + signed URLs; scrub guessable names.  
- **UX:** Low until link leak · **Tech:** High privacy risk · **Effort:** M · **Risk:** High

#### AUD-H02 — Unfiltered student photo + SVG logos
- **Module:** Uploads · **Component:** `config/upload.js`  
- **Category:** Security — File upload  
- **Description:** `uploadPhoto` has no MIME filter; logos allow `image/svg+xml` (stored XSS vector).  
- **Expected:** Allowlist jpeg/png/webp; re-encode; reject SVG or sanitize + strict CSP.  
- **Current:** Size-only for photos; SVG allowed for logos.  
- **Solution:** Align filters; magic-byte check; strip SVG or convert to PNG.  
- **Effort:** S · **Risk:** High

#### AUD-H03 — Public ID-card verify returns extensive PII
- **Module:** ID Cards · **Component:** `publicIdCards.routes.js`, `IdCardVerifyPage`  
- **Category:** Privacy / Security  
- **Description:** Unauthenticated verify returns phone, DOB, address, guardian phone, emergency contact, photo URL. Token entropy is strong (`randomBytes(24)`), but leaked QR = full PII dump.  
- **Expected:** Minimal public fields (name, photo, status, institution); sensitive fields behind auth or OTP.  
- **Current:** Full student slice.  
- **Solution:** Split public vs private payload; audit what printers need on-card vs in verify API.  
- **Effort:** M · **Risk:** High

#### AUD-H04 — Open registration by default
- **Module:** Auth · **Component:** `auth.service.js` (`ALLOW_SIGNUP`)  
- **Category:** Security  
- **Description:** Signup creates a full tenant unless `ALLOW_SIGNUP=false`. Production misconfig = org spam / abuse.  
- **Expected:** Invite-only or admin-provisioned tenants in prod.  
- **Solution:** Default deny in prod env template; feature-flag + rate limit.  
- **Effort:** S · **Risk:** High

#### AUD-H05 — No rate limiting on login/register
- **Module:** Auth · **Component:** `app.js` / auth routes  
- **Category:** Security — Brute force  
- **Expected:** Rate limit + lockout / CAPTCHA after N failures.  
- **Current:** None.  
- **Solution:** `express-rate-limit` (or gateway) on `/api/auth/*`.  
- **Effort:** S · **Risk:** High

#### AUD-H06 — No helmet / security headers
- **Module:** Platform · **Component:** `app.js`  
- **Category:** Security hygiene  
- **Solution:** Add `helmet`, CSP tuned for SPA + uploads.  
- **Effort:** S · **Risk:** Medium–High

#### AUD-H07 — JWT 7d, no refresh/revocation
- **Module:** Auth · **Component:** `utils/jwt.js`, `authSlice`  
- **Category:** Session security  
- **Description:** Stolen token = full access for up to 7 days; logout is client-only.  
- **Expected:** Short access TTL + refresh rotation; server-side revoke list/version.  
- **Effort:** M · **Risk:** High

#### AUD-H08 — Remember me is non-functional / misleading
- **Module:** Login · **Component:** `LoginPage.jsx`, `authSlice.js`  
- **Category:** UX / Security  
- **Description:** Checkbox never read; token always in `localStorage`.  
- **Expected:** Session storage vs localStorage (or cookie) based on remember.  
- **Effort:** S · **Risk:** Medium (trust) / High (XSS token theft surface always on)

#### AUD-H09 — No route-level code splitting
- **Module:** App shell · **Component:** `App.jsx`  
- **Category:** Performance  
- **Description:** All pages eager-imported including Exams (~2.6k LOC), Finance, Inventory, Fees, Character.  
- **Expected:** `React.lazy` + `Suspense` per route.  
- **Effort:** S · **Risk:** High (TTFB/TTI on low-end devices)

#### AUD-H10 — ExamsPage mega-component + duplicate marks query
- **Module:** Exams · **Component:** `ExamsPage.jsx`  
- **Category:** Performance / Maintainability  
- **Description:** ~2609 lines; many parallel RTKQ hooks; marks queried twice.  
- **Expected:** Phase-based lazy panels; single marks subscription.  
- **Effort:** L · **Risk:** High

#### AUD-H11 — Mobile sidebar always visible
- **Module:** Layout · **Component:** `MainLayout.jsx`  
- **Category:** Responsive UX  
- **Description:** On small screens sidebar stays in flow (`max-h` ~52vh), consuming half the viewport; no hamburger drawer.  
- **Expected:** Collapsible off-canvas nav with focus trap.  
- **Effort:** M · **Risk:** High (mobile usability)

#### AUD-H12 — No Error Boundary
- **Module:** App · **Component:** `main.jsx` / `App.jsx`  
- **Category:** Reliability  
- **Description:** Render errors white-screen the entire SPA.  
- **Expected:** Root + route error boundaries with recovery CTA.  
- **Effort:** S · **Risk:** High

#### AUD-H13 — Catch-all redirects to Dashboard (no 404)
- **Module:** Routing · **Component:** `App.jsx`  
- **Category:** UX / QA  
- **Description:** Unknown URLs silently become `/`.  
- **Expected:** Dedicated 404 page.  
- **Effort:** S · **Risk:** Medium–High (support confusion)

#### AUD-H14 — Modal / FilterDrawer missing focus trap
- **Module:** UI kit · **Component:** `AppModalShell.jsx`, `FilterDrawer.jsx`  
- **Category:** Accessibility (WCAG 2.1.2 / 2.4.3)  
- **Description:** Escape works; Tab can escape dialog into background.  
- **Expected:** Focus trap, initial focus, restore focus on close.  
- **Effort:** M · **Risk:** High (a11y / compliance)

#### AUD-H15 — Grades hidden from navigation
- **Module:** Academic · **Component:** `GradesPage` vs `MainLayout` menu  
- **Category:** Product / Discoverability  
- **Description:** `/grades` routed and breadcrumbed but not in sidebar.  
- **Expected:** Visible under Tartibat/People or merge with Darajat intentionally.  
- **Effort:** S · **Risk:** Medium (feature orphan)

#### AUD-H16 — SettingsPage orphaned
- **Module:** Settings · **Component:** `SettingsPage.jsx`  
- **Category:** Dead code / Product  
- **Description:** `/settings` redirects to Profile; page unused (`BasicTartibatPanel` stranded).  
- **Expected:** Single settings IA or delete orphan.  
- **Effort:** S · **Risk:** Medium (maintenance)

#### AUD-H17 — Weak password policy (min 6)
- **Module:** Auth · **Component:** `auth.routes.js` / `auth.service.js`  
- **Category:** Security  
- **Expected:** Min 8–12, complexity or zxcvbn; breach checks optional.  
- **Effort:** S · **Risk:** High

#### AUD-H18 — Seed logs default admin password
- **Module:** Ops · **Component:** `seed.js`  
- **Category:** Security hygiene  
- **Description:** Default `Admin@123` printed to console.  
- **Expected:** One-time random password or force change; never log secrets in prod docs.  
- **Effort:** S · **Risk:** High (if seed used carelessly)

---

### 3. Medium

#### AUD-M01 — Unescaped `$regex` in book reading search
- **Module:** Book Reading · **File:** `bookReading.service.js`  
- **Category:** Security / Stability (ReDoS)  
- **Solution:** Use `escapeRegex` like students/library/search.  
- **Effort:** S · **Risk:** Medium

#### AUD-M02 — express-validator only on auth
- **Module:** API · **Category:** Validation  
- **Description:** Most CRUD trusts client shape → mass assignment surface, bad data.  
- **Solution:** Shared validators / Zod schemas per resource.  
- **Effort:** L · **Risk:** Medium

#### AUD-M03 — `passwordHash` not `select: false`
- **Module:** User model · **Effort:** S · **Risk:** Medium (future leak)

#### AUD-M04 — Attendance engine `findById` without tenant
- **Module:** Attendance · **File:** `attendanceEngine.service.js`  
- **Category:** Defense-in-depth  
- **Solution:** `findOne({ _id, tenantId })`.  
- **Effort:** S · **Risk:** Low–Medium

#### AUD-M05 — Missing compound indexes (Student/Teacher/FeeItem lists)
- **Module:** Database · **Category:** Performance  
- **Description:** List filters by session/darjah/subject lack compound indexes beyond `tenantId`.  
- **Solution:** Add `{ tenantId, sessionId, darjahId }` etc. after query audit.  
- **Effort:** M · **Risk:** Medium (scale)

#### AUD-M06 — No soft delete / audit trail for core entities
- **Module:** Data model · **Category:** Product / Compliance  
- **Description:** Hard deletes; limited audit (fees/exams only).  
- **Expected:** Soft delete + activity log for students, fees, users.  
- **Effort:** L · **Risk:** Medium

#### AUD-M07 — Inventory / library / exam multi-write non-atomic
- **Module:** Inventory, Library, Exams · **Category:** Integrity  
- **Effort:** M–L · **Risk:** Medium

#### AUD-M08 — CNIC / phone validation missing
- **Module:** Students / Teachers forms · **Category:** Form validation  
- **Description:** Free text; no PK CNIC pattern, phone normalize, or server-side format checks.  
- **Effort:** M · **Risk:** Medium (data quality)

#### AUD-M09 — No unsaved-changes guards on large forms
- **Module:** Student/Teacher/Exams · **Category:** UX  
- **Effort:** M · **Risk:** Medium

#### AUD-M10 — Profile password change: no confirm / weak client checks
- **Module:** Profile · **Effort:** S · **Risk:** Medium

#### AUD-M11 — Signup password inputs lack HTML `required` / strength UI
- **Module:** Signup · **Effort:** S · **Risk:** Medium

#### AUD-M12 — Design token duplication (`tokens.css` vs `appDesignSystem.css`)
- **Module:** Design system · **Category:** Consistency  
- **Description:** Claimed SSOT undermined by redeclared `--app-*` hex values + Bootstrap/Tailwind stack.  
- **Effort:** M · **Risk:** Medium (drift)

#### AUD-M13 — Hardcoded bilingual strings bypass i18n
- **Module:** Many pages · **Category:** Localization  
- **Description:** `en ? '…' : '…'` and ID-card chrome strings; locale files stay incomplete for those UX paths.  
- **Effort:** M · **Risk:** Medium

#### AUD-M14 — Global search always navigates to `/students?q=`
- **Module:** Header · **Component:** `AppHeaderSearch.jsx`  
- **Category:** Product UX  
- **Expected:** Route by suggestion type (teacher, darjah, student).  
- **Effort:** S · **Risk:** Medium

#### AUD-M15 — Native `alert` / `confirm` still widespread
- **Module:** Students, Inventory, Finance, Character, ConfirmDelete · **Category:** UX / a11y  
- **Effort:** M · **Risk:** Medium

#### AUD-M16 — Combobox a11y incomplete in header search
- **Module:** Header · **Category:** Accessibility  
- **Description:** `listbox` without combobox pattern / arrow keys / `aria-activedescendant`.  
- **Effort:** M · **Risk:** Medium

#### AUD-M17 — Disabled / muted contrast risks
- **Module:** Design tokens · **Category:** Accessibility  
- **Description:** Opacity 0.45 tabs; muted `#9aa0ab` on ivory may fail WCAG AA for small text.  
- **Effort:** S · **Risk:** Medium

#### AUD-M18 — Dual `useGetGradesQuery` + unconditional settings refetch on StudentForm
- **Module:** Students · **Category:** Performance  
- **Effort:** S · **Risk:** Low–Medium

#### AUD-M19 — DataTable no virtualization
- **Module:** Shared UI · **Category:** Performance  
- **Description:** OK with pagination; risky if callers pass large arrays.  
- **Effort:** M · **Risk:** Medium

#### AUD-M20 — Topbar overcrowded on narrow screens
- **Module:** Layout · **Category:** Responsive  
- **Effort:** M · **Risk:** Medium

#### AUD-M21 — ID card Latin-forced font / Latin back icons
- **Module:** ID Cards · **Components:** `StudentIdCard.jsx`, `studentIdCard.css`  
- **Category:** UX / RTL  
- **Description:** Inter stack on card; back icons `F/D/S…`; local `--sid-*` greens diverge from DS.  
- **Effort:** M · **Risk:** Medium (print quality)

#### AUD-M22 — Test coverage near-zero
- **Module:** QA · **Category:** Quality  
- **Description:** Only enum unit tests; no tenant isolation / money / auth tests.  
- **Effort:** L · **Risk:** High long-term (listed Medium as process debt)

#### AUD-M23 — No forgot-password / reset flow
- **Module:** Auth · **Category:** Product  
- **Effort:** M · **Risk:** Medium (support load)

#### AUD-M24 — Finance mega-pages (Finance ~1.6k, Inventory ~1.3k, Fees ~1k)
- **Module:** Finance cluster · **Category:** Maintainability  
- **Effort:** L · **Risk:** Medium

#### AUD-M25 — Student form load error silently redirects
- **Module:** Students · **Category:** UX  
- **Effort:** S · **Risk:** Low–Medium

---

### 4. Low

| ID | Module | Description | Effort |
|----|--------|-------------|--------|
| AUD-L01 | Login | Prayer clock `aria-live` every second is noisy for screen readers | S |
| AUD-L02 | DataTable | Loading state lacks `role="status"` / `aria-busy` | S |
| AUD-L03 | AppModalShell | Close `aria-label="Close"` hardcoded English | S |
| AUD-L04 | Login footer | Hardcoded English brand line | S |
| AUD-L05 | ID cards | Selection Set lost on refresh; no select-all-matching-filters | S |
| AUD-L06 | ID cards | Preview prefers English institution name | S |
| AUD-L07 | Public verify | `qrToken` index is tenant-scoped; public lookup is by token alone (entropy mitigates) | S |
| AUD-L08 | Logging | No structured logger (winston/pino); console only | M |
| AUD-L09 | CORS | Single origin OK; document multi-env origins | S |
| AUD-L10 | xlsx dependency | Historical CVE surface for imports | M |
| AUD-L11 | Axios unused? | Listed in client deps while RTKQ is primary | S |
| AUD-L12 | Character i18n | Stale `character.comingSoon` keys unused | S |
| AUD-L13 | Login | Remember defaults true while non-functional | S |
| AUD-L14 | Typography | Inter is generic SaaS default (brand differentiation) | E |

---

### 5. Enhancement

| ID | Module | Description | Effort |
|----|--------|-------------|--------|
| AUD-E01 | Product | Dedicated Reports hub (attendance, fees, exams, character exports) | L |
| AUD-E02 | Product | Staff module (library already has `staff` borrower type) | L |
| AUD-E03 | Product | Hostel module (attendance category exists as label only) | L |
| AUD-E04 | Product | Communication / announcements / SMS gateway | L |
| AUD-E05 | Product | User management UI + invite flow | L |
| AUD-E06 | Product | Bulk actions consistency (export/import everywhere) | M |
| AUD-E07 | UX | Activity timeline / audit viewer for students & fees | M |
| AUD-E08 | UX | Global keyboard shortcuts (new student, search focus) | S |
| AUD-E09 | Perf | Virtualize long tables / ID card print batches | M |
| AUD-E10 | Design | Collapse Bootstrap usage; Tailwind + DS tokens only | L |
| AUD-E11 | ID cards | Move chrome strings into locale files; Nastaliq on UR cards | M |
| AUD-E12 | Architecture | Split `api.js` by domain injectEndpoints | M |
| AUD-E13 | Architecture | Split ExamsPage into phase route segments | L |

---

### 6. Nice to Have

| ID | Description |
|----|-------------|
| AUD-N01 | Dark mode (not present; tokens are light-only) |
| AUD-N02 | Offline / PWA shell for attendance marking |
| AUD-N03 | Real-time notifications (WebSocket) |
| AUD-N04 | Biometric / device attendance integration |
| AUD-N05 | Multi-campus within one tenant |
| AUD-N06 | Parent portal (read-only fees/results) |
| AUD-N07 | Advanced analytics / BI export to Power BI |
| AUD-N08 | Hijri calendar polish beyond current Urdu toggle |

---

## Product Owner — Journey Gaps

| Journey | Assessment |
|---------|------------|
| New org signup → first student | Works but weak password + open signup risk |
| Daily attendance | Usable; mobile layout hurts field use |
| Collect fee | Works functionally; atomicity risk under concurrency |
| Run exam cycle | Powerful but cognitively heavy single page |
| Print ID cards | Mature; privacy on public verify too broad |
| Onboard staff user with limited rights | **Blocked** (no RBAC / user admin) |
| Recover forgotten password | **Blocked** |
| Hostel / staff HR / SMS parents | **Missing** |
| Find Grades feature | **Hard** (no nav) |
| Trust “Remember me” | **Broken promise** |

---

## Implementation Plan (post-approval)

### Phase 0 — Quick wins (1–3 days)
1. Strip `tenantId` (+ `_id`) on all PUT/PATCH bodies; allowlist where easy (**AUD-C01**)  
2. `escapeRegex` in book reading (**AUD-M01**)  
3. `passwordHash: { select: false }` (**AUD-M03**)  
4. Photo MIME allowlist; disallow SVG logos (**AUD-H02**)  
5. `React.lazy` routes + root Error Boundary + 404 page (**AUD-H09/H12/H13**)  
6. Grades link in sidebar OR intentional merge/remove (**AUD-H15**)  
7. Delete or rewire `SettingsPage` orphan (**AUD-H16**)  
8. Fix Remember me or remove checkbox (**AUD-H08**)  
9. Rate limit + helmet + `ALLOW_SIGNUP` default false in `.env.example` (**AUD-H04/H05/H06**)  
10. Stronger password min length (**AUD-H17**)

### Phase 1 — Security hardening (1–2 weeks)
- RBAC matrix + middleware + FE guards (**AUD-C02**)  
- Public uploads lockdown / signed URLs (**AUD-H01**)  
- Minimize ID verify PII (**AUD-H03**)  
- JWT refresh strategy (**AUD-H07**)  
- Forgot password flow (**AUD-M23**)  
- Integration tests: tenant isolation, authz, mass-assignment

### Phase 2 — Money & data integrity (1–2 weeks)
- Transactions for fee/finance/salary (**AUD-C03**)  
- Inventory/library atomicity (**AUD-M07**)  
- Compound indexes (**AUD-M05**)  
- Soft delete strategy for students/fees (**AUD-M06**)

### Phase 3 — UX / a11y / mobile (1–2 weeks)
- Focus traps for modal/drawer (**AUD-H14**)  
- Mobile off-canvas sidebar (**AUD-H11**)  
- Replace `alert`/`confirm` (**AUD-M15**)  
- CNIC/phone validation + unsaved guards (**AUD-M08/M09**)  
- Search deep-link by entity type (**AUD-M14**)  
- Contrast pass on muted/disabled (**AUD-M17**)

### Phase 4 — Performance & architecture (ongoing)
- Split Exams / Finance mega-pages (**AUD-H10/M24**)  
- Token SSOT cleanup; reduce Bootstrap surface (**AUD-M12/E10**)  
- Domain-split RTK API (**AUD-E12**)  
- Table virtualization where needed (**AUD-M19/E09**)

### Phase 5 — Product expansion (roadmap)
- Users & roles UI, Reports hub, Staff, Hostel, Communications (**AUD-E01–E05**)

---

## Checklists

### UI consistency
- [ ] Single token source (`--ds-*` only); remove duplicate `:root` in `appDesignSystem.css`
- [ ] One control height for inputs/buttons/selects
- [ ] Modal / drawer / toast patterns only (no native alert)
- [ ] PageHeading + toolbar + FilterDrawer on every list page
- [ ] Empty / loading / error states standardized
- [ ] ID card colors map to DS primary

### Performance
- [ ] Route lazy loading
- [ ] Split mega pages by tab/phase
- [ ] Paginate all list APIs; verify FE never loads unbounded arrays
- [ ] Audit RTKQ duplicate subscriptions (marks, grades)
- [ ] Image lazy-load on lists; compress uploads server-side
- [ ] Compound indexes for filtered lists

### Security
- [ ] TenantId immutable on updates
- [ ] RBAC on every mutating route
- [ ] Rate limit auth
- [ ] Helmet + CSP
- [ ] Private uploads
- [ ] Upload MIME + size + magic bytes
- [ ] Minimize public PII
- [ ] Password policy + hash select:false
- [ ] Signup disabled in production by default
- [ ] Security regression tests

### Accessibility
- [ ] Focus trap + restore on dialogs/drawers
- [ ] Visible focus rings (tokens already define `--ds-shadow-focus`)
- [ ] Combobox pattern for search
- [ ] All icon buttons have accessible names (i18n)
- [ ] Forms associate labels / errors (`role="alert"`)
- [ ] Contrast AA for body and UI text
- [ ] Keyboard path for tables and tabs

### Testing
- [ ] API: auth, tenant isolation, mass-assignment negative tests
- [ ] API: fee collect concurrency / transaction
- [ ] FE: critical journeys (login, student create, fee collect, exam publish)
- [ ] a11y smoke (axe) on Login, Students, Fees, Modal
- [ ] RTL visual smoke (Urdu)
- [ ] Mobile viewport smoke (sidebar, tables)

### Technical debt
- [ ] Remove orphan SettingsPage or restore route
- [ ] Remove unused Axios if confirmed unused
- [ ] Split `api.js` and mega pages
- [ ] Replace inline bilingual with locale keys
- [ ] Structured logging + request IDs
- [ ] Soft delete + audit events

---

## Suggested commit groups (when implementation approved)

1. `security: prevent tenantId mass-assignment on updates`  
2. `security: harden uploads MIME filters and disallow SVG logos`  
3. `security: add helmet and auth rate limiting`  
4. `fix: default ALLOW_SIGNUP off; strengthen password policy`  
5. `fix: escape book-reading search regex; passwordHash select false`  
6. `perf: lazy-load routes and add error boundary + 404`  
7. `ux: fix remember-me or remove; add grades to nav; remove settings orphan`  
8. `a11y: focus trap for modals and filter drawer`  
9. `fix: mobile off-canvas sidebar`  
10. `feat: RBAC middleware and route guards` (larger)  
11. `fix: transactional fee/finance money paths` (larger)  
12. `privacy: minimize public ID-card verify payload`

---

## Appendix A — Confirmed `$set: req.body` hotspots

```
server/src/routes/students.routes.js
server/src/routes/teachers.routes.js
server/src/routes/grades.routes.js
server/src/routes/fees.routes.js          (items + balances)
server/src/routes/inventory.routes.js
server/src/routes/finance.routes.js       (accounts)
server/src/routes/tartibat.subjects.routes.js
server/src/routes/tartibat.darajat.routes.js
server/src/routes/timetable.routes.js     (slots + entries)
```
(+ tartibat.books / exams schedule via body spread / Object.assign)

**Allowlisted (safer):** settings PATCH, library book PUT, sessions PUT.

## Appendix B — What is already solid

- JWT auth with tenant claim; most list/get/delete queries include `tenantId`
- Strong ID-card QR token entropy
- Bilingual i18n key parity (882/882)
- Design token foundation and shared UI kit (`FormField`, `DataTable`, `ModalForm`, KPI cards)
- Deep domain workflows: exams pipeline, fees+finance, tartibat, ID cards, student character
- CORS locked to `CLIENT_ORIGIN` (not `*`)
- Fee/Exam audit logs exist as starting point for compliance

---

## Next step

**No code was changed in this phase.**  

Please review this report and approve which phase to implement first. Recommended start: **Phase 0 quick wins** (tenant mass-assignment fix + upload/auth hardening + lazy routes), then **Phase 1 RBAC**.
