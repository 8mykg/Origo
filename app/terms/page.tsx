"use client"

import Link from "next/link"

export default function TermsPage() {
  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "24px 16px", color: "#e7e9ea" }}>
      <Link href="/" style={{ color: "#1d9bf0", textDecoration: "none", fontSize: "14px" }}>
        ← トップページに戻る
      </Link>

      <h1 style={{ fontSize: "24px", marginTop: "16px", marginBottom: "24px" }}>利用規約</h1>

      <p style={{ color: "#ccc", fontSize: "14px", marginBottom: "24px", lineHeight: "1.6" }}>
        本利用規約（以下、「本規約」といいます。）は、Origo（以下、「本サービス」といいます。）が提供するすべてのサービスの利用条件を定めるものです。ユーザーの皆様は、本規約に従って本サービスをご利用ください。
      </p>

      {/* 第1条 */}
      <section style={{ marginBottom: "24px", lineHeight: "1.6" }}>
        <h2 style={{ fontSize: "18px", color: "#fff", borderBottom: "1px solid #333", paddingBottom: "8px" }}>第1条（適用および定義）</h2>
        <ol style={{ color: "#ccc", fontSize: "14px", paddingLeft: "20px" }}>
          <li>本規約は、ユーザーと本サービスとの間の本サービスの利用に関わる一切の関係に適用されます。</li>
          <li>ユーザーは、本サービスを利用（登録、閲覧、投稿等のすべての行為を含みます）することにより、本規約のすべての内容に同意したものとみなされます。</li>
        </ol>
      </section>

      {/* 第2条 */}
      <section style={{ marginBottom: "24px", lineHeight: "1.6" }}>
        <h2 style={{ fontSize: "18px", color: "#fff", borderBottom: "1px solid #333", paddingBottom: "8px" }}>第2条（年齢制限および利用条件）</h2>
        <ol style={{ color: "#ccc", fontSize: "14px", paddingLeft: "20px" }}>
          <li><strong>10歳未満の方</strong>は、本サービスを利用することができません。</li>
          <li><strong>10歳以上13歳未満の方</strong>が本サービスを利用する場合は、親権者等の法定代理人の事前同意を得た上でご利用ください。</li>
          <li>未成年者が法定代理人の同意がないにもかかわらず同意があると偽って本サービスを利用した場合、その他年齢や資格について詐術を用いた場合、本サービスに関する一切の法律行為を取り消すことはできません。</li>
        </ol>
      </section>

      {/* 第3条 */}
      <section style={{ marginBottom: "24px", lineHeight: "1.6" }}>
        <h2 style={{ fontSize: "18px", color: "#fff", borderBottom: "1px solid #333", paddingBottom: "8px" }}>第3条（アカウント登録および認証情報）</h2>
        <ol style={{ color: "#ccc", fontSize: "14px", paddingLeft: "20px" }}>
          <li>ユーザーは、自己の責任において、外部連携アカウント（Googleアカウント等）、生体認証情報（パスキー等）、パスワードその他の認証情報を適切に管理・保管するものとします。</li>
          <li>ユーザーは、いかなる場合にも、認証情報を第三者に譲渡もしくは貸与し、または第三者と共用することはできません。本サービスは、登録された認証情報を用いて行われた一切の行為を、ユーザーご本人の行為とみなします。</li>
          <li>登録情報に変更が生じた場合、または認証情報の漏洩が判明した場合は、直ちに最新の情報に更新するか、当サービスに通知するものとします。</li>
        </ol>
      </section>

      {/* 第4条 */}
      <section style={{ marginBottom: "24px", lineHeight: "1.6" }}>
        <h2 style={{ fontSize: "18px", color: "#fff", borderBottom: "1px solid #333", paddingBottom: "8px" }}>第4条（有料サービスおよび決済）</h2>
        <ol style={{ color: "#ccc", fontSize: "14px", paddingLeft: "20px" }}>
          <li>本サービス内に将来有料の機能またはサービス（以下、「有料サービス」といいます。）が提供される場合、利用料金および支払方法は別途本サービス上で定めるものとします。</li>
          <li>有料サービスの支払いが遅延した場合、本サービスは事前の通知なく当該ユーザーに対するサービスの提供を停止できるものとします。</li>
          <li>利用料金の改定や課金体系の変更を行う場合、本サービスは事前にユーザーに対して周知します。</li>
        </ol>
      </section>

      {/* 第5条 */}
      <section style={{ marginBottom: "24px", lineHeight: "1.6" }}>
        <h2 style={{ fontSize: "18px", color: "#fff", borderBottom: "1px solid #333", paddingBottom: "8px" }}>第5条（禁止事項）</h2>
        <p style={{ color: "#ccc", fontSize: "14px", marginBottom: "8px" }}>
          ユーザーは、本サービスの利用にあたり、以下の行為をしてはなりません。
        </p>
        <ul style={{ color: "#ccc", fontSize: "14px", paddingLeft: "20px" }}>
          <li>法令、公序良俗、または本規約に違反する行為</li>
          <li>犯罪行為に関連する行為、または反社会的勢力に対する利益供与行為</li>
          <li>他のユーザー、第三者、または当サービスの知的財産権、名誉、プライバシー、肖像権等を侵害する行為</li>
          <li>他のユーザーに対するハラスメント、侮辱、差別、ストーキング、過度な批判、脅迫行為</li>
        </ul>
        <ul style={{ color: "#ccc", fontSize: "14px", paddingLeft: "20px", marginTop: "8px" }}>
          <li>不正アクセス、Bot等のプログラムを用いた自動操作、過度なアクセス負荷をかける行為</li>
          <li>スクレイピング等により本サービスのコンテンツや他ユーザーの個人情報を不正に取得する行為</li>
          <li>スパム投稿、宣伝・勧誘・営業行為（当サービスが特別に許可した場合を除く）</li>
          <li>その他、当サービスが不適切と判断する行為</li>
        </ul>
      </section>

      {/* 第6条 */}
      <section style={{ marginBottom: "24px", lineHeight: "1.6" }}>
        <h2 style={{ fontSize: "18px", color: "#fff", borderBottom: "1px solid #333", paddingBottom: "8px" }}>第6条（コンテンツの権利帰属および利用許諾）</h2>
        <ol style={{ color: "#ccc", fontSize: "14px", paddingLeft: "20px" }}>
          <li>ユーザーが本サービス上に投稿・送信した文章、画像、動画等のコンテンツ（以下、「投稿コンテンツ」といいます。）の著作権は、当該ユーザーに帰属します。</li>
          <li>ユーザーは、本サービスの提供、表示、プロモーション、改善、保守等の目的のために、当サービスに対し、投稿コンテンツを無償、非独占的かつ全世界において使用（複製・表示・改変・配信等）する権利を許諾するものとします。</li>
          <li>ユーザーは、投稿コンテンツについて、当サービスおよび当サービスから権利を承継した第三者に対して著作者人格権を行使しないものとします。</li>
          <li>当サービスは、禁止事項への抵触や法令違反の可能性がある場合、事前の通知なく投稿コンテンツの非表示化または削除を行えるものとします。</li>
        </ol>
      </section>

      {/* 第7条 */}
      <section style={{ marginBottom: "24px", lineHeight: "1.6" }}>
        <h2 style={{ fontSize: "18px", color: "#fff", borderBottom: "1px solid #333", paddingBottom: "8px" }}>第7条（利用制限およびアカウント停止）</h2>
        <p style={{ color: "#ccc", fontSize: "14px" }}>
          当サービスは、ユーザーが本規約に違反した場合、または違反するおそれがあると判断した場合、事前通知なく、該当ユーザーの投稿データの削除、アカウントの利用停止（BAN）、または利用契約の解除等必要な措置を講じることができます。
        </p>
      </section>

      {/* 第8条 */}
      <section style={{ marginBottom: "24px", lineHeight: "1.6" }}>
        <h2 style={{ fontSize: "18px", color: "#fff", borderBottom: "1px solid #333", paddingBottom: "8px" }}>第8条（免責事項）</h2>
        <ol style={{ color: "#ccc", fontSize: "14px", paddingLeft: "20px" }}>
          <li>当サービスは、本サービスに事実上または法律上の欠陥（安全性、信頼性、正確性、完全性、有効性、特定の目的への適合性、セキュリティ等の不具合、エラーやバグ、権利侵害等を含みます。）がないことを明示的にも黙示的にも保証しておりません。</li>
          <li>当サービスは、本サービスに起因してユーザーに生じたあらゆる損害について一切の責任を負いません。ただし、当サービスとユーザーとの間の契約が消費者契約法に定める消費者契約となる場合、この免責規定は適用されません。</li>
          <li>ユーザー間またはユーザーと第三者との間において生じた取引、連絡、トラブル、紛争等について、当サービスは一切責任を負いません。</li>
        </ol>
      </section>

      {/* 第9条 */}
      <section style={{ marginBottom: "24px", lineHeight: "1.6" }}>
        <h2 style={{ fontSize: "18px", color: "#fff", borderBottom: "1px solid #333", paddingBottom: "8px" }}>第9条（サービス内容の変更および停止）</h2>
        <p style={{ color: "#ccc", fontSize: "14px" }}>
          当サービスは、ユーザーに事前通知することなく、本サービスの内容を変更し、または本サービスの提供を停止・終了することができるものとし、これによってユーザーに生じた損害について一切の責任を負いません。
        </p>
      </section>

      {/* 第10条 */}
      <section style={{ marginBottom: "24px", lineHeight: "1.6" }}>
        <h2 style={{ fontSize: "18px", color: "#fff", borderBottom: "1px solid #333", paddingBottom: "8px" }}>第10条（利用規約の変更）</h2>
        <p style={{ color: "#ccc", fontSize: "14px" }}>
          当サービスは、必要と判断した場合には、ユーザーに通知またはサービス内での告知を行うことで、本規約を変更することができるものとします。変更後の利用規約は、本サービス上に掲載された時点から効力を生じるものとします。
        </p>
      </section>

      {/* 第11条 */}
      <section style={{ marginBottom: "24px", lineHeight: "1.6" }}>
        <h2 style={{ fontSize: "18px", color: "#fff", borderBottom: "1px solid #333", paddingBottom: "8px" }}>第11条（準拠法・裁判管轄）</h2>
        <ol style={{ color: "#ccc", fontSize: "14px", paddingLeft: "20px" }}>
          <li>本規約の解釈にあたっては、日本法を準拠法とします。</li>
          <li>本サービスに関して紛争が生じた場合、当サービスの指定する裁判所（例：東京地方裁判所）を第一審の専属的合意管轄裁判所とします。</li>
        </ol>
      </section>

      <p style={{ color: "#888", fontSize: "12px", marginTop: "40px" }}>制定日: 2026年8月15日</p>
    </div>
  )
}