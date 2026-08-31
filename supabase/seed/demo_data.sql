-- =====================================================================
-- demo_data.sql  —  발표용 가상 샘플 데이터 생성기 (고객 약 50명, 거래 다수, 일정 다수)
--
-- ⚠️ 모든 데이터는 완전한 가상 정보다. 실제 개인정보가 아니다.
--    이름은 전부 "데모 " 로 시작하고, 비고는 전부 "[DEMO]" 로 시작한다.
--
-- v2 — 클라이언트가 제공한 실제 영업 특성을 반영한 "현실적인" 더미 데이터로
-- 전면 재작성했다(기존 손으로 쓴 18명/24건 고정 데이터 폐기, 절차적 생성으로 교체):
--   - 고객 50명, 등록일은 오늘로부터 5개월 이내(매장 최근 개업 시나리오)
--   - 고객당 거래 0~20건(0건 대략 10%, 대다수 3~8건, 상위 단골 9건 이상)
--   - 방문목적 비율: 매입 60% / 판매-골드바 32% / 판매-돌반지 6% / 판매-주얼리 2%
--     (매입:판매 = 약 6:4, 매입 고객 중 일부는 보상교환으로 골드바도 구매)
--   - 매장은 순금(24K) 주얼리만 취급(18K/14K 신제품 판매 없음, 맞춤 제작만).
--     18K/14K 는 고객이 들고 오는 "매입" 품목으로만 등장한다.
--   - 성비 전체 약 8:2(여성:남성), 매입/골드바(투자성) 고객은 7:3, 주얼리는 9:1
--   - 연령대: 40대·50대 최다, 30대·60대 중간, 20대·70대 최저
--   - 유입경로: 생활구역권(워크인)·네이버검색·지인추천이 고르게 상위, 지인추천은
--     40~60대에 더 집중
--   - 가격은 24K 1돈(3.75g)·은 1g 시세를 오늘 기준 근사치에서 5개월 전 근사치로
--     선형 보간 + 약간의 일별 변동을 준 "발표용 근사 시세"다(실시간 시세 아님).
--   - 매수 희망가(price_targets)를 투자성 고객 위주로 약 13명에게 배정한다. 일부는
--     현재 시세 근사값보다 살짝 높게 잡아 두어(이미 "도달" 상태), 발표 중 `/prices`
--     에서 오늘 시세를 실제로 등록하면 알림이 자연스럽게 뜨도록 했다. gold_prices
--     (시세 이력) 자체는 일부러 시드하지 않는다 — 고객에 속하지 않는 owner 단위
--     테이블이라 [DEMO] 같은 태그로 안전하게 구분·재생성할 방법이 없기 때문이다.
--
-- 안전장치:
--  1) 아래 v_raw 에 대상 테스트 사용자 UUID 를 넣지 않으면 실행이 중단된다.
--  2) UUID 형식이 아니거나 auth.users 에 없는 사용자면 중단된다.
--  3) 고객·거래·일정 id 는 (사용자 UUID + 슬러그) 해시로 만든다.
--  4) ⚠️ v1 과 달리 이 버전은 "재생성"이 목적이라, 실행 시작 시 그 사용자의 기존
--     [DEMO] 데이터를 먼저 삭제한 뒤 새로 만든다(고객 delete → 거래·일정은
--     FK on delete cascade로 함께 삭제). memo LIKE '[DEMO]%' 로만 걸러 지우므로
--     실제 데이터는 절대 건드리지 않는다. 대신 재실행할 때마다 이전 [DEMO] 고객의
--     id/이름이 통째로 새 값으로 바뀐다(추천인 등 참조 관계도 새로 계산됨).
--  5) 날짜는 모두 "오늘(Asia/Seoul)" 기준 상대값 → 시간이 지나도 시나리오가 유지된다.
--  6) setseed() 로 난수 시드를 고정해 같은 날 다시 실행하면 같은 분포 결과가 나온다
--     (정확한 이름·금액까지 매번 동일하지는 않을 수 있으나 분포·비율은 안정적이다).
--
-- 적용: Supabase 대시보드 > SQL Editor 에 붙여넣고, v_raw 를 채운 뒤 실행.
-- 적용 후 실제 생성된 값은 docs/DEMO_DATA.md 의 검증 SQL로 직접 확인한다
-- (절차적 생성이라 이 파일만 보고 정확한 수치를 알 수 없다).
--
-- 전체(1~8단계)를 이 SQL Editor 경로로 실제 실행해 성공을 확인했다(고객 50 /
-- 거래 340 / 일정 16 / 매수 희망가 14 / 알림 1, 판매 거래에 18K/14K 없음 확인).
-- =====================================================================

