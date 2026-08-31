# 금거래소 CRM

제일금거래소 일루이 대전관저점을 위한 고객·거래·시세·일정 관리 CRM. Next.js + Supabase.

클라이언트 원본 요구사항 문서를 기준으로 구현했다(요구사항이 확정되기 전 만들어진
초기 프로토타입에서 출발했으며, 코드와 요구사항이 다를 경우 항상 요구사항을 따른다).

| 항목 | 값 |
| --- | --- |
| 저장소 | <https://github.com/neoguribot/crm-main> (private) |
| 앱 배포 (Vercel) | _아직 미배포_ — 배포 후 `https://<프로젝트>.vercel.app` 로 이 줄을 교체 |
| 소개 페이지 (GitHub Pages) | _아직 미배포_ — 저장소 Settings → Pages 활성화 후 `https://neoguribot.github.io/crm-main/` |

> 앱(Next.js)은 **Vercel** 에, `site/` 아래 정적 소개 페이지는 **GitHub Pages** 에 배포한다.
> 소개 페이지는 앱과 무관하며 배포하지 않아도 앱 사용에 지장 없다.

## 기술 스택

| 항목 | 내용 |
| --- | --- |
| 프레임워크 | Next.js 16 (App Router) |
| 언어 | TypeScript |
| 데이터베이스 | Supabase PostgreSQL |
| 인증 | Supabase Auth (이메일·비밀번호) |
| UI | Tailwind CSS v4, shadcn/ui |
| 검증 | zod |
| 테스트 | Vitest |
| 배포 | Vercel |
| 패키지 매니저 | npm |
| Node.js | 20.9 이상 |

## 빠른 시작 (로컬)

처음부터 끝까지 순서대로:

1. **클론 · 의존성**
   ```bash
   git clone https://github.com/neoguribot/crm-main.git
   cd crm-main
   npm install
   ```
2. **Supabase 프로젝트 생성** — <https://supabase.com> 에서 새 프로젝트 하나.
3. **환경변수** — `cp .env.example .env.local` 후 아래 두 값을 채운다
   (Supabase 대시보드 → Project Settings → API):

   | 변수명 | 설명 |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | 프로젝트 URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 공개(anon/publishable) 키 — 브라우저 노출 OK, RLS 로 통제 |

   `.env.local` 은 Git 에 커밋되지 않는다(`.gitignore`). `service_role` 키는 쓰지 않는다.
4. **스키마 적용** — Supabase 대시보드 → SQL Editor 에 `supabase/combined_migrations.sql`
   전체를 붙여넣고 Run (또는 `supabase/migrations/0001`~`0025` 를 순서대로).
   상세는 [`supabase/README.md`](./supabase/README.md).
5. **직원 계정 생성** — Supabase 대시보드 → Authentication → Users → **Add user**,
   이메일·비밀번호 입력, **Auto Confirm User** 체크. (회원가입 UI 는 없다 — 아래 "인증" 참고)
6. **(선택) 시연용 샘플 데이터** — [`docs/DEMO_DATA.md`](./docs/DEMO_DATA.md) 참고,
   `supabase/seed/demo_data.sql` 에 5번에서 만든 사용자 UUID 를 넣고 SQL Editor 에서 실행.
7. **개발 서버** — `npm run dev` → <http://localhost:3000> → 5번 계정으로 로그인.

## 실행 · 검사

```bash
npm run dev            # 개발 서버 http://localhost:3000
npx tsc --noEmit       # 타입 검사
npm run lint           # 린트
npm run test           # 단위 테스트 (Vitest)
npm run build          # 프로덕션 빌드
```

## 데이터베이스 (Supabase)

적용 방법·RLS·인덱스·numeric 처리 근거는 [`supabase/README.md`](./supabase/README.md).
마이그레이션은 `supabase/migrations/0001` ~ `0025` 를 번호 순서대로 SQL Editor 에
붙여넣어 적용한다. 각 파일 상단 주석에 목적이 적혀 있다.

핵심만 요약하면:
- `0001`~`0008` — 초기 스키마와 고객/거래 항목 개편(프로토타입 단계)
- `0009`~`0011` — 요구사항 확정본 반영: 성별·등급·완료여부 필드, 거래구분·거래품목
  정수 코드화, 파이프라인(구 기능) 제거
- `0012`~`0014` — 고객 일정(`customer_events`, 여러 건 동시 관리, 거래 연동), 사용자
  프로필(`users`, 월 매출 목표값), 마지막 연락일 자동 갱신 트리거
