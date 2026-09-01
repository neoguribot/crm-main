/** 애플리케이션 공통 상수 */

export const APP_NAME = "금거래소 CRM";

export const APP_DESCRIPTION =
  "금은방 고객·거래·세그먼트·리마인드를 관리하는 CRM";

/** 로그인 후 기본으로 보여줄 화면(=홈). 상단 브랜드 링크가 이 경로로 이동한다. */
export const HOME_PATH = "/home";

/**
 * 로그인 후 공통 네비게이션. 원본 요구사항 메뉴 구성(홈/고객관리/거래관리/
 * 시세관리/캘린더/종합분석/사용자설정) 기준. 사용자설정은 후순위 작업이라
 * 아직 메뉴에 없다. 리마인드(일정 관리)는 별도 메뉴 없이 홈 대시보드에
 * 통합했다(0번 확정사항).
 */
export const NAV_ITEMS = [
  { href: "/home", label: "홈" },
  { href: "/customers", label: "고객관리" },
  { href: "/transactions", label: "거래관리" },
  { href: "/prices", label: "시세관리" },
  { href: "/calendar", label: "캘린더" },
  { href: "/analytics", label: "종합분석" },
  { href: "/marketing", label: "마케팅" },
] as const;
