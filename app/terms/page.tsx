"use client"

import Link from "next/link"

export default function TermsPage() {
  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "24px 16px", color: "#e7e9ea" }}>
      <Link href="/" style={{ color: "#1d9bf0", textDecoration: "none", fontSize: "14px" }}>
        ← トップページに戻る
      </Link>

      <h1 style={{ fontSize: "24px", marginTop: "16px", marginBottom: "24px" }}>利用規約</h1>

      <section style={{ marginBottom: "20px", lineHeight: "1.6" }}>
        <h2 style={{ fontSize: "18px", color: "#fff", borderBottom: "1px solid #333", paddingBottom: "8px" }}>第1条（適用）</h2>
        <p style={{ color: "#ccc", fontSize: "14px" }}>
          本規約は、ユーザーと本サービス（以下、「当サービス」）との間の利用に関わる一切の関係に適用されます。ユーザーは、本サービスを利用することにより、本規約に同意したものとみなされます。
        </p>
      </section>

      <section style={{ marginBottom: "20px", lineHeight: "1.6" }}>
        <h2 style={{ fontSize: "18px", color: "#fff", borderBottom: "1px solid #333", paddingBottom: "8px" }}>第2条（禁止事項）</h2>
        <p style={{ color: "#ccc", fontSize: "14px" }}>
          ユーザーは、本サービスの利用にあたり、以下の行為をしてはなりません。
        </p>
        <ul style={{ color: "#ccc", fontSize: "14px", paddingLeft: "20px" }}>
          <li>法令または公序良俗に違反する行為</li>
          <li>犯罪行為に関連する行為、または他のユーザーに対するハラスメント行為</li>
          <li>当サービスのサーバーまたはネットワークの機能を破壊・妨害する行為</li>
          <li>他のユーザーに関する個人情報等を不当に収集または蓄積する行為</li>
          <li>その他、当サービスが不適切と判断する行為</li>
        </ul>
      </section>

      <section style={{ marginBottom: "20px", lineHeight: "1.6" }}>
        <h2 style={{ fontSize: "18px", color: "#fff", borderBottom: "1px solid #333", paddingBottom: "8px" }}>第3条（投稿コンテンツの扱い・削除権限）</h2>
        <p style={{ color: "#ccc", fontSize: "14px" }}>
          ユーザーが投稿したテキストおよび画像等のコンテンツの著作権はユーザーに帰属します。ただし、禁止事項に違反する投稿や不適切なコンテンツについて、管理者は事前通知なく削除することができます。
        </p>
      </section>

      <section style={{ marginBottom: "20px", lineHeight: "1.6" }}>
        <h2 style={{ fontSize: "18px", color: "#fff", borderBottom: "1px solid #333", paddingBottom: "8px" }}>第4条（免責事項）</h2>
        <p style={{ color: "#ccc", fontSize: "14px" }}>
          当サービスは、ユーザー間またはユーザーと第三者との間において生じた取引、連絡または紛争等について一切責任を負いません。また、当サービスの停止、データの消失等によって生じた損害についても一切の責任を負いかねます。
        </p>
      </section>

      <p style={{ color: "#888", fontSize: "12px", marginTop: "40px" }}>制定日: 2026年8月15日</p>
    </div>
  )
}