"use client"

import { useState } from "react"
import { supabase } from "../../lib/supabase" // TLと同じクライアントを参照！

export default function CreateRoomModal({ isOpen, onClose, onCreated }: {
  isOpen: boolean
  onClose: () => void
  onCreated: () => void
}) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setLoading(true)

    // TLと同じ手法でセッションからログイン情報（UUID）を取得！
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      alert("ログイン情報が見つかりません。再ログインしてください。")
      window.location.href = "/auth"
      setLoading(false)
      return
    }

    // roomsテーブルに挿入（created_by には session.user.id を渡す）
    const { error } = await supabase.from("rooms").insert({
      name: name,
      description: description,
      created_by: session.user.id,
    })

    if (error) {
      console.error("部屋作成エラー:", error.message)
      alert("部屋の作成に失敗しました: " + error.message)
    } else {
      setName("")
      setDescription("")
      onCreated()
      onClose()
    }
    setLoading(false)
  }

  return (
    <div style={{
      position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.7)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000
    }}>
      <div style={{
        backgroundColor: "#161616", border: "1px solid #333", borderRadius: "16px",
        padding: "24px", width: "100%", maxWidth: "400px", color: "#fff"
      }}>
        <h2 style={{ marginTop: 0, fontSize: "18px" }}>新規部屋（コミュニティ）作成</h2>
        <form onSubmit={handleCreate}>
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "12px", color: "#888", marginBottom: "4px" }}>部屋名</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: ゲーム部屋, プログラミング雑談"
              required
              style={{
                width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #333",
                backgroundColor: "#0d0d0d", color: "#fff", boxSizing: "border-box"
              }}
            />
          </div>
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontSize: "12px", color: "#888", marginBottom: "4px" }}>説明文</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="どんな部屋か簡単に説明を書こう"
              rows={3}
              style={{
                width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #333",
                backgroundColor: "#0d0d0d", color: "#fff", boxSizing: "border-box"
              }}
            />
          </div>
          <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: "8px 16px", borderRadius: "20px", border: "none", backgroundColor: "#333", color: "#fff", cursor: "pointer" }}
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "8px 16px", borderRadius: "20px", border: "none",
                backgroundColor: "#1d9bf0", color: "#fff", fontWeight: "bold", cursor: "pointer"
              }}
            >
              {loading ? "作成中..." : "作成する"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}