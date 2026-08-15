"use client"

import Link from "next/link"

export default function PrivacyPage() {
  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "24px 16px", color: "#e7e9ea" }}>
      <Link href="/" style={{ color: "#1d9bf0", textDecoration: "none", fontSize: "14px" }}>
        ← トップページに戻る
      </Link>

      <h1 style={{ fontSize: "24px", marginTop: "16px", marginBottom: "24px" }}>プライバシーポリシー</h1>

      <p style={{ color: "#ccc", fontSize: "14px", marginBottom: "24px", lineHeight: "1.6" }}>
        当サービス（以下、「当サービス」といいます。）は、ユーザーの個人情報の取扱いについて、以下のとおりプライバシーポリシー（以下、「本ポリシー」といいます。）を定め、適切な保護に努めます。
      </p>

      {/* 1. 取得する個人情報 */}
      <section style={{ marginBottom: "24px", lineHeight: "1.6" }}>
        <h2 style={{ fontSize: "18px", color: "#fff", borderBottom: "1px solid #333", paddingBottom: "8px" }}>1. 取得する情報</h2>
        <p style={{ color: "#ccc", fontSize: "14px", marginBottom: "8px" }}>
          当サービスは、アカウント作成およびサービスの提供にあたり、以下の情報を取得・保持します。
        </p>
        <ul style={{ color: "#ccc", fontSize: "14px", paddingLeft: "20px" }}>
          <li><strong>アカウント情報:</strong> メールアドレス、ユーザーネーム、表示名、プロフィール画像、生年月日、年齢認証に関する情報</li>
          <li><strong>外部連携および認証情報:</strong> Google等のサードパーティログイン認証に伴い提供される識別子・プロフィール情報、パスキー等の生体認証に関する認証用公開鍵データ（※生体情報そのものは取得いたしません）</li>
          <li><strong>投稿・行動データ:</strong> ユーザーが投稿した文章・画像等のコンテンツ、いいね・フォロー等のインタラクションデータ</li>
          <li><strong>技術情報・アクセスログ:</strong> IPアドレス、ブラウザ識別子、端末情報、Cookie（クッキー）情報、リファラ、アクセス日時</li>
        </ul>
      </section>

      {/* 2. 利用目的 */}
      <section style={{ marginBottom: "24px", lineHeight: "1.6" }}>
        <h2 style={{ fontSize: "18px", color: "#fff", borderBottom: "1px solid #333", paddingBottom: "8px" }}>2. 情報の利用目的</h2>
        <p style={{ color: "#ccc", fontSize: "14px", marginBottom: "8px" }}>
          取得した個人情報は、以下の目的で利用いたします。
        </p>
        <ul style={{ color: "#ccc", fontSize: "14px", paddingLeft: "20px" }}>
          <li>当サービスの提供、運営、保守、および機能改善のため</li>
          <li>ユーザーの本人確認、認証処理、および年齢制限（10歳未満の利用禁止等）の適切な実施のため</li>
          <li>規約違反行為、スパム、不正アクセスの検知・防止・対応のため</li>
          <li>将来的な有料サービスの決済処理およびサポート対応のため</li>
          <li>電気通信事業法および関係法令に基づく適切なサービス運営を行うため</li>
          <li>ユーザーからの問い合わせ対応、重要なお知らせの通知のため</li>
        </ul>
      </section>

      {/* 3. 情報の管理と委託・外部サービス */}
      <section style={{ marginBottom: "24px", lineHeight: "1.6" }}>
        <h2 style={{ fontSize: "18px", color: "#fff", borderBottom: "1px solid #333", paddingBottom: "8px" }}>3. 情報の安全管理および外部委託</h2>
        <ol style={{ color: "#ccc", fontSize: "14px", paddingLeft: "20px" }}>
          <li>当サービスは、Supabase（データベース/認証）やVercel（ホスティング/エッジインフラ）などの信頼性の高いクラウド基盤を利用し、行レベルセキュリティ（RLS）等を適用して、個人情報の漏洩・流出・不正アクセスの防止に努めます。</li>
          <li>当サービスは、利用目的の達成に必要な範囲において、個人情報の取扱いの全部または一部を外部事業者に委託する場合があります。この場合、適切な委託先を選定し、安全管理を義務付けます。</li>
        </ol>
      </section>

      {/* 4. 第三者提供 */}
      <section style={{ marginBottom: "24px", lineHeight: "1.6" }}>
        <h2 style={{ fontSize: "18px", color: "#fff", borderBottom: "1px solid #333", paddingBottom: "8px" }}>4. 第三者への開示・提供</h2>
        <p style={{ color: "#ccc", fontSize: "14px", marginBottom: "8px" }}>
          当サービスは、次に掲げる場合を除き、ユーザーの同意を得ることなく第三者に個人情報を提供することはありません。
        </p>
        <ul style={{ color: "#ccc", fontSize: "14px", paddingLeft: "20px" }}>
          <li>法令（電気通信事業法、個人情報保護法等）に基づく場合</li>
          <li>人の生命、身体または財産の保護のために必要がある場合</li>
          <li>国の機関もしくは地方公共団体またはその委託を受けた者が法令の定める事務を遂行することに対して協力する必要がある場合</li>
        </ul>
      </section>

      {/* 5. Cookieおよびトラッキング */}
      <section style={{ marginBottom: "24px", lineHeight: "1.6" }}>
        <h2 style={{ fontSize: "18px", color: "#fff", borderBottom: "1px solid #333", paddingBottom: "8px" }}>5. Cookie（クッキー）等の使用</h2>
        <p style={{ color: "#ccc", fontSize: "14px" }}>
          当サービスでは、セッションの維持、ログイン状態の管理、セキュリティ確保のためにCookieを使用しています。ブラウザの設定によりCookieを無効化することも可能ですが、その場合本サービスの一部機能が利用できなくなる場合があります。
        </p>
      </section>

      {/* 6. アカウントの削除（退会） */}
      <section style={{ marginBottom: "24px", lineHeight: "1.6" }}>
        <h2 style={{ fontSize: "18px", color: "#fff", borderBottom: "1px solid #333", paddingBottom: "8px" }}>6. アカウント削除とデータ保持</h2>
        <p style={{ color: "#ccc", fontSize: "14px" }}>
          ユーザーがアカウントを削除（退会）した場合、個人情報は速やかに破棄または匿名化処理されます。ただし、法令に基づく保管義務がある情報、不正防止のためのログ、および他のユーザーの体験に影響する投稿データの一部（匿名化された状態）については、一定期間保持される場合があります。
        </p>
      </section>

      {/* 7. お問い合わせ窓口 */}
      <section style={{ marginBottom: "24px", lineHeight: "1.6" }}>
        <h2 style={{ fontSize: "18px", color: "#fff", borderBottom: "1px solid #333", paddingBottom: "8px" }}>7. お問い合わせ窓口</h2>
        <p style={{ color: "#ccc", fontSize: "14px" }}>
          本ポリシーに関するお問い合わせ、個人情報の開示・修正・削除のご請求は、以下の連絡先までお願いいたします。<br />
          連絡先:{" "}
          <a
            href="mailto:origo.support@gmail.com"
            style={{ color: "#1d9bf0", textDecoration: "none" }}
          >
            origo.support@gmail.com
          </a>
        </p>
      </section>
      <p style={{ color: "#888", fontSize: "12px", marginTop: "40px" }}>制定日: 2026年8月15日</p>
    </div>
  )
}