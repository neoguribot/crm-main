# Supabase 설정

이 디렉터리는 데이터베이스 스키마(마이그레이션 SQL)와 적용 방법을 담는다.
`0001` ~ `0030` 을 번호 순서대로 적용하면 현재 앱과 일치하는 스키마가 된다.

## 1. 환경변수

`.env.local` (Git 제외) 에 다음을 채운다. 값은 Supabase 대시보드 >
Project Settings > API 에서 확인한다.

| 변수 | 설명 |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | 프로젝트 URL. 공개되어도 되는 값 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 공개(anon) 키. 브라우저에 노출되며 RLS 로 통제됨 |

> **키 명칭에 대해:** Supabase 가 새 API 키 체계(`sb_publishable_...` / `sb_secret_...`)를
> 도입했지만, `@supabase/ssr` 기반 Next.js 공식 가이드와 `create-next-app` 예제는
> 여전히 `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` 를 사용하며
> anon 키도 계속 유효하다. 그래서 기존 `.env.example` 이름을 그대로 둔다.
> publishable 키로 전환할 경우 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 자리에 그 값을 넣으면 된다.

`service_role`(비밀) 키는 이 앱의 일반 코드에서 사용하지 않는다. RLS 를 우회하기 때문이다.

## 2. 마이그레이션 적용

### 방법 A — SQL Editor (권장, 프로젝트만 있으면 됨)

1. Supabase 대시보드 > SQL Editor
2. `migrations/` 의 파일을 **번호 순서대로** 붙여넣고 실행한다.
   - `0001_initial_schema.sql` — 테이블·enum·인덱스·트리거·RLS
   - `0002_dashboard_summary.sql` — 대시보드 요약 RPC(`dashboard_summary()`)
   - `0003_customer_delete.sql` — 고객 DELETE 정책 + trade_records FK on delete cascade
   - `0004_customer_stage.sql` — 고객 `stage`(영업 단계) 컬럼 — 이후 0011 에서 삭제(파이프라인 제거)
   - `0005_customer_count_by_period.sql` — 기간별 고객수 RPC
   - `0006_price_targets_notifications.sql` — 목표가격·시세·알림 테이블
   - `0007_trade_item_revamp.sql` — 거래 품목 개편(enum→text, 단가 추가)
   - `0008_customer_fields_revamp.sql` — 고객 항목 개편(유입경로/방문목적 다중선택 등)
   - `0009_missing_fields.sql` — 성별·등급·완료여부 필드 추가
   - `0010_integer_codes.sql` — 거래구분·거래품목 정수 코드화 + 고아 enum 정리
   - `0011_remove_pipeline.sql` — 파이프라인 삭제에 따른 `stage` 제거
   - `0012_customer_events.sql` — 고객 일정(`customer_events`) 테이블, 여러 건 동시 관리
   - `0013_users_table.sql` — 사용자 프로필(`users`, 목표값) 테이블
   - `0014_last_contact_trigger.sql` — 거래 등록 시 마지막 연락일 자동 갱신
   - `0015_dashboard_summary_v3.sql` — 홈 통합 대시보드용 지표 확장
   - `0016_trade_records_delete.sql` — 거래관리 화면의 거래 삭제를 위한 DELETE 정책
   - `0017_gold_price_history.sql` — 시세를 "하루 1건 덮어쓰기"에서 "등록마다 쌓이는
     이력"으로 전환(`price_date` → `registered_at timestamptz`)
   - `0018_customer_analytics.sql` — 종합 분석 화면용 집계 RPC(`customer_analytics()`)
   - `0019_customer_labels.sql` — 단일 `grade` → 빈도 라벨(`frequency_label`, 신규/단골)·
     매출 라벨(`revenue_label`, 일반/우수/VIP) 두 축으로 분리, `customer_analytics()` 재작성
   - `0020_customer_referrer.sql` — 고객 간 추천인 연결(`referred_by_customer_id`, 자기참조 FK)
   - `0021_dashboard_trade_counts.sql` — 홈 "거래 수 현황"을 거래 고객 수(distinct)가 아닌
     거래 건수 기준으로 변경, 진행 중/완료 건수 추가(`dashboard_summary()` 재작성)
   - `0022_customer_other_details.sql` — 유입경로·방문목적 "기타" 선택 시 세부 내용 컬럼
     (`inflow_channel_detail`, `purchase_purpose_detail`) 추가
   - `0023_first_trade_date_trigger.sql` — 고객의 첫 거래 등록 시 `first_trade_date` 자동 갱신
   - `0024_dashboard_purpose_periods.sql` — "방문 목적별 고객 수"에 기간별(오늘/이번 주/
     이번 달/올해) 보기 추가, "최근 거래 내역"에 단가·중량·완료 여부 포함
     (`dashboard_summary()` 재작성)
   - `0025_customer_analytics_v3.sql` — 종합분석에 방문 목적별 평균 방문 빈도·품목 분포·
     누적 거래 수 상위 고객 추가(`customer_analytics()` 재작성)
   - `0026_customer_analytics_referrers.sql` — 종합분석 "상위 고객"에 최다 추천 고객
     (`top_referrers`, 추천인으로 지정된 횟수 순) 추가(`customer_analytics()` 재작성)
   - `0027_message_templates.sql` — 마케팅: 고객 연락 메시지 템플릿(`message_templates`,
     채널 ALIMTALK/SMS/MANUAL, 변수 토큰 본문, 알림톡 템플릿 코드)
   - `0028_message_log.sql` — 마케팅: 메시지 발송 이력(`message_log`, 상태
     PENDING/SENT/FAILED/MANUAL, 치환 완료 문구 저장)
   - `0029_marketing_settings.sql` — `users` 에 발송 설정 컬럼 추가
     (`store_name`, `sender_phone`, `kakao_pf_id`). 발송 대행사 API 키는 환경변수
   - `0030_marketing_segments.sql` — 프로모션 세그먼트 집계 RPC(`marketing_segments()`):
     휴면·신규 미거래·생일 임박·목표가 도달·우수/VIP 케어·추천 유도
