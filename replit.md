# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   └── api-server/         # Express API server
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- Routes: `src/routes/index.ts` mounts sub-routers; `src/routes/health.ts` exposes `GET /health` (full path: `/api/health`)
- Depends on: `@workspace/db`, `@workspace/api-zod`
- `pnpm --filter @workspace/api-server run dev` — run the dev server
- `pnpm --filter @workspace/api-server run build` — production esbuild bundle (`dist/index.cjs`)
- Build bundles an allowlist of deps (express, cors, pg, drizzle-orm, zod, etc.) and externalizes the rest

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports a Drizzle client instance and schema models.

- `src/index.ts` — creates a `Pool` + Drizzle instance, exports schema
- `src/schema/index.ts` — barrel re-export of all models
- `src/schema/<modelname>.ts` — table definitions with `drizzle-zod` insert schemas (no models definitions exist right now)
- `drizzle.config.ts` — Drizzle Kit config (requires `DATABASE_URL`, automatically provided by Replit)
- Exports: `.` (pool, db, schema), `./schema` (schema only)

Production migrations are handled by Replit when publishing. In development, we just use `pnpm --filter @workspace/db run push`, and we fallback to `pnpm --filter @workspace/db run push-force`.

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Running codegen produces output into two sibling packages:

1. `lib/api-client-react/src/generated/` — React Query hooks + fetch client
2. `lib/api-zod/src/generated/` — Zod schemas

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec (e.g. `HealthCheckResponse`). Used by `api-server` for response validation.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec (e.g. `useHealthCheck`, `healthCheck`).

### `scripts` (`@workspace/scripts`)

Utility scripts package. Each script is a `.ts` file in `src/` with a corresponding npm script in `package.json`. Run scripts via `pnpm --filter @workspace/scripts run <script>`. Scripts can import any workspace package (e.g., `@workspace/db`) by adding it as a dependency in `scripts/package.json`.

## 사이트 설정 (관리자 편집)

관리자가 공지사항·상품권시세·사업자정보·이용약관을 편집할 수 있는 시스템.

- **DB 테이블**: `site_settings` (key TEXT PRIMARY KEY, value TEXT) — key-value 방식
- **공개 API**: `GET /api/site-settings` — 인증 없이 모든 설정 반환 (JSON 객체)
- **관리자 API**: `GET /api/admin/site-settings`, `PATCH /api/admin/site-settings` (body: `{key, value}`)
- **관리자 페이지**: `/admin/site-settings` → `AdminSiteSettings.tsx` (4개 탭: 시세·사업자정보·공지사항·이용약관)
- **저장 키**:
  - `rates` — JSON: `{"신세계백화점상품권": 95, ...}` (정수 퍼센트)
  - `business_info` — JSON: `{name, ceo, regNumber, mailOrder, address, phone, kakao, hours}`
  - `notice_text` — 공지 텍스트 (메인 페이지 amber 배너로 표시)
  - `notice_active` — `"true"/"false"` (공지 표시 여부)
  - `terms_service`, `terms_privacy`, `terms_guide` — 각 약관 섹션 대체 텍스트
- **프론트엔드 연동**: App.tsx (시세·공지배너), Notice.tsx (시세), BusinessInfo.tsx (사업자정보), Terms.tsx (약관) 모두 API 로드 후 fallback to hardcoded defaults
- **대시보드 링크**: AdminDashboard 헤더 상단 🖊️ 버튼으로 접근

## 채팅 다국어 번역 기능

- `artifacts/api-server/src/lib/translate.ts` — Google Cloud Translation API v2 유틸리티 (`translateAll`, `translateText`, `hasTranslationCredentials`)
- 지원 언어: 한국어(ko), 영어(en), 중국어 간체(zh-CN)/번체(zh-TW), 베트남어(vi), 일본어(ja), 태국어(th), 러시아어(ru), 몽골어(mn), 인도네시아어(id)
- 채팅 메시지 저장 시 `sendMessage` Socket.IO 이벤트에서 자동으로 모든 언어로 번역 후 `chatsTable.translatedText` JSONB에 저장
- 프론트엔드 (`src/lib/languages.ts`) — 언어 목록, `getTranslated()`, `getSavedLang()`, `saveLang()` 공용 유틸리티
- CustomerChat, StaffDetail, AdminChat 모두 언어 선택 UI (헤더 내 드롭다운) + 번역 표시 + 원문 표시 구현 완료
- **Google Cloud 자격증명 필요**: `GOOGLE_PROJECT_ID`, `GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY` 환경변수 미설정 시 번역 없이 원문 표시 (graceful fallback)
