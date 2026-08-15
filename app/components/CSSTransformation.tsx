import { useState, useEffect } from "react";

// 1. 回転スピナー
export function FullScreenLoading({ text = "読み込み中" }: { text?: string }) {
  return (
    <div className="loading-full-container">
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px" }}>
        {/* スピナーサイズ大きめ（256px） */}
        <OrigoSpinner size={256} />

        {/* 動くテキスト表示エリア */}
        {text && (
          <p
            style={{
              color: "#aaa",
              fontSize: "14px",
              fontWeight: "500",
              letterSpacing: "1.5px",
              margin: 0,
            }}
          >
            <LoadingText text={text} />
          </p>
        )}
      </div>
    </div>
  )
}

// ドットが動くテキストコンポーネント（テキストを外部から受け取れるように変更）
function LoadingText({ text = "読み込み中" }: { text?: string }) {
  const [dots, setDots] = useState("");

  useEffect(() => {
    const timer = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 10);

    return () => clearInterval(timer);
  }, []);

  return (
    <span>
      {text}{dots}
    </span>
  );
}

function OrigoSpinner({ size = 48 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 180 180"
        width={size}
        height={size}
      >
        <defs>
          <linearGradient id="origo-grad" x1="0%" y1="10%" x2="100%" y2="90%">
            <stop offset="0%" stopColor="#9333EA" />
            <stop offset="50%" stopColor="#6366F1" />
            <stop offset="100%" stopColor="#3B82F6" />
          </linearGradient>
        </defs>

        {/* 1. 外側のリング（反時計回りにゆっくり回転） */}
        <g className="origo-spin-reverse" style={{ transformOrigin: "90px 90px" }}>
          <circle cx="90" cy="90" r="78" fill="none" stroke="url(#origo-grad)" strokeWidth="0.8" strokeOpacity="0.25" strokeDasharray="12 6" />
          <circle cx="90" cy="90" r="65" fill="none" stroke="url(#origo-grad)" strokeWidth="1" strokeOpacity="0.4" />
        </g>

        {/* 2. メインの「O」（時計回りに波打つように回転） */}
        <g className="origo-spin-main" style={{ transformOrigin: "90px 90px" }}>
          <circle
            cx="90"
            cy="90"
            r="50"
            fill="none"
            stroke="url(#origo-grad)"
            strokeWidth="13"
            strokeLinecap="round"
            strokeDasharray="220 90" /* 円の一部を切り欠いて回転をわかりやすく！ */
          />
        </g>

        {/* 3. 内側のリング（反時計回りにすばやく回転） */}
        <g className="origo-spin-inner" style={{ transformOrigin: "90px 90px" }}>
          <circle cx="90" cy="90" r="31" fill="none" stroke="url(#origo-grad)" strokeWidth="1.2" strokeOpacity="0.6" strokeDasharray="8 8" />
          <circle cx="90" cy="90" r="20" fill="none" stroke="url(#origo-grad)" strokeWidth="1" strokeOpacity="0.4" />
        </g>
      </svg>
    </div>
  )
}