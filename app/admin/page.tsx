"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../lib/supabase"
import { getDailyInvitationCode } from "../lib/invitation"

export default function AdminPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [todayCode, setTodayCode] = useState("")
  const [yesterdayCode, setYesterdayCode] = useState("")

  useEffect(() => {
    const checkAdmin = async () => {
      // 1. セッション確認
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push("/auth")
        return
      }

      // 2. ユーザーの role を確認
      const { data: userData } = await supabase
        .from("users")
        .select("role")
        .eq("id", session.user.id)
        .single()

      if (!userData || userData.role !== "admin") {
        alert("管理者権限が必要です")
        router.push("/") // 一般ユーザーはホームへ弾く！
        return
      }

      // 管理者確認 OK
      setIsAdmin(true)

      // 3. 招待コードなどのデータ取得
      const today = await getDailyInvitationCode(new Date())
      setTodayCode(today)

      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yCode = await getDailyInvitationCode(yesterday)
      setYesterdayCode(yCode)

      setLoading(false)
    }

    checkAdmin()
  }, [router])

  if (loading) {
    return (
      <div style={{ background: "#000", color: "#888", minHeight: "100vh", padding: "40px", textAlign: "center" }}>
        権限を確認中...
      </div>
    )
  }

  if (!isAdmin) return null

  return (
    <div style={{ padding: "40px", background: "#000", color: "#fff", minHeight: "100vh", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: "bold", margin: 0 }}>🛠 運営者専用ダッシュボード</h1>
        <span style={{ background: "#7928ca", color: "#fff", padding: "4px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold" }}>
          ADMIN ONLY
        </span>
      </div>

      {/* 招待コード確認カード */}
      <div style={{ background: "#111", padding: "20px", borderRadius: "16px", border: "1px solid #333", maxWidth: "440px", marginBottom: "24px" }}>
        <h2 style={{ fontSize: "16px", color: "#aaa", margin: "0 0 16px" }}>🔑 日替わり招待コード</h2>

        <div style={{ marginBottom: "16px" }}>
          <p style={{ color: "#888", margin: "0 0 4px", fontSize: "13px" }}>今日の招待コード（有効）</p>
          <p style={{ fontSize: "28px", fontWeight: "bold", color: "#1d9bf0", margin: 0, letterSpacing: "2px" }}>
            {todayCode}
          </p>
        </div>

        <div>
          <p style={{ color: "#888", margin: "0 0 4px", fontSize: "13px" }}>昨日の招待コード（許容）</p>
          <p style={{ fontSize: "18px", fontWeight: "bold", color: "#888", margin: 0, letterSpacing: "1px" }}>
            {yesterdayCode}
          </p>
        </div>
      </div>
      <style jsx global>{`
        /* デフォルト（PC画面） */
        .mobile-only {
          display: none !important;
        }
        .pc-only {
          display: block !important;
        }

        /* スマホ画面（1200px以下）の場合 */
        @media (max-width: 1200px) {
          .mobile-only {
            display: flex !important; /* または block */
          }
          .pc-only {
            display: none !important;
          }
        }
      `}</style>
    </div>
  )
}