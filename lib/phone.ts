/**
 * 한국 전화번호에 하이픈을 자동으로 넣는다. 입력 중 실시간 포맷용.
 * 저장은 이 포맷된 문자열 그대로 하며, 검색은 숫자만 비교하므로 형식 차이는 문제되지 않는다.
 */
export function formatKoreanPhone(input: string): string {
  const digits = input.replace(/\D/g, "").slice(0, 11);
  if (digits.length === 0) return "";

  // 서울 지역번호 02
  if (digits.startsWith("02")) {
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    if (digits.length <= 9)
      return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6, 10)}`;
  }

  // 휴대폰(010 등) 및 그 외 지역번호(0XX)
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  if (digits.length <= 10)
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
}
