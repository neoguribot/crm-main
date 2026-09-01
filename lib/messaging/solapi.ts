import "server-only";

import crypto from "node:crypto";

/**
 * 솔라피(Solapi) 발송 어댑터.
 *
 * - 카카오 알림톡(ATA) + 실패 시 SMS 폴백. 알림톡 템플릿은 솔라피 콘솔에서
 *   등록·검수 승인돼 있어야 하고, 발신 프로필(pfId)은 users.kakao_pf_id 에 둔다.
 * - API Key/Secret 은 환경변수(SOLAPI_API_KEY / SOLAPI_API_SECRET). 없으면
 *   `ProviderNotConfiguredError` 를 던져 호출 측이 "수동 처리"로 기록하게 한다.
 * - 문서: https://developers.solapi.com  (HMAC-SHA256 인증, POST /messages/v4/send)
 */

const BASE_URL = "https://api.solapi.com";

export class ProviderNotConfiguredError extends Error {
  constructor(message = "발송 대행사(솔라피) API 키가 설정되지 않았습니다.") {
    super(message);
    this.name = "ProviderNotConfiguredError";
  }
}

export function isSolapiConfigured(): boolean {
  return Boolean(process.env.SOLAPI_API_KEY && process.env.SOLAPI_API_SECRET);
}

export type SolapiSendInput = {
  to: string;
  from: string;
  /** SMS 본문 / 알림톡 폴백 본문 */
  text: string;
  /** 카카오 알림톡으로 보낼 때만 */
  kakao?: {
    pfId: string;
    templateId: string;
    /** `{키: 값}` — 어댑터가 솔라피 형식(`#{키}`)으로 변환한다. */
    variables?: Record<string, string>;
    /** 알림톡 실패 시 SMS 로 대체 발송 (기본 true) */
    disableSms?: boolean;
  };
};

export type SolapiSendResult =
  | { ok: true; providerMessageId: string | null }
  | { ok: false; error: string };

function authHeader(): string {
  const apiKey = process.env.SOLAPI_API_KEY!;
  const apiSecret = process.env.SOLAPI_API_SECRET!;
  const date = new Date().toISOString();
  const salt = crypto.randomBytes(16).toString("hex");
  const signature = crypto
    .createHmac("sha256", apiSecret)
    .update(date + salt)
    .digest("hex");
  return `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`;
}

/** 한 명에게 1건 발송. 로그를 건별로 남기기 위해 개별 호출한다. */
export async function sendOne(
  input: SolapiSendInput,
): Promise<SolapiSendResult> {
  if (!isSolapiConfigured()) throw new ProviderNotConfiguredError();

  const message: Record<string, unknown> = {
    to: input.to.replace(/\D/g, ""),
    from: input.from.replace(/\D/g, ""),
    text: input.text,
  };

  if (input.kakao) {
    message.type = "ATA";
    message.kakaoOptions = {
      pfId: input.kakao.pfId,
      templateId: input.kakao.templateId,
      disableSms: input.kakao.disableSms ?? false,
      variables: Object.fromEntries(
        Object.entries(input.kakao.variables ?? {}).map(([k, v]) => [
          `#{${k}}`,
          v,
        ]),
      ),
    };
  }

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/messages/v4/send`, {
      method: "POST",
      headers: {
        Authorization: authHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message }),
    });
  } catch (e) {
    return { ok: false, error: `발송 요청 실패: ${(e as Error).message}` };
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await res.json()) as Record<string, unknown>;
  } catch {
    // 본문 파싱 실패는 아래 상태 코드로 판정
  }

  if (!res.ok) {
    const msg =
      (body.errorMessage as string) ||
      (body.statusMessage as string) ||
      `HTTP ${res.status}`;
    return { ok: false, error: msg };
  }

  // 성공: statusCode "2000"(접수) 계열. messageId 를 로그에 남긴다.
  const statusCode = String(body.statusCode ?? "");
  if (statusCode && !statusCode.startsWith("2")) {
    return {
      ok: false,
      error: (body.statusMessage as string) || `상태 코드 ${statusCode}`,
    };
  }
  return { ok: true, providerMessageId: (body.messageId as string) ?? null };
}