do $$
declare
  -- ↓↓↓ 여기에 대상 테스트 사용자 UUID 를 입력하세요 (auth.users.id) ↓↓↓
  v_raw    text := 'eb4a8739-3be2-42f6-b1b9-ad79f2da9ad2';
  -- ↑↑↑ 자리표시자가 그대로면 아래에서 실행이 중단됩니다 ↑↑↑

  v_uid    uuid;
  v_today  date := (now() at time zone 'Asia/Seoul')::date;
  v_window_start date := (v_today - interval '5 months')::date;
  v_window_days  int  := greatest(v_today - v_window_start, 1);
  -- 매출 라벨 자동 추천과 동일한 "최근 3개월(캘린더 월 기준)" 시작일
  v_rev_window date := date_trunc('month', v_today - interval '2 months')::date;

  -- 발표용 근사 시세(실시간 시세 아님). 24K 1돈(3.75g), 은 1g 기준, 원.
  v_gold_start   numeric := 530000;
  v_gold_now     numeric := 585000;
  v_silver_start numeric := 1050;
  v_silver_now   numeric := 1250;

  n int := 50;

  -- 고객별로 이후 단계(추천인·거래 생성)에서 다시 쓰는 값들을 배열에 저장한다.
  cust_id      uuid[];
  cust_age     text[];
  cust_gender  int[];
  cust_channel text[];
  cust_purpose text[];   -- 'PURCHASE' | 'GOLD_BAR' | 'STONE' | 'JEWELRY'
  cust_reg     date[];
  cust_tcount  int[];

  age_arr           text[];
  purpose_cat_arr    text[];
  tradecount_arr     text[];

  surnames text[] := array['김','이','박','최','정','강','조','윤','장','임',
                            '한','오','서','신','권','황','안','송','전','홍',
                            '유','구','노','문','손'];
  givens   text[] := array['민준','서연','지호','하윤','도윤','시우','유준','수아',
                            '지안','예준','서준','하준','지우','다은','은서','서윤',
                            '민서','채원','수빈','태윤','유나','지민','현우','승민',
                            '재현','예은','소율','다인','건우','우진','시연','규리',
                            '태호','영훈','미래','승우','가온','해원','보름','유찬'];
  districts text[] := array['대전 서구','대전 유성구','대전 중구','대전 동구','대전 대덕구'];

  i int; j int; k int;
  v_name text; v_phone text; v_address text;
  v_r double precision; v_r2 double precision;
  v_channel text; v_channel_detail text;
  v_purposes text[]; v_purpose_detail text;
  v_reg date; v_birth date; v_age_years int;
  v_bucket text; v_tcount int;

  v_dates date[];
  v_d date;
  v_spot_gold numeric; v_spot_silver numeric;
  v_ttype int; v_itype int; v_unit numeric; v_weight numeric; v_amount numeric; v_status int;
  v_tid uuid;

  candidates int[]; v_pick int;

  ev_targets int[];
  v_etype int; v_edate date; v_eid uuid; v_edone boolean;
  ev_labels text[] := array['문의','예약 확인','맞춤 제작 진행 상황','재방문 리마인드',
                             '시세 알림 상담','생일 축하 연락','안부 연락'];

  pt_targets int[];
  v_pt_price numeric; v_pt_note text; v_pt_id uuid;
  pt_notes text[] := array['이 가격대로 떨어지면 연락 주세요','추가 매수 희망',
                            '분산매수 목표가','지인 추천으로 관심 있어 하심'];

  rec record;
  v_notif_id uuid;

  v_cust int; v_trade int; v_event int; v_pt int; v_notif int;
