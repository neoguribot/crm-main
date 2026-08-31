"use client";

/**
 * 루트 레이아웃에서 오류가 났을 때만 쓰인다. 자체 <html>/<body> 가 필요하다.
 */
export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="ko">
      <body
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <h1 style={{ fontSize: "1.125rem", fontWeight: 600 }}>
            문제가 발생했습니다
          </h1>
          <p style={{ marginTop: "0.5rem", color: "#666" }}>
            잠시 후 다시 시도해 주세요.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "1rem",
              padding: "0.5rem 1rem",
              borderRadius: "0.5rem",
              border: "1px solid #ccc",
              cursor: "pointer",
            }}
          >
            다시 시도
          </button>
        </div>
      </body>
    </html>
  );
}