- `0015`, `0018` — 홈 대시보드·종합분석용 집계 RPC
- `0016` — 거래 삭제 RLS 정책
- `0017` — 시세를 "하루 1건 덮어쓰기"가 아닌 "등록마다 쌓이는 이력"으로 전환
- `0019` — 단일 `grade` 를 빈도 라벨(신규/단골)·매출 라벨(일반/우수/VIP) 두 축으로 분리
- `0020` — 고객 간 추천인 연결(`referred_by_customer_id`, 자기참조 FK)
- `0021` — 홈 "거래 수 현황"을 거래 고객 수(distinct)가 아닌 거래 건수 기준으로 변경
- `0022` — 고객 유입경로·방문목적 "기타" 선택 시 세부 내용 컬럼 추가
- `0023` — 고객의 첫 거래 등록 시 `first_trade_date` 자동 갱신 트리거
- `0024` — 홈 "방문 목적별 고객 수"에 기간별(오늘/이번 주/이번 달/올해) 보기 추가,
  "최근 거래 내역"에 단가·중량·완료 여부 포함
- `0025` — 종합분석에 방문 목적별 평균 방문 빈도·품목 분포·누적 거래 수 상위 고객 추가

발표·시연용 가상 샘플 데이터: [`docs/DEMO_DATA.md`](./docs/DEMO_DATA.md), `supabase/seed/demo_data.sql`.

## 인증

이메일·비밀번호 로그인만 사용한다. 회원가입·비밀번호 재설정 UI는 미구현(계정은
Supabase 대시보드에서 직접 생성 — 아래 참고). `auth.users` 에 계정이 생성되면
트리거가 `public.users` 프로필 행을 자동으로 만든다.

- `proxy.ts` (Next.js 16, 구 `middleware.ts`) 가 매 요청 세션을 갱신하고 보호 경로를 통제한다.
- 각 보호 페이지는 서버에서 `supabase.auth.getUser()` 로 인증을 다시 확인한다.
- 로그인 성공 → `/home`(기본 화면), 로그아웃 → `/login`, 미인증 보호 경로 → `/login`,
  로그인 상태로 `/login`/`/` 접근 → `/home`.
- 사용자별 데이터 분리(`owner_id`). 로그인한 사용자는 자기 고객·거래만 본다.

### 테스트 사용자 만들기

Supabase 대시보드 > Authentication > Users > **Add user** > 이메일·비밀번호 입력, **Auto Confirm User** 체크.
회원가입은 **Sign In / Providers** 에서 끄는 것을 권장(직원만 사용).

## 기능 범위

1. 고객 정보 관리 — 조회·등록·수정·삭제, 성별·빈도 라벨(신규/단골)·매출 라벨(일반/우수/
   VIP)·유입경로·방문목적(각 "기타" 선택 시 세부 내용 입력)·추천인(이름/전화번호로
   검색하는 콤보박스로 기존 고객 연결) 등. 날짜 입력은 생년월일을 제외하고 모두 달력
   팝오버 지원
2. 거래 정보 관리 — 조회·등록·수정·삭제(`/transactions`), 고객 상세 안에서도 등록 가능.
   고객 선택은 이름/전화번호 검색 콤보박스, 거래일은 달력 팝오버, 검색은 거래구분·완료
   여부·거래일 구간 필터 지원
3. 시세 정보 관리 — 시세 이력 등록·수정·삭제, 목표가 도달 알림(`/prices`)
4. 홈 대시보드 — 오늘의 고객 관리 일정(오늘/기한 지남/7일 이내 탭), 거래 수 현황(오늘/
   어제/진행중/완료 + 이번 주·이번 달·올해 누적), 매출 지표, 목표 도달 현황(판매+매입
   합산, 월 매출 목표 인라인 수정), 최근 거래 내역(거래일·구분·이름·품목·단가·중량·
   총 금액·완료 여부), 방문 목적별 고객 수(전체/오늘/이번 주/이번 달/올해 보기)
5. 캘린더 — 월 단위로 고객 일정 보기, 연월 라벨 클릭 시 팝오버로 연/월 바로 이동(`/calendar`)
6. 종합 분석 — 성별·연령대·유입경로(왼쪽) / 빈도 라벨·매출 라벨·방문 목적별 평균 방문
   빈도·품목 분포(오른쪽) 분포, 누적 거래액·누적 거래 수 상위 고객(`/analytics`)
7. 고객 상세 — 일정 섹션(문의/예약/맞춤주문/재방문/시세알림/생일/안부 등 여러 건 동시
   관리, 진행 중인 거래와 연동), 지표 카드(누적 매출액·거래 횟수·평균 재방문 주기·
   라벨, 차트 없이 숫자로만 표시), 추천인 표시. 첫 거래 등록 시 첫 거래일자 자동 갱신
8. 고객 목록 — 이름·라벨·방문 목적·마지막 연락일·전화번호 표시, 방문목적/유입경로/
   빈도·매출 라벨 체크박스 다중 선택 필터 + 방문일 구간(달력 팝오버) + 필터링된 목록
   연락처 일괄 복사

### 다음 단계로 미룬 기능

- 엑셀·PDF 내보내기
- 사용자 설정 화면(비밀번호 변경 UI, 지금은 Supabase 대시보드에서 직접 변경)

## 경로

