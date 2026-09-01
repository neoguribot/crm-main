@AGENTS.md

# CLAUDE.md

금거래소 CRM (제일금거래소 일루이 대전관저점). Next.js + Supabase.
이전 Spring Boot MVP 는 `archive/spring-boot-mvp` 브랜치와 태그에 보존되어 있다.

이 저장소는 클라이언트 요구사항이 확정되기 전 프로토타입으로 시작했다. 코드와
클라이언트 원본 요구사항이 다르면 **항상 원본 요구사항을 따른다** — 기존 코드에
이미 구현돼 있다는 것은 그대로 둘 근거가 되지 못한다.

## 기술 스택 (확정)

- Next.js 16 App Router + TypeScript
- Supabase (PostgreSQL + Auth)
- Tailwind CSS v4 + shadcn/ui
- 배포: Vercel
- 패키지 매니저: npm

> Next.js 16 은 학습 데이터와 다른 breaking change 가 있다. 코드 작성 전 `node_modules/next/dist/docs/` 의 관련 가이드를 확인한다(AGENTS.md 참고).

## 개발 원칙

- App Router 와 TypeScript 를 사용한다.
- 가능한 한 Server Component 를 기본으로 한다. 사용자 상호작용이 필요한 부분만 Client Component 로 만든다.
- 데이터 변경은 Server Action, 외부·프로토콜 진입점(인증 콜백 등)은 Route Handler 로 한다.
- 데이터베이스는 Supabase PostgreSQL, 인증은 Supabase Auth 를 사용한다.
- Supabase 클라이언트는 브라우저용(`createBrowserClient`, anon key)과 서버용(`createServerClient`, cookies)을 구분한다.
- `service_role` 키는 브라우저 코드/클라이언트 번들에 절대 포함하지 않는다. `NEXT_PUBLIC_` 접두사를 붙이지 않는다.
- 모든 테이블에 Row Level Security 를 적용한다.
- UI 는 Tailwind CSS 와 shadcn/ui 로 구성한다. React 등 외의 별도 프론트엔드 프레임워크를 추가하지 않는다.
- **DB 저장은 정수 코드**(성별 0/1/2, 거래구분 1/2, 거래품목 01~99, 완료여부 1/2).
  앱 레벨(zod 검증·폼·라벨)은 가독성을 위해 문자열 식별자를 쓰고,
  `lib/types/codes.ts` 가 Supabase 조회/저장 시점에만 변환한다. 새 코드값 필드를
  추가할 때도 이 패턴을 따른다.
- 금액·중량은 JavaScript 부동소수점 계산에 의존하지 않는다. PostgreSQL `numeric` 에
  저장하고, 조회 시 `::text` 캐스팅해 문자열로 받는다(캐스팅을 빠뜨리면 숫자로
  와서 포맷 함수가 깨진다 — 실제로 한 번 발생했던 버그).
- 날짜/시간대 기준은 `Asia/Seoul` 고정이다. 순수 날짜는 `date`, 타임스탬프는 `timestamptz`(UTC 저장).
- 환경변수와 비밀키를 Git 에 커밋하지 않는다. `.env.example` 에는 키 이름만 둔다.
- 기존에 정상 작동하는 기능을 깨뜨리지 않는다.
- 구현 후 타입 검사(`npx tsc --noEmit`), 린트(`npm run lint`), 빌드(`npm run build`), 관련 테스트를 실행한다.
- 스키마 변경은 기존 마이그레이션 파일을 고치지 말고 다음 번호로 새 파일을 추가한다.

## 기능 범위

1. 고객 정보 관리(조회·등록·수정·삭제)
2. 거래 정보 관리(조회·등록·수정·삭제) — 고객 상세 안, `/transactions` 양쪽에서
3. 시세 정보 관리(등록·이력·알림) — `/prices`
4. 홈 대시보드(`/home`) — 일정 위젯, 매출 지표, 목표 도달 현황, 최근 거래, 방문목적 통계
5. 고객 일정 관리(`customer_events`) — 여러 건 동시 관리, 거래와 선택적 연동
6. 캘린더(`/calendar`), 종합 분석(`/analytics`)
7. Excel 내보내기/불러오기 — 고객: `/customers` 목록(현재 필터 그대로 `.xlsx`),
   `/customers/import`(양식 업로드 → 검증 → 일괄 등록, 연락처 중복 자동 건너뜀).
   거래: `/transactions` 목록(현재 필터 그대로 `.xlsx`, 내보내기 전용).
   공통 컬럼 정의 `lib/{customers,trades}/excel-columns.ts`, 워크북 `*/excel-workbook.ts`.
