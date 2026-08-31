# 발표용 샘플 데이터 (DEMO_DATA)

> ⚠️ **이 문서와 `supabase/seed/demo_data.sql` 의 모든 데이터는 완전한 가상 정보입니다.**
> 실제 사람·연락처·거래가 아닙니다. 이름은 전부 `데모 `로 시작하고, 모든 비고는
> `[DEMO]`로 시작합니다. 민감정보·실제 고객정보는 포함하지 않습니다.

- **파일**: `supabase/seed/demo_data.sql`
- **규모**: 고객 **50명**(절차적으로 생성, 매번 정확한 인원은 아래 §4 검증 SQL로 확인),
  거래는 고객당 0~20건(대부분 3~8건), 일정 약 16건, 매수 희망가 약 13명, 알림 최대 3건
- **스키마 기준**: `supabase/migrations/0001` ~ `0025` 전부 적용된 상태

## 0. v1 → v2: 손으로 쓴 18명 고정 데이터 → 절차적 생성 50명

기존(v1)에는 18명의 고객·24건의 거래를 이름까지 손으로 하나씩 작성했습니다. v2는
클라이언트가 제공한 실제 영업 특성(방문목적 비율, 연령대·성비, 유입경로, 재방문 경향
등)을 반영해 **분포를 코드로 정의하고 절차적으로 생성**하는 방식으로 바꿨습니다.
그 결과:

- 이름·정확한 나이·정확한 거래 금액은 **매 실행마다 무작위**로 정해집니다
  (단, `setseed()`로 난수 시드를 고정해 두어 분포·비율 자체는 안정적입니다).
- 이 문서는 "고객 c07 은 얼마" 같은 **고정된 정답표를 제공하지 않습니다.** 대신
  §2 의 분포 설계와 §4 의 검증 SQL로 실제 적용 후 값을 직접 확인하는 방식입니다.
- **v2 는 재실행할 때마다 그 사용자의 기존 `[DEMO]` 데이터를 먼저 삭제하고 다시
  만듭니다** (v1 은 이미 있으면 건너뛰는 방식이었습니다). `memo LIKE '[DEMO]%'` 로만
  걸러 지우므로 실제 데이터는 절대 건드리지 않습니다.

## 1. 대상 테스트 사용자 지정 방법

샘플 데이터는 **한 명의 로그인 사용자**(`auth.users.id`)에게 귀속됩니다.

1. Supabase 대시보드 > **Authentication > Users** 에서 발표에 쓸 계정의 행을 연다.
2. 그 사용자의 **UID(UUID)** 를 복사한다. *(이 값을 채팅·문서·Git 에 붙여넣지 마세요.)*
3. `supabase/seed/demo_data.sql` 을 열고 맨 위:

   ```sql
   v_raw text := 'PUT-YOUR-TEST-USER-UUID-HERE';
   ```

   의 `PUT-YOUR-TEST-USER-UUID-HERE` 를 복사한 UUID 로 바꾼다.

테스트 사용자가 없다면: **Authentication > Users > Add user > Create new user**,
이메일·비밀번호 입력, **Auto Confirm User** 체크.

## 2. 적용 방법 및 분포 설계

> 이 `.sql` 파일 전체(1~8단계)를 Supabase SQL Editor 에서 실제 실행해 성공을
> 확인했다(고객 50 / 거래 340 / 일정 16 / 매수 희망가 14 / 알림 1, 한글 인코딩
> 정상, 판매 거래에 18K/14K 품목 없음 확인).

1. 위 1번대로 `v_raw` 를 채운다.
2. Supabase 대시보드 > **SQL Editor > New query** 에 `demo_data.sql` **전체**를 붙여넣는다.
3. **Run**.
4. 성공 시 `NOTICE: 샘플 재생성 완료 — 이 사용자의 [DEMO] 고객 50 명, 거래 N 건, 일정 16 건, 매수 희망가 13 건, 알림 N 건.`

생성 로직(스크립트 상단 주석과 동일, 클라이언트 제공 영업 특성 반영):

