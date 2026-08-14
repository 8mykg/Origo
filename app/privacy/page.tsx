"use client"

import Link from "next/link"

export default function PrivacyPage() {
  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "24px 16px", color: "#e7e9ea" }}>
      <Link href="/" style={{ color: "#1d9bf0", textDecoration: "none", fontSize: "14px" }}>
        ← トップページに戻る
      </Link>

      <h1 style={{ fontSize: "24px", marginTop: "16px", marginBottom: "24px" }}>プライバシーポリシー</h1>

      <section style={{ marginBottom: "20px", lineHeight: "1.6" }}>
        <h2 style={{ fontSize: "18px", color: "#fff", borderBottom: "1px solid #333", paddingBottom: "8px" }}>1. 取得する情報</h2>
        <p style={{ color: "#ccc", fontSize: "14px" }}>
          当サービスでは、アカウント登録およびサービス提供のために以下の情報を収集・保持します。
        </p>
        <ul style={{ color: "#ccc", fontSize: "14px", paddingLeft: "20px" }}>
          <li>メールアドレス（認証用）</li>
          <li>ユーザーネーム、表示名、プロフィール画像等の登録情報</li>
          <li>ユーザーが投稿した文章、投稿画像等のデータ</li>
        </ul>
      </section>

      <section style={{ marginBottom: "20px", lineHeight: "1.6" }}>
        <h2 style={{ fontSize: "18px", color: "#fff", borderBottom: "1px solid #333", paddingBottom: "8px" }}>2. 情報の利用目的</h2>
        <p style={{ color: "#ccc", fontSize: "14px" }}>
          取得した個人情報は、以下の目的で利用いたします。
        </p>
        <ul style={{ color: "#ccc", fontSize: "14px", paddingLeft: "20px" }}>
          <li>当サービスの提供、運営、保守のため</li>
          <li>ユーザーの本人確認およびログイン処理のため</li>
          <li>規約違反行為への対応や不正利用防止のため</li>
        </ul>
      </section>

      <section style={{ marginBottom: "20px", lineHeight: "1.6" }}>
        <h2 style={{ fontSize: "18px", color: "#fff", borderBottom: "1px solid #333", paddingBottom: "8px" }}>3. 第三者への開示・提供</h2>
        <p style={{ color: "#ccc", fontSize: "14px" }}>
          当サービスは、法令に基づく場合を除き、ユーザーの同意を得ることなく第三者に個人情報を提供することはありません。
        </p>
      </section>

      <section style={{ marginBottom: "20px", lineHeight: "1.6" }}>
        <h2 style={{ fontSize: "18px", color: "#fff", borderBottom: "1px solid #333", paddingBottom: "8px" }}>4. 情報の管理とセキュリティ</h2>
        <p style={{ color: "#ccc", fontSize: "14px" }}>
          当サービスでは、Supabase等の信頼性の高いデータベースプラットフォームを使用し、ユーザー情報の安全管理に努めています。
        </p>
      </section>

      <p style={{ color: "#888", fontSize: "12px", marginTop: "40px" }}>制定日: 2026年8月15日</p>
    </div>
  )
}