8. 마케팅 메시지(`/marketing`) — 메시지 템플릿(변수 치환), 대상 선택·미리보기, 발송,
   발송 이력. 카카오 알림톡/SMS 는 솔라피(Solapi) 연동(`lib/messaging/solapi.ts`,
   `SOLAPI_API_KEY`/`SOLAPI_API_SECRET`). 미설정 시 "수동 처리"로 기록 + 문구 복사/CSV.
   발송 설정(매장명·발신번호·pfId)은 `users` 테이블(0029).
9. 프로모션 세그먼트(`/marketing` 하단) — `marketing_segments()` RPC(0030)로
   휴면·신규 미거래·생일 임박·목표가 도달·우수/VIP 케어·추천 유도 6개 그룹을 뽑아
   그룹째 발송(`/marketing/send?segment=<key>`)·추천 문구로 템플릿 생성까지 연결.
   정의·정규화는 `lib/marketing/segment-defs.ts`(순수), 조회는 `segments.ts`.

### 아직 없는 기능 (다음 단계)
- 종합분석 PDF 내보내기, 거래 내역 Excel 내보내기 컬럼 추가 검토
- 사용자 설정 화면(비밀번호 변경 UI)
- 알림톡 실제 발송: 솔라피 가입 + 카카오 채널 + 템플릿 검수(코드는 준비됨)

### 삭제된 기능
- 파이프라인(`/pipeline`, 영업 단계 칸반 보드) — 원본 요구사항에 없어 삭제 확정.
  `customers.stage`, `customer_stage` enum 도 함께 제거됨(`0011`).
- `/reminders` 별도 페이지 — 원본 요구사항대로 홈 대시보드에 통합됨(필터 탭 포함).

## 데이터 모델

- `customers` 1 : N `trade_records`, 1 : N `customer_events`(일정, 거래와 선택적 연동)
- `users` 는 `auth.users` 와 1:1 프로필(이름·목표값만, 인증 자체는 Supabase Auth)
- id 는 UUID (`gen_random_uuid()`), owner 는 `owner_id`(모든 조회는 RLS 로 범위가 걸림)
- 성별·거래구분·거래품목·완료여부는 **DB 정수 코드**(`lib/types/codes.ts` 참고).
  방문목적·유입경로는 다중 선택이라 `text[]` (정수 코드화 대상 아님).
- 금액 `numeric(15,0)`, 중량 `numeric(10,3)`, 시세 `numeric(15,0)`
- 최근 방문일 / 리마인드 상태는 저장하지 않고 조회 시 계산
  - 최근 방문일 = `max(trade_records.trade_date)` ∨ `customers.registered_on`
  - 리마인드 분류(`customer_events.event_date` 기준, 홈 위젯 탭): 오늘(기본) / 기한 지남 / 7일 이내
    (8일 이후는 어느 탭에도 표시하지 않음)
- 시세(`gold_prices`)는 등록할 때마다 새 이력(`registered_at`)이 쌓인다 — 하루 1건
  덮어쓰기 아님. 목표가 도달 알림의 `dedupe_key` 는 "목표+이번 시세 등록 건" 단위라
  같은 날 여러 번 다시 도달해도 각각 알림이 생긴다.

값 체계는 `lib/types/database.ts`(상수·타입), `lib/labels.ts`(한글 라벨),
`lib/types/codes.ts`(DB 정수 변환)에 분리 관리한다.

## 명령

```bash
npm run dev       # 개발 서버 (http://localhost:3000)
npm run build     # 프로덕션 빌드
npx tsc --noEmit  # 타입 검사
npm run lint      # 린트
npm run test      # 단위 테스트 (Vitest)
```

## 진행 상황

Next.js + Supabase 스택으로 원본 요구사항 확정본 반영 완료(마이그레이션 `0001`~`0030`).
addendum 요구사항(라벨 2축 분리·추천인·지표 카드)과 후속 UX 개선(홈 대시보드 개편,
고객/거래 화면 필터·달력 개선, 종합분석 신규 지표)까지 반영됨.
마케팅 자동화 1~3단계(고객·거래 Excel, 메시지 템플릿·발송·이력, 프로모션 세그먼트)
코드 반영 완료 — **`0027`~`0030` 마이그레이션 적용 필요**
(`supabase/marketing_0027-0030.sql`). 후속 작업은 위 "아직 없는 기능" 참고.