| 항목 | 분포 |
| --- | --- |
| 고객 수 | 50명 |
| 등록일 | 오늘 기준 최근 5개월 이내(매장 최근 개업 시나리오) |
| 고객당 거래 수 | 0건 10% · 1~2건 16% · 3~8건 44% · 9~14건 20% · 15~20건 10% |
| 방문목적(주된 유형) | 매입 60% · 판매-골드바 32% · 판매-돌반지 6% · 판매-주얼리맞춤 2% (매입 고객 일부는 보상교환으로 골드바도 함께 방문목적에 포함) |
| 취급 품목 | 순금(24K) 골드바·돌반지·주얼리 맞춤만 판매. **18K/14K 는 매입(고객이 들고 오는 구제품)으로만 등장**, 신규 판매 없음 |
| 성별 | 전체 약 8:2(여:남). 매입·골드바(투자성) + 30~60대는 7:3, 주얼리는 9:1(여성 위주) |
| 연령대 | 40대·50대 각 11명(최다) · 30대·60대 각 8명 · 20대·70대 각 6명 |
| 유입경로 | 워크인(생활구역권)·네이버검색·지인추천이 고르게 상위, 지인추천은 40~60대에 더 집중 |
| 추천인 | 지인추천 유입 고객의 약 60%가 이전에 생성된(주로 40~60대) 다른 데모 고객을 추천인으로 가짐 |
| 가격 | 24K 1돈(3.75g)·은 1g 시세를 "오늘 근사치 ~ 5개월 전 근사치"로 선형 보간 + 약간의 일별 변동을 준 발표용 근사값(실시간 시세 아님) |
| 라벨 | 빈도·매출 라벨은 앱의 자동 추천 기준과 동일하게 맞춰서 저장(빈도: 누적 거래 2건 이상 단골 / 매출: 최근 3개월 합산 거래액 기준) |
| 매수 희망가 | 투자성(매입/골드바) 고객 위주로 약 13명에게 배정. 대부분 현재 시세 근사값보다 낮게(미도달), 일부는 살짝 높게(이미 도달) |
| 알림 | 이미 "도달" 상태인 매수 희망가 중 최대 3건에 대해 벨 아이콘용 알림을 미리 생성 |
| 시세 이력(`gold_prices`) | **일부러 시드하지 않음** — `[DEMO]` 같은 표시용 컬럼이 없는 owner 단위 테이블이라 안전하게 구분·재생성할 방법이 없음. `/prices`에서 오늘 시세를 직접 등록해 시연(매수 희망가 일부가 이미 "도달"로 설정돼 있어 알림이 자연스럽게 뜬다) |

### 안전장치

| 상황 | 동작 |
| --- | --- |
| `v_raw` 가 자리표시자 그대로 / 빈 값 | `raise exception` 으로 **중단** |
| `v_raw` 가 UUID 형식이 아님 | **중단** |
| 해당 UUID 사용자가 `auth.users` 에 없음 | **중단** |
| 스크립트 재실행 | 그 사용자의 기존 `[DEMO]` 고객을 **먼저 삭제**한 뒤(거래·일정은 FK cascade로 함께 삭제) 새로 생성 — v1 의 "건너뛰기" 방식에서 "재생성" 방식으로 바뀜 |
| 다른 사용자에게 실행 | 그 사용자의 `[DEMO]` 데이터만 대상이라 서로 영향 없음 |

- `DROP` / `TRUNCATE` **없음**. `memo LIKE '[DEMO]%'` 로 식별한 행만 지우므로 실제
  데이터는 절대 건드리지 않습니다.
- 날짜는 전부 "오늘(Asia/Seoul)" 기준 상대값이라 **시간이 지나도 시나리오가 유지**됩니다.
- 사용자 프로필(`public.users`)의 월 매출 목표값도 5,000만원으로 함께 채워집니다(upsert).

## 3. 재실행 / 제거

재실행하면 그 사용자의 기존 `[DEMO]` 데이터가 삭제되고 새로 생성됩니다(무작위값이라
매번 결과가 조금씩 다릅니다). 완전히 제거만 하고 싶다면(재생성 없이) SQL Editor 에서:

```sql
do $$
declare v_uid uuid := 'PUT-YOUR-TEST-USER-UUID-HERE';
begin
  if v_uid::text = 'PUT-YOUR-TEST-USER-UUID-HERE' then
    raise exception '대상 사용자 UUID 를 입력하세요.';
  end if;
  delete from public.customers where owner_id = v_uid and memo like '[DEMO]%';
end $$;
```
(`customer_events`, `trade_records` 는 FK on delete cascade로 함께 삭제됩니다.)

## 4. 적용 후 검증 (읽기 전용)

SQL Editor 에서 `'<UUID>'` 자리에 대상 사용자 UUID 를 넣고 실행:

