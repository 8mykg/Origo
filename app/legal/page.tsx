"use client"

import Link from "next/link"

export default function LegalHubPage() {
  const legalLinks = [
    {
      title: "利用規約",
      description: "本サービスの利用条件、禁止事項、アカウント管理について",
      href: "/terms",
    },
    {
      title: "プライバシーポリシー",
      description: "取得する個人情報、利用目的、データの安全管理について",
      href: "/privacy",
    },
    {
      title: "お問い合わせ",
      description: "ご質問、個人情報の開示・削除リクエスト、不具合報告(クリックするとメールアプリが開きます)",
      href: "mailto:origo.support@gmail.com?subject=【お問い合わせ】",
    },
  ]

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "24px 16px", color: "#e7e9ea" }}>
      <Link href="/" style={{ color: "#1d9bf0", textDecoration: "none", fontSize: "14px" }}>
        ← トップページに戻る
      </Link>

      <h1 style={{ fontSize: "24px", marginTop: "16px", marginBottom: "8px", fontWeight: "bold" }}>
        法的情報・各種ポリシー
      </h1>
      <p style={{ color: "#71767b", fontSize: "14px", marginBottom: "32px" }}>
        Origoを安心してご利用いただくための規約およびポリシー一覧です。
      </p>

      {/* リンクカード一覧 */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {legalLinks.map((item) => (
          <Link
            className="glow-card"
            key={item.title}
            href={item.href}
            style={{
              display: "block",
              padding: "20px",
              backgroundColor: "#16181c",
              borderRadius: "12px",
              border: "1px solid #2f3336",
              textDecoration: "none",
              transition: "border-color 0.2s",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: "18px", color: "#fff", margin: 0, fontWeight: "600" }}>
                {item.title}
              </h2>
              <span style={{ color: "#71767b", fontSize: "18px" }}>→</span>
            </div>
            <p style={{ color: "#71767b", fontSize: "13px", marginTop: "6px", margin: 0 }}>
              {item.description}
            </p>
          </Link>
        ))}
      </div>

      {/* フッター */}
      <footer style={{ marginTop: "60px", paddingTop: "24px", borderTop: "1px solid #333", textAlign: "center" }}>
        <p style={{ color: "#71767b", fontSize: "12px", margin: 0 }}>
          Copyright © 2026{" "}
          <a
            href="https://x.com/fafogame5"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#1d9bf0", textDecoration: "none" }}
          >
            tumayouzi_Dev
          </a>
          . All rights reserved.
        </p>
      </footer>
    </div>
  )
}