3. 각 스크립트는 멱등이라 여러 번 실행해도 안전하다.
4. 스키마 변경은 기존 파일을 고치지 말고 `0027_*.sql` 처럼 새 파일로 추가한다.

### 방법 B — Supabase CLI

```bash
supabase link --project-ref <프로젝트 ref>
supabase db push
```

### 적용 후 타입 생성(선택)

```bash
supabase gen types typescript --linked > lib/types/database.generated.ts
```

현재 `lib/types/database.ts` 는 손으로 작성한 정의다. 생성 타입으로 교체하거나
병행할 수 있다.

## 3. 데이터 모델 요약

- `customers` 1 : N `trade_records`, 1 : N `customer_events`(일정, 거래와 선택적 연동)
- `users` 는 `auth.users` 와 1:1(프로필/목표값만 저장, 인증 자체는 Supabase Auth)
- 모든 행은 `owner_id`(= `auth.users.id`) 에 묶인다. `owner_id` 기본값은 `auth.uid()`.
- 최근 방문일 / 리마인드 상태는 **컬럼으로 저장하지 않고 조회 시 계산**한다.
  - 최근 방문일 = 거래가 있으면 `max(trade_records.trade_date)`, 없으면 `customers.registered_on`
  - 리마인드 분류 = `customer_events.event_date` 와 오늘 날짜(Asia/Seoul) 비교(0012 이후, 고객당 여러 건 가능)
- 성별·거래구분·거래품목·완료여부는 문서 요구사항대로 **DB에는 정수 코드**로 저장한다
  (0009/0010). 앱 코드(zod·폼·라벨)는 계속 문자열 식별자를 쓰고, `lib/types/codes.ts` 가
  Supabase 조회/저장 시점에만 변환한다.

## 4. 구매목적 저장 방식 — text[] (다중 선택)

`customers.purchase_purposes text[]` (0008 에서 enum[] → text[] 로 전환, 별도 관계 테이블 아님).

이유:
- 선택지가 작고 고정적이며 고객에 완전히 종속된 값 집합이다.
- 단일 행 조회·수정이 간단하고, RLS 정책이 `customers` 하나로 끝난다.
  관계 테이블을 두면 그 테이블에도 별도 정책이 필요하다.
- 세그먼트 필터는 `purchase_purposes @> array['GOLD_BAR']` (포함) 또는 `&&`(교집합)
  로 표현할 수 있다.
- 관계 테이블은 목적별 통계가 매우 복잡하거나 목적에 속성(날짜·메모)이 붙을 때
  유리한데, MVP 범위가 아니다.

## 5. numeric 값 처리 (정밀도)

`amount`, `weight`, `unit_price` 는 PostgreSQL `numeric` 이다.

- PostgREST/`supabase-js` 는 기본적으로 `numeric` 을 **JSON 숫자**로 반환한다.
  JavaScript `number` 는 IEEE 754 배정밀도라 소수 세 자리 중량 등의 합산에서
  미세 오차가 생길 수 있다.
