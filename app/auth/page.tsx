"use client"
import { useState } from "react"
import { supabase } from "../lib/supabase"

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [userName, setUserName] = useState("")
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

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { user_name: userName }
        }
      })

      if (error) {
        setError("登録に失敗しました: " + error.message)
      } else {
        setConfirmSent(true)
      }
    }
    setLoading(false)
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
          width: "320px", textAlign: "center"
        }}>
          <p style={{ fontSize: "40px", margin: "0 0 16px" }}>📧</p>
          <h2 style={{ color: "#fff", marginBottom: "8px" }}>メールを確認して！</h2>
          <p style={{ color: "#888" }}>
            {email} に確認メールを送ったよ！リンクをクリックして登録完了！
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
        borderRadius: "16px", padding: "40px", width: "320px"
      }}>
        <h1 style={{ color: "#fff", fontSize: "28px", marginBottom: "8px" }}>🐦 MySNS</h1>
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
            <input
              placeholder="ユーザー名 (@なし)"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              style={inputStyle}
            />
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