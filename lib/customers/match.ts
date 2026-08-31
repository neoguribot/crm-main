/** 숫자가 아닌 문자를 모두 제거. */
export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * 통합 검색어(q)가 이 고객에 매칭되는지.
 * - 이름: **정확히 일치**(앞뒤 공백·대소문자 무시)
 * - 연락처: 부분 일치. 하이픈 등 형식 차이를 고려해 숫자만 비교도 함께 시도.
 * q 가 빈 문자열이면 항상 true(전체).
 */
export function customerMatchesQuery(
  name: string,
  phone: string,
  q: string,
): boolean {
  const query = q.trim();
  if (query === "") return true;

  const nameHit = name.trim().toLowerCase() === query.toLowerCase();

  const qDigits = digitsOnly(query);
  const phoneHit =
    phone.includes(query) ||
    (qDigits.length > 0 && digitsOnly(phone).includes(qDigits));

  return nameHit || phoneHit;
}