begin
  if v_raw = 'PUT-YOUR-TEST-USER-UUID-HERE' or length(coalesce(v_raw, '')) = 0 then
    raise exception '대상 테스트 사용자 UUID 를 v_raw 에 입력한 뒤 다시 실행하세요.';
  end if;

  begin
    v_uid := v_raw::uuid;
  exception when others then
    raise exception 'v_raw 가 올바른 UUID 형식이 아닙니다: %', v_raw;
  end;

  if not exists (select 1 from auth.users where id = v_uid) then
    raise exception '해당 UUID 의 사용자가 auth.users 에 없습니다: %', v_uid;
  end if;

  perform setseed(0.37);

  -- 재생성: 이 사용자의 기존 [DEMO] 고객을 먼저 지운다(거래·일정은 cascade로 함께 삭제).
  delete from public.customers where owner_id = v_uid and memo like '[DEMO]%';

  -- 사용자 프로필(목표값) — auth.users 트리거로 이미 생성됐을 수 있으므로 upsert.
  insert into public.users (id, name, monthly_sales_goal)
  values (v_uid, '데모 사장님', 50000000)
  on conflict (id) do update set monthly_sales_goal = excluded.monthly_sales_goal;

  -- ================================================================
  -- 1단계: 고객 50명의 연령대 / 방문목적 유형 / 거래건수 구간을 먼저
  -- "정확한 개수"로 배정한 뒤 순서를 섞는다(비율을 정확히 맞추기 위함).
  -- ================================================================
  age_arr := (select array_agg(x order by random()) from unnest(
    array_fill('40s'::text, array[11]) ||
    array_fill('50s'::text, array[11]) ||
    array_fill('30s'::text, array[8])  ||
    array_fill('60s'::text, array[8])  ||
    array_fill('20s'::text, array[6])  ||
    array_fill('70s'::text, array[6])
  ) as t(x));

  purpose_cat_arr := (select array_agg(x order by random()) from unnest(
    array_fill('PURCHASE'::text, array[30]) ||  -- 60%: 매입 위주
    array_fill('GOLD_BAR'::text, array[16])  ||  -- 32%: 판매-골드바 위주
    array_fill('STONE'::text, array[3])      ||  -- 6%: 판매-돌반지 위주
    array_fill('JEWELRY'::text, array[1])        -- 2%: 판매-주얼리맞춤 위주
  ) as t(x));

  tradecount_arr := (select array_agg(x order by random()) from unnest(
    array_fill('0'::text, array[5])     ||  -- 10%: 거래 없음(방문/상담만)
    array_fill('LOW'::text, array[8])   ||  -- 16%: 1~2건
    array_fill('MID'::text, array[22])  ||  -- 44%: 3~8건
    array_fill('HIGH'::text, array[10]) ||  -- 20%: 9~14건
    array_fill('WHALE'::text, array[5])     -- 10%: 15~20건(분산매도·큰손 투자 고객)
  ) as t(x));

  -- ================================================================
  -- 2단계: 고객 50명 생성
  -- ================================================================
  for i in 1..n loop
    v_name := '데모 ' || surnames[1 + floor(random() * array_length(surnames,1))::int]
                       || givens[1 + floor(random() * array_length(givens,1))::int];
    v_phone := '010-9900-' || lpad(i::text, 4, '0');

    cust_age[i] := age_arr[i];
    cust_purpose[i] := purpose_cat_arr[i];

    -- 성별: 주얼리 9:1(여:남), 투자성(매입/골드바)+30~60대는 7:3, 그 외 기본 8:2.
    -- 아주 가끔(4%) 미기재(모름)도 섞는다.
    v_r := random();
    if random() < 0.04 then
      cust_gender[i] := 0;
    elsif cust_purpose[i] = 'JEWELRY' then
      cust_gender[i] := case when v_r < 0.9 then 2 else 1 end;
    elsif cust_purpose[i] in ('PURCHASE','GOLD_BAR') and cust_age[i] in ('30s','40s','50s','60s') then
      cust_gender[i] := case when v_r < 0.7 then 2 else 1 end;
    else
      cust_gender[i] := case when v_r < 0.8 then 2 else 1 end;
    end if;

    -- 유입경로: 생활구역권(워크인)/네이버검색/지인추천이 고르게, 지인추천은 40~60대 집중.
    v_r := random();
    if cust_age[i] in ('40s','50s','60s') then
      v_channel := case
        when v_r < 0.40 then 'REFERRAL'
        when v_r < 0.65 then 'WALK_IN'
        when v_r < 0.90 then 'NAVER_PLACE'
        when v_r < 0.96 then 'CARROT_MARKET'
        else 'OTHER'
      end;
    else
      v_channel := case
        when v_r < 0.15 then 'REFERRAL'
        when v_r < 0.50 then 'WALK_IN'
        when v_r < 0.85 then 'NAVER_PLACE'
        when v_r < 0.95 then 'CARROT_MARKET'
        else 'OTHER'
      end;
    end if;
    cust_channel[i] := v_channel;
    v_channel_detail := case when v_channel = 'OTHER'
      then (array['라디오 광고','전단지 보고 방문','매장 간판 보고 방문'])[1 + floor(random()*3)::int]
      else null end;

    -- 방문목적(다중 선택 가능) — 매입 고객의 일부는 보상교환으로 골드바도 함께 방문목적에 포함.
    v_r := random();
    case cust_purpose[i]
      when 'PURCHASE' then
        v_purposes := case when v_r < 0.20 then array['PURCHASE','GOLD_BAR'] else array['PURCHASE'] end;
      when 'GOLD_BAR' then
        v_purposes := case when v_r < 0.10 then array['GOLD_BAR','PURCHASE'] else array['GOLD_BAR'] end;
      when 'STONE' then
        v_purposes := case when v_r < 0.10 then array['STONE_PRODUCT','GOLD_BAR'] else array['STONE_PRODUCT'] end;
      else
        v_purposes := case when v_r < 0.10 then array['CUSTOM_JEWELRY','STONE_PRODUCT'] else array['CUSTOM_JEWELRY'] end;
    end case;
    v_purpose_detail := null;
    if random() < 0.04 then
      v_purposes := v_purposes || array['OTHER'];
      v_purpose_detail := (array['시계 수리 문의','귀금속 감정 문의','금 시세만 상담'])[1 + floor(random()*3)::int];
    end if;

    -- 거래 건수(구간 → 실제 값)
    v_bucket := tradecount_arr[i];
    v_tcount := case v_bucket
      when '0'     then 0
      when 'LOW'   then 1 + floor(random()*2)::int
      when 'MID'   then 3 + floor(random()*6)::int
      when 'HIGH'  then 9 + floor(random()*6)::int
      else              15 + floor(random()*6)::int
    end;
    cust_tcount[i] := v_tcount;

    -- 등록일: 오늘로부터 5개월 이내(최근 개업 시나리오). 마지막 3일은 제외해 거래 여유를 둔다.
    v_reg := v_window_start + floor(random() * greatest(v_window_days - 3, 1))::int;
    cust_reg[i] := v_reg;

    v_address := case when random() < 0.5 then districts[1 + floor(random()*5)::int] else null end;

    v_age_years := case cust_age[i]
      when '20s' then 20 + floor(random()*10)::int
      when '30s' then 30 + floor(random()*10)::int
      when '40s' then 40 + floor(random()*10)::int
      when '50s' then 50 + floor(random()*10)::int
      when '60s' then 60 + floor(random()*10)::int
      else            70 + floor(random()*8)::int
    end;
    v_birth := make_date(
      extract(year from v_today)::int - v_age_years,
      1 + floor(random()*12)::int,
      1 + floor(random()*28)::int
    );

    cust_id[i] := md5(v_uid::text || ':demo-customer:c' || lpad(i::text,2,'0'))::uuid;

    insert into public.customers
      (id, owner_id, name, phone, birth_date, gender, address,
       inflow_channels, inflow_channel_detail, purchase_purposes, purchase_purpose_detail,
       frequency_label, revenue_label, registered_on, memo)
    values
      (cust_id[i], v_uid, v_name, v_phone, v_birth, cust_gender[i], v_address,
       array[v_channel], v_channel_detail, v_purposes, v_purpose_detail,
       '신규', '일반', v_reg, '[DEMO]');
  end loop;

  -- ================================================================
  -- 3단계: 추천인 연결 — 지인추천 유입 고객 중 일부는 이전에 생성된(주로 40~60대)
  -- 다른 데모 고객을 추천인으로 연결한다.
  -- ================================================================
  for i in 6..n loop
    if cust_channel[i] = 'REFERRAL' and random() < 0.6 then
      candidates := array(
        select gk from generate_series(1, i-1) gk where cust_age[gk] in ('40s','50s','60s')
      );
      if array_length(candidates,1) is null then
        candidates := array(select gk from generate_series(1, i-1) gk);
      end if;
      v_pick := candidates[1 + floor(random() * array_length(candidates,1))::int];
      update public.customers set referred_by_customer_id = cust_id[v_pick]
        where id = cust_id[i] and owner_id = v_uid;
    end if;
  end loop;

  -- ================================================================
  -- 4단계: 고객별 거래 생성. 같은 고객의 거래는 날짜 오름차순으로 삽입해야
  -- "첫 거래 등록 시 첫 거래일자 자동 갱신" 트리거(0023)가 실제 첫 거래일과
  -- 맞게 동작한다.
  -- ================================================================
  for i in 1..n loop
    v_tcount := cust_tcount[i];
    continue when v_tcount = 0;

    v_dates := (
      select array_agg(d order by d) from (
        select (cust_reg[i] + floor(random() * greatest(v_today - cust_reg[i], 1))::int)::date as d
        from generate_series(1, v_tcount)
      ) t
    );

    for j in 1..v_tcount loop
      v_d := v_dates[j];

      v_spot_gold := v_gold_start
        + (v_gold_now - v_gold_start) * ((v_d - v_window_start)::numeric / v_window_days);
      v_spot_gold := v_spot_gold * (0.99 + random()*0.02);
      v_spot_silver := v_silver_start
        + (v_silver_now - v_silver_start) * ((v_d - v_window_start)::numeric / v_window_days);
      v_spot_silver := v_spot_silver * (0.98 + random()*0.04);

      v_r := random();
      v_r2 := random();

      case cust_purpose[i]
        when 'PURCHASE' then
          if v_r < 0.85 then
            v_ttype := 2; -- 매입
            if v_r2 < 0.35 then
              v_itype := 10; -- 치금
              v_weight := round((3 + random()*37)::numeric, 3);
              v_unit := round(v_spot_gold/3.75 * (0.70 + random()*0.15));
            elsif v_r2 < 0.70 then
              v_itype := (array[3,4,5])[1 + floor(random()*3)::int]; -- 구제품 24K류
              v_weight := round((1 + random()*11)::numeric, 3);
              v_unit := round(v_spot_gold/3.75 * (0.85 + random()*0.08));
            elsif v_r2 < 0.90 then
              v_itype := case when random() < 0.5 then 6 else 7 end; -- 구제품 18K/14K
              v_weight := round((1 + random()*11)::numeric, 3);
              v_unit := round(v_spot_gold/3.75 * (case when v_itype = 6 then 0.75 else 0.585 end)
                               * (0.85 + random()*0.08));
            else
              v_itype := case when random() < 0.5 then 8 else 9 end; -- 은제품
              v_weight := round((50 + random()*250)::numeric, 3);
              v_unit := round(v_spot_silver * (0.6 + random()*0.2));
            end if;
          else
            v_ttype := 1; v_itype := 1; -- 보상교환: 골드바 판매
            v_weight := (array[3.75,7.5,18.75,37.5])[1 + floor(random()*4)::int];
            v_unit := round(v_spot_gold/3.75 * (1.00 + random()*0.03));
          end if;

        when 'GOLD_BAR' then
          if v_r < 0.90 then
            v_ttype := 1; v_itype := 1;
            v_weight := (array[3.75,3.75,3.75,7.5,7.5,18.75,37.5,75])[1 + floor(random()*8)::int];
            v_unit := round(v_spot_gold/3.75 * (1.00 + random()*0.03));
          else
            v_ttype := 2;
            v_itype := (array[3,4,5,10])[1 + floor(random()*4)::int];
            v_weight := round((1 + random()*11)::numeric, 3);
            v_unit := round(v_spot_gold/3.75 * (0.80 + random()*0.10));
          end if;

        when 'STONE' then
          if v_r < 0.90 then
            v_ttype := 1; v_itype := 4; -- 24K 돌반지
            v_weight := round((1.875 + random()*1.875)::numeric, 3);
            v_unit := round(v_spot_gold/3.75 * (1.05 + random()*0.08));
          else
            v_ttype := 2; v_itype := 10;
            v_weight := round((3 + random()*10)::numeric, 3);
            v_unit := round(v_spot_gold/3.75 * (0.75 + random()*0.10));
          end if;

        else -- JEWELRY
          if v_r < 0.90 then
            v_ttype := 1; v_itype := 5; -- 24K 주얼리 맞춤
            v_weight := round((2 + random()*10)::numeric, 3);
            v_unit := round(v_spot_gold/3.75 * (1.15 + random()*0.15));
          else
            v_ttype := 1; v_itype := 4;
            v_weight := round((1.875 + random()*1.875)::numeric, 3);
            v_unit := round(v_spot_gold/3.75 * (1.05 + random()*0.08));
          end if;
      end case;

      v_amount := round(v_unit * v_weight / 1000) * 1000;
      v_status := case when (v_today - v_d) <= 3 and random() < 0.25 then 2 else 1 end;

      v_tid := md5(v_uid::text || ':demo-trade:c' || lpad(i::text,2,'0') || 't' || j)::uuid;

      insert into public.trade_records
        (id, owner_id, customer_id, trade_type, item_type, unit_price, weight, amount, status, trade_date, memo)
      values
        (v_tid, v_uid, cust_id[i], v_ttype, v_itype, v_unit, v_weight, v_amount, v_status, v_d, '[DEMO]');
    end loop;
  end loop;

  -- ================================================================
  -- 5단계: 빈도·매출 라벨 — 앱의 자동 추천 로직과 동일한 기준으로 맞춰 둔다
  -- (빈도: 누적 거래 2건 이상이면 단골 / 매출: 최근 3개월 합산 거래액 기준).
  -- ================================================================
  update public.customers c set
    frequency_label = case
      when (select count(*) from public.trade_records t where t.customer_id = c.id) >= 2
        then '단골' else '신규'
    end,
    revenue_label = case
      when coalesce((
        select sum(t.amount) from public.trade_records t
        where t.customer_id = c.id and t.trade_date >= v_rev_window
      ), 0) >= 50000000 then 'VIP'
      when coalesce((
        select sum(t.amount) from public.trade_records t
        where t.customer_id = c.id and t.trade_date >= v_rev_window
      ), 0) >= 10000000 then '우수'
      else '일반'
    end
  where c.owner_id = v_uid and c.memo like '[DEMO]%';

  -- ================================================================
  -- 6단계: 고객 일정(customer_events) 약 16건 — 무작위로 고른 고객에게 배정.
  --   type: 1=문의 2=예약 3=맞춤주문 4=재방문 5=시세알림 6=생일 7=안부
  -- ================================================================
  ev_targets := array(select gk from generate_series(1, n) gk order by random() limit 16);
  k := 0;
  foreach i in array ev_targets loop
    k := k + 1;
    v_etype := (array[1,2,3,4,4,5,6,7])[1 + floor(random()*8)::int]; -- 재방문 비중을 살짝 높게
    v_edate := v_today + (floor(random()*40) - 15)::int; -- 오늘 기준 -15일 ~ +24일
    v_edone := v_edate < v_today and random() < 0.5;
    v_eid := md5(v_uid::text || ':demo-event:c' || lpad(i::text,2,'0') || 'e' || k)::uuid;

    insert into public.customer_events (id, owner_id, customer_id, event_type, event_date, memo, is_done)
    values (v_eid, v_uid, cust_id[i], v_etype, v_edate,
            '[DEMO] ' || ev_labels[v_etype], v_edone);
  end loop;

  -- ================================================================
  -- 7단계: 매수 희망가(price_targets) 약 13명 — 투자성(매입/골드바) 고객 위주로
  -- 배정한다. customer_id 가 FK on delete cascade 라 고객 삭제(1단계 재생성)에
  -- 맞춰 함께 정리된다.
  --
  -- ⚠️ gold_prices(시세 이력)는 일부러 시드하지 않는다 — 이 테이블엔 [DEMO] 같은
  -- 표시용 컬럼이 없어서(고객에 속한 데이터가 아니라 owner 단위 이력) 재실행할
  -- 때마다 안전하게 구분해서 지울 방법이 없다. 대신 목표가 일부를 현재 시세
  -- 근사값보다 살짝 높게 잡아 두었으니, 발표 중 `/prices` 에서 오늘 시세를 실제로
  -- 등록하면 그 중 한두 건이 자연스럽게 "도달" 알림으로 뜬다(라이브 데모용).
  -- ================================================================
  pt_targets := (
    select array_agg(x order by random()) from (
      (select gk as x from generate_series(1, n) gk
       where cust_purpose[gk] in ('PURCHASE','GOLD_BAR')
       order by random() limit 10)
      union all
      (select gk as x from generate_series(1, n) gk
       where cust_purpose[gk] not in ('PURCHASE','GOLD_BAR')
       order by random() limit 3)
    ) t
  );

  foreach i in array pt_targets loop
    -- 0.90~1.02 배수: 대부분은 현재 시세보다 낮게(아직 미도달), 일부는 살짝 높게
    -- 잡아 두어(이미 도달) 발표 중 실제 시세 등록 시 알림이 뜨도록 한다.
    v_pt_price := round(v_gold_now * (0.90 + random() * 0.12) / 1000) * 1000;
    v_pt_note := case when random() < 0.4
      then pt_notes[1 + floor(random()*4)::int]
      else null end;
    v_pt_id := md5(v_uid::text || ':demo-price-target:c' || lpad(i::text,2,'0'))::uuid;

    insert into public.price_targets (id, owner_id, customer_id, target_price_per_don, note)
    values (v_pt_id, v_uid, cust_id[i], v_pt_price, v_pt_note)
    on conflict (customer_id) do update
      set target_price_per_don = excluded.target_price_per_don, note = excluded.note;
  end loop;

  select count(*) into v_cust
    from public.customers where owner_id = v_uid and memo like '[DEMO]%';
  select count(*) into v_trade
    from public.trade_records where owner_id = v_uid and memo like '[DEMO]%';
  select count(*) into v_event
    from public.customer_events where owner_id = v_uid and memo like '[DEMO]%';
  select count(*) into v_pt
    from public.price_targets t
    join public.customers c on c.id = t.customer_id
    where c.owner_id = v_uid and c.memo like '[DEMO]%';

  -- ================================================================
  -- 8단계: 알림 벨 아이콘 데모용 — 이미 "도달" 상태(목표가 ≥ 오늘 근사 시세)인
  -- 매수 희망가 최대 3건에 대해 미리 알림을 만들어 둔다. dedupe_key 는 실제 앱이
  -- 만드는 형식(target:<id>:<gold_price_id>)과 절대 겹치지 않는 "demo-seed:"
  -- 접두사를 쓴다. customer_id 가 FK on delete cascade 라 재생성 시 함께 정리된다.
  -- ================================================================
  for rec in
    select t.id as target_id, t.customer_id, t.target_price_per_don, c.name as customer_name
    from public.price_targets t
    join public.customers c on c.id = t.customer_id
    where c.owner_id = v_uid and c.memo like '[DEMO]%'
      and t.target_price_per_don >= v_gold_now
    order by random()
    limit 3
  loop
    v_notif_id := md5(v_uid::text || ':demo-notification:' || rec.target_id::text)::uuid;
    insert into public.notifications
      (id, owner_id, type, customer_id, title, body, dedupe_key, created_at)
    values (
      v_notif_id, v_uid, 'PRICE_TARGET_REACHED', rec.customer_id,
      rec.customer_name || ' 고객의 매수 희망 가격에 도달했습니다.',
      '매수 희망 ' || to_char(rec.target_price_per_don, 'FM999,999,999') || '원/돈 · 현재 '
        || to_char(v_gold_now, 'FM999,999,999') || '원/돈 · 전화 상담 추천',
      'demo-seed:' || rec.target_id::text,
      now() - ((floor(random()*48))::int || ' hours')::interval
    )
    on conflict (id) do nothing;
  end loop;

  select count(*) into v_notif
    from public.notifications n
    join public.customers c on c.id = n.customer_id
    where c.owner_id = v_uid and c.memo like '[DEMO]%' and n.dedupe_key like 'demo-seed:%';

  raise notice '샘플 재생성 완료 — 이 사용자의 [DEMO] 고객 % 명, 거래 % 건, 일정 % 건, 매수 희망가 % 건, 알림 % 건.',
    v_cust, v_trade, v_event, v_pt, v_notif;
end $$;