```sql
-- (1) 샘플 건수
select
  (select count(*) from customers       where owner_id = '<UUID>' and memo like '[DEMO]%') as demo_customers,
  (select count(*) from trade_records   where owner_id = '<UUID>' and memo like '[DEMO]%') as demo_trades,
  (select count(*) from customer_events where owner_id = '<UUID>' and memo like '[DEMO]%') as demo_events;
-- 기대: 고객 50, 거래는 대략 150~350 사이(무작위), 일정 16

-- (2) 매입:판매 비율 (trade_type: 1=판매, 2=매입) — 기대: 매입이 대략 55~70% 사이
select trade_type, count(*), round(100.0 * count(*) / sum(count(*)) over (), 1) as pct
from trade_records
where owner_id = '<UUID>' and memo like '[DEMO]%'
group by trade_type order by trade_type;

-- (3) 품목 분포 (item_type 정수 코드: 1=골드바 4=24K돌반지 5=24K주얼리 6=18K 7=14K
--     9=은수저 10=치금 등, lib/types/codes.ts 참고) — 판매 쪽엔 6/7(18K/14K)이 없어야 정상
select trade_type, item_type, count(*)
from trade_records
where owner_id = '<UUID>' and memo like '[DEMO]%'
group by trade_type, item_type order by trade_type, item_type;
-- 검증 포인트: trade_type=1(판매) 행에는 item_type 6, 7 이 나오면 안 됨(매장이 18K/14K 미판매)

-- (4) 성비 — 기대: 여성(2)이 남성(1)보다 뚜렷이 많음(대략 7~8:2~3)
select gender, count(*) from customers
where owner_id = '<UUID>' and memo like '[DEMO]%'
group by gender order by gender;

-- (5) 연령대 분포 — 기대: 40대·50대가 가장 많고 20대·70대가 가장 적음
select
  case
    when birth_date is null then 'UNKNOWN'
    when extract(year from age(current_date, birth_date)) < 30 then '20s'
    when extract(year from age(current_date, birth_date)) < 40 then '30s'
    when extract(year from age(current_date, birth_date)) < 50 then '40s'
    when extract(year from age(current_date, birth_date)) < 60 then '50s'
    when extract(year from age(current_date, birth_date)) < 70 then '60s'
    else '70s+'
  end as age_bucket,
  count(*)
from customers where owner_id = '<UUID>' and memo like '[DEMO]%'
group by 1 order by 1;

-- (6) 빈도·매출 라벨 분포
select frequency_label, count(*) from customers
where owner_id = '<UUID>' and memo like '[DEMO]%' group by 1 order by 1;
select revenue_label, count(*) from customers
where owner_id = '<UUID>' and memo like '[DEMO]%' group by 1 order by 1;

-- (7) 추천인 연결 건수
select count(*) from customers
where owner_id = '<UUID>' and memo like '[DEMO]%' and referred_by_customer_id is not null;

-- (8) 매수 희망가 — 기대: 약 13건, 그중 목표가가 585,000원(근사 현재 시세) 이상인
--     "이미 도달" 건이 몇 건 있어야 함(아래 (9)의 알림과 연결됨)
select count(*) as total,
  count(*) filter (where target_price_per_don >= 585000) as already_reached
from price_targets t join customers c on c.id = t.customer_id
where c.owner_id = '<UUID>' and c.memo like '[DEMO]%';

-- (9) 알림(벨 아이콘용, dedupe_key 가 demo-seed: 로 시작하는 것만) — 기대: 최대 3건
select count(*) from notifications n join customers c on c.id = n.customer_id
where c.owner_id = '<UUID>' and c.memo like '[DEMO]%' and n.dedupe_key like 'demo-seed:%';

-- (10) 홈 대시보드 / 종합분석 RPC 결과 (로그인 세션에서만 owner 스코프가 맞음.
--     SQL Editor 에서는 0 이 나올 수 있으니 실제 검증은 브라우저로 한다.)
select public.dashboard_summary();
select public.customer_analytics();
```

## 5. 발표 중 참고

- 화면에서 특정 고객을 예시로 보여줄 때는 **고객 목록에서 필터로 골라서** 보여주는
  방식을 권장합니다(예: 방문목적 = 골드바, 매출 라벨 = VIP 등). 이름이 매 실행마다
  달라지므로 "데모 OOO를 클릭"처럼 고정된 이름을 스크립트에 넣지 않습니다
  (`docs/DEMO_SCENARIO.md` 참고).
- 거래가 **0건인 고객**도 일부러 포함돼 있습니다(전체의 약 10%) — "신규 고객 등록만
  하고 아직 거래가 없는 상태" 시연에 활용할 수 있습니다.
- 거래가 **15건 이상인 "큰손" 고객**도 일부 있습니다 — 지표 카드·종합분석의 "누적
  거래액/거래 수 상위 고객" 시연에 활용할 수 있습니다.
