# Vercel 배포 준비 (DEPLOY)

> 이 문서는 **배포 전 준비**만 다룬다. 실제 배포·Supabase 설정 변경은 사용자가 직접 수행한다.

## 1. 사전 확인 (개발 머신)

| 항목 | 확인 방법 | 상태 |
| --- | --- | --- |
| 프로덕션 빌드 | `npm run build` → `Compiled successfully` | 이 단계에서 통과 확인 |
| 타입 검사 | `npx tsc --noEmit` | 통과 |
| 린트 | `npm run lint` | 통과 |
| 단위 테스트 | `npm run test` | 통과 |
| Node 버전 | `package.json` `engines.node = ">=20.9.0"` (Vercel 기본 Node 22 호환) | |
| 패키지 매니저 | npm (`package-lock.json` 커밋됨) | |
| 빌드 산출물 제외 | `.gitignore` 에 `/.next/`, `/out/`, `/build`, `/node_modules`, `.vercel` | |
| 환경변수 파일 제외 | `.gitignore` 에 `.env*` (단, `!.env.example`) — `git ls-files | grep .env` 결과가 `.env.example` 뿐 | |

## 2. Vercel 에 등록할 환경변수 (이름만)

Vercel 프로젝트 > Settings > Environment Variables 에서 아래 **이름**으로 등록한다.
값은 Supabase 대시보드 > Project Settings > API 에서 확인한다.

| 변수명 | 노출 | 용도 | 대상 환경 |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | 브라우저 노출 OK | Supabase 프로젝트 URL | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 브라우저 노출 OK (공개 anon 키, RLS 로 통제) | Supabase 공개 클라이언트 키 | Production, Preview, Development |

- **`service_role` 키는 등록하지 않는다.** 이 앱은 사용하지 않는다.
- `NEXT_PUBLIC_` 접두사가 붙은 두 변수만 브라우저 번들에 포함된다. 그 외 서버 전용 비밀은 없다.
- 로컬은 `.env.local` (Git 제외). `vercel env pull .env.local` 로도 받을 수 있다.

### 환경별 차이

| 환경 | Supabase 프로젝트 | 비고 |
| --- | --- | --- |
| Development (`npm run dev`, localhost:3000) | 개발용 또는 공용 1개 | `.env.local` |
| Preview (PR 배포, `*-git-*.vercel.app`) | 개발용과 공유 가능 | Preview 도메인은 배포마다 바뀜 → 아래 3번 Redirect URL 에 와일드카드 등록 |
| Production (`<프로젝트>.vercel.app` 또는 커스텀 도메인) | 운영용 권장 (개발용과 분리) | |

> 개발·운영 Supabase 를 분리하면 각 Vercel 환경에 서로 다른 URL/anon 키를 넣는다.
> MVP·발표용으로 하나만 쓸 경우 세 환경에 같은 값을 넣어도 된다.

## 3. Supabase Auth 설정

Supabase 대시보드 > **Authentication > URL Configuration**.

### Site URL
운영 도메인 하나를 지정한다. 예:
```
https://<프로젝트>.vercel.app
```
(커스텀 도메인이 있으면 그것)

### Redirect URLs (허용 목록)
아래를 모두 추가한다:
```
http://localhost:3000/**
https://<프로젝트>.vercel.app/**
https://<프로젝트>-*.vercel.app/**      ← Preview 배포 (와일드카드)
```
- 현재 앱은 이메일·비밀번호 로그인만 쓰므로 OAuth 콜백 경로는 없지만,
  향후 매직링크·비밀번호 재설정을 붙일 때를 대비해 `/**` 로 등록한다.
- 로컬과 배포의 차이: 로컬은 `http://localhost:3000`, 배포는 `https://…vercel.app`.
  같은 Supabase 프로젝트를 쓰면 두 URL 을 모두 허용 목록에 둔다.

### 공개 회원가입
**Authentication > Sign In / Providers** 에서
**"Allow new users to sign up"** 를 **끈다**(직원만 사용). 사용자 추가는
**Authentication > Users > Add user** (Auto Confirm 체크).

## 4. 세션 갱신 / 렌더링 확인

| 항목 | 상태 |
| --- | --- |
| `proxy.ts` (Next.js 16, 구 middleware) | Vercel 에서 각 요청 전에 실행됨. `@supabase/ssr` 표준 패턴으로 세션 쿠키 갱신 |
| 보호 페이지 (`/home`, `/customers/**`, `/transactions/**`, `/prices`, `/calendar`, `/analytics`) | `requireUser()` + `cookies()` 사용 → 항상 요청 시 렌더(동적). `next build` 출력에서 `ƒ (Dynamic)` 확인 |
| `/home`, `/prices`, `/calendar`, `/analytics`, `/transactions` | `export const dynamic = "force-dynamic"` 명시 → 사용자별 데이터가 정적 캐시로 공유되지 않음 |
| `/` (랜딩) | `getUser()` → 로그인 시 `/home` 로 리다이렉트 |
| `/login` | 정적 (`○`). 폼 제출은 Server Action |
| 서버 전용 코드 | `lib/**/queries.ts` 는 `import "server-only"`. `service_role` 미사용 |

## 5. 배포 절차 (사용자 수행)

1. GitHub 저장소를 Vercel 에 Import (Framework: Next.js 자동 감지)
2. 위 2번 환경변수 등록 (Production/Preview/Development)
3. 첫 배포 → 배포 URL 확인
4. 위 3번대로 Supabase Site URL / Redirect URLs 갱신
5. `docs/DEMO_DATA.md` 로 샘플 데이터 적용 (운영 Supabase 기준)
6. 아래 6번 스모크 테스트

## 6. 배포 후 스모크 테스트

| # | 확인 | 기대 |
| --- | --- | --- |
| 1 | 배포 URL 접속 (로그아웃 상태) | `/login` 또는 홈 → 로그인 화면 |
| 2 | 잘못된 계정으로 로그인 | "이메일 또는 비밀번호가 올바르지 않습니다." |
| 3 | 정상 로그인 | `/home`, 상단 네비게이션 표시 |
| 4 | 홈 대시보드 수치 | 샘플 기준값(`docs/DEMO_DATA.md §7`)과 일치 |
| 5 | 네비게이션 홈/고객관리/거래관리/시세관리/캘린더/종합분석 이동 | 정상, 현재 위치 강조 |
| 6 | 고객 등록 → 거래 등록 | 저장·이동 정상, 새로고침 후 유지 |
| 7 | 고객 검색·필터·조합 | `docs/INTEGRATION_CHECKLIST.md D` |
| 8 | 홈 일정 위젯 탭 전환 | `docs/INTEGRATION_CHECKLIST.md C6` |
| 9 | 로그아웃 → 보호 URL 직접 접근 | `/login` 으로 이동 |
| 10 | 존재하지 않는 `/customers/<임의 UUID>` | 404 페이지 |
| 11 | 브라우저 콘솔 | Supabase 키/내부 오류 노출 없음 (anon 키는 정상 노출) |
| 12 | 다른 사용자 계정 (있으면) | 첫 사용자의 데이터가 보이지 않음 |