| 경로 | 설명 | 인증 |
| --- | --- | --- |
| `/` | 랜딩 (로그인 시 `/home` 로) | - |
| `/login` | 로그인 | - |
| `/home` | 홈 대시보드(일정·매출지표·목표·최근거래) | 필요 |
| `/customers` | 고객 목록 + 검색·세그먼트 필터 | 필요 |
| `/customers/new` | 신규 고객 등록 | 필요 |
| `/customers/[id]` | 고객 상세 + 거래 이력 + 일정 | 필요 |
| `/customers/[id]/edit` | 고객 수정 | 필요 |
| `/customers/[id]/trades/new` | 거래 기록 추가 | 필요 |
| `/transactions` | 거래 관리(검색·신규등록·수정·삭제) | 필요 |
| `/transactions/new` | 신규 거래 등록(고객 선택) | 필요 |
| `/transactions/[id]` | 거래 상세·수정·삭제 | 필요 |
| `/prices` | 시세 관리(등록·이력·알림) | 필요 |
| `/calendar` | 캘린더(월 단위 일정) | 필요 |
| `/analytics` | 종합 분석 | 필요 |

## 프로젝트 구조

```
app/
  layout.tsx            루트 레이아웃 + 공통 네비게이션(AppNav)
  page.tsx  login/  logout/
  home/  customers/  transactions/  prices/  calendar/  analytics/
    calendar/month-nav.tsx (연월 팝오버 선택)
    (+ 각 loading.tsx)
  error.tsx  not-found.tsx  global-error.tsx  icon.svg
components/
  app-nav.tsx  copyable-phone.tsx  customer-combobox.tsx (이름/전화번호 검색 선택)  ...
  ui/                    shadcn/ui (button, card, input, label, select,
                         checkbox, textarea, badge, skeleton, money-input,
                         date-input, calendar-date-field, calendar-grid, popover)
lib/
  constants.ts labels.ts date.ts calendar.ts number.ts phone.ts
  supabase/    env·client·server·middleware·require-user·auth-errors
  customers/   queries·filters·recent-visit·match·label-suggestion·revisit-interval
  trades/      queries·holdings
  events/      queries (고객 일정)
  prices/      queries·actions·target
  users/       queries·actions (프로필·목표값)
  dashboard/   queries·summary·period
  analytics/   queries·summary
  reminders/   queries·filters·status (홈 대시보드 일정 위젯에 통합됨)
  validation/  customer·trade-record·customer-event·flatten
  types/       database.ts (앱 레벨 타입) codes.ts (DB 정수 코드 변환)
supabase/
  migrations/  0001 ~ 0025
  seed/        demo_data.sql
  README.md
docs/
  DEMO_DATA.md  INTEGRATION_CHECKLIST.md  DEMO_SCENARIO.md  DEPLOY.md
proxy.ts               세션 갱신 + 보호 경로 통제
```

## 배포

### 앱 — Vercel

1. **Import** — <https://vercel.com/new> 에서 `neoguribot/crm-main` 저장소를 Import.
   Framework 는 Next.js 로 자동 감지된다.
2. **환경변수** — Project → Settings → Environment Variables 에 아래 두 개를
   Production / Preview / Development 모두에 등록:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

   (`service_role` 키는 등록하지 않는다. 로컬은 `vercel env pull .env.local` 로도 받을 수 있다.)
3. **첫 배포** → 배포 URL 확인 (`https://<프로젝트>.vercel.app`).
4. **Supabase Auth 갱신** — 대시보드 → Authentication → URL Configuration
   - Site URL: `https://<프로젝트>.vercel.app`
   - Redirect URLs: `http://localhost:3000/**`, `https://<프로젝트>.vercel.app/**`,
     `https://<프로젝트>-*.vercel.app/**` (Preview 배포용 와일드카드)
   - Sign In / Providers 에서 **"Allow new users to sign up" 끄기** (직원만 사용)
5. **배포 후** — 배포 URL 로 접속해 로그인 → `docs/DEPLOY.md §6` 스모크 테스트.

환경변수 이름·환경별 차이·렌더링 확인·스모크 테스트 전체 표는
[`docs/DEPLOY.md`](./docs/DEPLOY.md).

CLI 로 하려면:

```bash
npm i -g vercel
vercel link                       # 프로젝트 연결
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel --prod                     # 프로덕션 배포
```

### 소개 페이지 — GitHub Pages (선택)

`site/index.html` (정적 소개 페이지, 앱 아님) 을 `.github/workflows/pages.yml` 가
`main` 에 `site/**` 변경이 푸시될 때 자동 배포한다.

- **한 번만 켜기**: 저장소 → Settings → Pages → Source 를 **"GitHub Actions"** 로.
  (기본 토큰으로는 워크플로가 Pages 를 스스로 켜지 못해 첫 실행이 실패한다.)
- 켠 뒤 워크플로를 재실행하면 `https://neoguribot.github.io/crm-main/` 에 게시된다.
- 소개 페이지가 필요 없으면 `.github/workflows/pages.yml` 을 삭제해도 된다.