- **처리 원칙**
  1. TypeScript 타입에서 이 컬럼들을 `string`(`NumericString`) 으로 선언해,
     "숫자로 함부로 연산하지 말 것"을 신호한다.
  2. 조회 시 명시적 텍스트 캐스팅으로 문자열을 받는다. 예:
     `.select('id, amount::text, weight::text, unit_price::text, ...')`
     (데이터 접근 계층은 다음 단계에서 구현)
  3. 합계·평균 등 집계는 앱에서 float 로 더하지 말고 **DB 에서 계산**
     (`sum(amount)`, RPC/뷰)해 정확한 결과를 받는다.
  4. 화면 표시는 `Intl.NumberFormat('ko-KR')` 등으로 문자열을 포맷한다.
- `amount` 는 `numeric(15,0)`(정수 원)이라 최대값이 2^53 미만이므로 정수로는
  안전하지만, 위 원칙을 일관되게 적용한다.
- 이번 단계에서는 별도 십진 계산 라이브러리(decimal.js 등)를 설치하지 않는다.
  실제 계산이 필요한 단계에서 필요성을 재검토한다.

## 6. 인덱스 선택 근거

생성한 인덱스:

| 인덱스 | 대상 쿼리 |
| --- | --- |
| `idx_customers_owner_id` (owner_id) | 테넌트 범위 필터, 대시보드의 전체 고객 수 |
| `idx_customers_owner_name` (owner_id, name) | 이름 정렬·접두어 검색(내 고객 안에서) |
| `idx_customers_owner_phone` (owner_id, phone) | 전화번호 조회, 중복 번호 경고 |
| `idx_customers_owner_first_visit_date` (owner_id, first_trade_date) | 대시보드 신규 고객 집계, 최근 방문일 계산 보조 (0008 에서 컬럼명만 first_trade_date 로 변경, 인덱스명은 그대로) |
| `idx_trade_records_customer_id` (customer_id) | "이 고객의 거래 내역" |
| `idx_trade_records_owner_trade_date` (owner_id, trade_date desc) | 대시보드 기간별 집계, 내 거래 최근순 |
| `idx_customer_events_owner_date` (owner_id, event_date) | 리마인드 대상 목록, 홈 대시보드 일정 위젯 |
| `idx_customer_events_customer_id` (customer_id) | 고객 상세의 일정 섹션 |
| `idx_customer_events_trade_id` (trade_id) | 거래에 연동된 일정 조회 |
| `idx_gold_prices_owner_registered_at_desc` (owner_id, registered_at desc) | 시세 이력 최신순 조회(0017) |

일부러 만들지 않은 인덱스:

- **`trade_records.owner_id` 단독** — `(owner_id, trade_date)` 복합 인덱스의
  왼쪽 접두어가 owner 단독 필터도 커버한다.
- **`trade_records.trade_type`** — 값이 `SALE`/`PURCHASE` 둘뿐이라 선택도가
  낮아 인덱스 이득이 없다. 거래구분으로 거르는 쿼리도 결국 owner 범위 전체를
  집계하는 형태다.
- **`customers.purchase_purposes` GIN** — 세그먼트 필터는 이미 한 사용자의
  작은 데이터 집합 안에서 일어난다. 데이터가 커지고 프로파일링으로 필요성이
  확인되면 `pg_trgm`/GIN 을 나중에 추가한다.
- **`customers.name` 단독(owner 접두어 없이)** — 모든 쿼리가 owner_id 를
  함께 걸기 때문에 플래너가 거의 선택하지 않는다.

부분 문자열 검색(`name ILIKE '%...%'`)까지 인덱스로 지원하려면 `pg_trgm`
확장이 필요하다. MVP 범위를 넘어서므로 지금은 넣지 않는다.

## 7. 롤백 (자동 실행하지 않음)

문제가 생겨 스키마를 되돌려야 하면 아래 SQL 을 **직접** 실행한다.
운영 데이터가 있으면 함께 삭제되므로 주의한다.

```sql
-- 정책·트리거는 테이블과 함께 삭제된다. FK 때문에 참조하는 테이블부터 지운다.
drop table if exists public.message_log;
drop table if exists public.message_templates;
drop function if exists public.marketing_segments();
drop table if exists public.customer_events;
drop table if exists public.notifications;
drop table if exists public.gold_prices;
drop table if exists public.price_targets;
drop table if exists public.trade_records;
drop table if exists public.customers;
drop table if exists public.users;
drop function if exists public.set_updated_at();
drop function if exists public.handle_new_auth_user();
drop function if exists public.trade_records_touch_last_contact();
drop function if exists public.trade_records_touch_first_trade_date();
drop function if exists public.dashboard_summary();
drop function if exists public.customer_count_by_period(text, text);
drop function if exists public.customer_analytics();
drop trigger if exists trg_handle_new_auth_user on auth.users;
```

이 SQL 은 마이그레이션 파일에 넣지 않는다(실수 실행 방지).
