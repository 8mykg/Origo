"use client"
export const dynamic = "force-dynamic"
import { useState } from "react"
import { supabase } from "../lib/supabase"

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [Invitationcode, setInvitationcode] = useState("")
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, "0")
  const day = String(today.getDate()).padStart(2, "0")
  const SECRET_INVITATION_CODE = `Origo.tumayouzi${year}-${month}-${day}野獣先輩`
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [userName, setUserName] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [confirmSent, setConfirmSent] = useState(false)

  const handleSubmit = async () => {
    setError("")

    if (!isLogin && password !== confirmPassword) {
      setError("パスワードが一致しません")
      return
    }

    if (!isLogin && password.length < 6) {
      setError("パスワードは6文字以上にしてください")
      return
    }

    setLoading(true)

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError("メールアドレスかパスワードが違います")
      } else {
        window.location.href = "/"
      }
    } else {

      if (!Invitationcode.trim()) {
        setError("招待コードを入力してください(開発者に聞け)")
        setLoading(false)
        return
      }

      if (Invitationcode.trim() !== SECRET_INVITATION_CODE) {
        setError("招待コードが正しくありません、または期限切れです")
        setLoading(false)
        return
      }


      if (!userName.trim()) {
        setError("ユーザー名を入力してください")
        setLoading(false)
        return
      }

      const { data: existing } = await supabase
        .from("users")
        .select("*")
        .eq("user_name", userName)
        .single()

      if (existing) {
        setError("そのユーザー名はすでに使われています")
        setLoading(false)
        return
      }

      const { data: signUpData, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { user_name: userName }
        }
      })

      if (error) {
        setError("登録に失敗しました: " + error.message)
        setLoading(false)
        return
      }

      // アバターアップロード
      let avatarUrl = null
      if (avatarFile && signUpData.user) {
        const filePath = `${signUpData.user.id}/avatar.jpg`
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, avatarFile, { contentType: "image/jpeg" })

        if (!uploadError) {
          const { data } = supabase.storage.from("avatars").getPublicUrl(filePath)
          avatarUrl = `${data.publicUrl}?t=${Date.now()}`
        }
      }

      // usersテーブルに登録
      if (signUpData.user) {
        await supabase.from("users").insert({
          id: signUpData.user.id,
          user_name: userName,
          display_name: displayName.trim() || userName,
          avatar_url: avatarUrl,
        })
      }

      setConfirmSent(true)
    }
    setLoading(false)
  }

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
    if (error) setError("Googleログインに失敗しました")
  }

  const inputStyle = {
    width: "100%",
    background: "#222",
    border: "1px solid #444",
    borderRadius: "8px",
    padding: "12px",
    color: "#fff",
    fontSize: "16px",
    boxSizing: "border-box" as const,
    outline: "none"
  }

  const eyeButtonStyle = {
    position: "absolute" as const,
    right: "12px",
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    color: "#888",
    cursor: "pointer",
    fontSize: "18px",
    padding: "0"
  }

  if (confirmSent) {
    return (
      <div style={{
        minHeight: "100vh", background: "#000",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "sans-serif"
      }}>
        <div style={{
          background: "#111", border: "1px solid #333",
          borderRadius: "16px", padding: "40px",
          width: "400px", textAlign: "center"
        }}>
          <p style={{ fontSize: "40px", margin: "0 0 16px" }}>📧</p>
          <h2 style={{ color: "#fff", marginBottom: "8px" }}>メールを確認</h2>
          <p style={{ color: "#888" }}>
            {email} に確認メールを送りました、リンクをクリックして登録完了してください
            ※メアドに送ったリンクを開かなくてもログインできます
          </p>
          <button
            onClick={() => { setConfirmSent(false); setIsLogin(true) }}
            style={{
              marginTop: "24px", width: "100%",
              background: "#1d9bf0", color: "white",
              border: "none", borderRadius: "24px",
              padding: "12px", fontWeight: "bold",
              fontSize: "16px", cursor: "pointer"
            }}>
            ログイン画面へ
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: "100vh", background: "#000",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "sans-serif"
    }}>
      <div style={{
        background: "#111", border: "1px solid #333",
        borderRadius: "16px", padding: "40px", width: "400px"
      }}>
        <img src="/logo-full.svg" alt="Origo" style={{ height: "150px", width: "auto" }} />
        <p style={{ color: "#888", marginBottom: "24px" }}>
          {isLogin ? "おかえり！" : "はじめまして！"}
        </p>

        {/* タブ */}
        <div style={{ display: "flex", marginBottom: "24px", borderBottom: "1px solid #333" }}>
          {["ログイン", "新規登録"].map((label, i) => (
            <button
              key={i}
              onClick={() => { setIsLogin(i === 0); setError(""); setPassword(""); setConfirmPassword("") }}
              style={{
                flex: 1, background: "none", border: "none",
                color: isLogin === (i === 0) ? "#fff" : "#888",
                borderBottom: isLogin === (i === 0) ? "2px solid #1d9bf0" : "2px solid transparent",
                padding: "8px", cursor: "pointer", fontSize: "15px",
                fontWeight: isLogin === (i === 0) ? "bold" : "normal"
              }}>
              {label}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {/* ユーザー名（新規登録のみ） */}
          {!isLogin && (
            <>
              <input
                placeholder="招待コード"
                value={Invitationcode}
                onChange={(e) => setInvitationcode(e.target.value)}
                style={inputStyle}
              />

              <input
                placeholder="ユーザー名(@なし)"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                style={inputStyle}
              />

              {/* 表示名 */}
              <input
                placeholder="表示名(任意)"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                style={inputStyle}
              />

              {/* アイコン選択 */}
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                {/* プレビュー */}
                <div style={{
                  width: "56px", height: "56px", borderRadius: "50%",
                  background: avatarPreview ? "transparent" : "#1d9bf0",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "22px", fontWeight: "bold", color: "#fff",
                  overflow: "hidden", flexShrink: 0
                }}>
                  {avatarPreview ? (
                    <img src={avatarPreview} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    userName[0]?.toUpperCase() || "?"
                  )}
                </div>

                {/* ボタン */}
                <div style={{ flex: 1 }}>
                  <label style={{
                    display: "block", width: "100%",
                    background: "#222", border: "1px solid #444",
                    borderRadius: "8px", padding: "10px",
                    color: "#888", fontSize: "14px",
                    cursor: "pointer", textAlign: "center",
                    boxSizing: "border-box" as const
                  }}>
                    アイコンを選ぶ（10MB以下）
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        if (file.size > 10 * 1024 * 1024) {
                          setError("10MB以下の画像を選んでください")
                          return
                        }
                        setAvatarFile(file)
                        const reader = new FileReader()
                        reader.onload = () => setAvatarPreview(reader.result as string)
                        reader.readAsDataURL(file)
                      }}
                    />
                  </label>
                  {avatarPreview && (
                    <button
                      onClick={() => { setAvatarFile(null); setAvatarPreview(null) }}
                      style={{
                        background: "none", border: "none",
                        color: "#888", fontSize: "13px",
                        cursor: "pointer", marginTop: "4px"
                      }}>
                      ✕ 削除
                    </button>
                  )}
                </div>
              </div>
            </>
          )}

          {/* メール */}
          <input
            placeholder="メールアドレス"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
          />

          {/* パスワード */}
          <div style={{ position: "relative" }}>
            <input
              placeholder="パスワード（6文字以上）"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ ...inputStyle, paddingRight: "44px" }}
            />
            <button
              onClick={() => setShowPassword(!showPassword)}
              style={eyeButtonStyle}>
              {showPassword ? "🙈" : "👁️"}
            </button>
          </div>

          {/* 確認用パスワード（新規登録のみ） */}
          {!isLogin && (
            <div style={{ position: "relative" }}>
              <input
                placeholder="パスワードをもう一度"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSubmit() }}
                style={{
                  ...inputStyle,
                  paddingRight: "44px",
                  borderColor: confirmPassword && password !== confirmPassword ? "#f44" : "#444"
                }}
              />
              <button
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={eyeButtonStyle}>
                {showConfirmPassword ? "🙈" : "👁️"}
              </button>
              {/* パスワード一致チェック */}
              {confirmPassword && (
                <p style={{
                  margin: "4px 0 0",
                  fontSize: "12px",
                  color: password === confirmPassword ? "#27c93f" : "#f44"
                }}>
                  {password === confirmPassword ? "✓ 一致しています" : "✗ 一致していません"}
                </p>
              )}
            </div>
          )}
          {/* 区切り線 */}
          <div style={{
            display: "flex", alignItems: "center",
            gap: "12px", marginTop: "16px"
          }}>
            <div style={{ flex: 1, height: "1px", background: "#333" }} />
            <span style={{ color: "#888", fontSize: "13px" }}>または</span>
            <div style={{ flex: 1, height: "1px", background: "#333" }} />
          </div>

          {/* Googleログインボタン */}
          <button
            onClick={handleGoogleLogin}
            style={{
              width: "100%", marginTop: "16px",
              background: "#fff", color: "#000",
              border: "none", borderRadius: "24px",
              padding: "12px", fontWeight: "bold",
              fontSize: "16px", cursor: "pointer",
              display: "flex", alignItems: "center",
              justifyContent: "center", gap: "8px"
            }}>
            <img
              src="https://www.google.com/favicon.ico"
              width="30" height="30"
              alt="Google"
            />
            Googleで{isLogin ? "ログイン" : "登録"}
          </button>
        </div>

        {error && (
          <p style={{ color: "#f44", fontSize: "14px", margin: "12px 0 0" }}>{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || (!isLogin && password !== confirmPassword)}
          style={{
            width: "100%", marginTop: "16px",
            background: loading || (!isLogin && password !== confirmPassword) ? "#555" : "#1d9bf0",
            color: "white", border: "none", borderRadius: "24px",
            padding: "12px", fontWeight: "bold",
            fontSize: "16px",
            cursor: loading || (!isLogin && password !== confirmPassword) ? "not-allowed" : "pointer"
          }}>
          {loading ? "処理中..." : isLogin ? "ログイン" : "登録する"}
        </button>
      </div>
    </div>
  )
}