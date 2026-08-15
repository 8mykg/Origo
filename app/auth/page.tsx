"use client"
export const dynamic = "force-dynamic"
import { useState } from "react"
import { supabase } from "../lib/supabase"
import { verifyInvitationCode } from "../lib/invitation"

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [Invitationcode, setInvitationcode] = useState("")
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

  // タブ切り替え時のリセット処理
  const handleTabChange = (toLogin: boolean) => {
    setIsLogin(toLogin)
    setError("")
    setPassword("")
    setConfirmPassword("")
    setAvatarFile(null)
    setAvatarPreview(null)
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
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
      // --- ログイン処理 ---
      const inputStr = email.trim()
      let loginEmail = inputStr

      // 先頭が "@" で始まる場合、RPCを呼んで auth.users の email を取得
      if (inputStr.startsWith("@")) {
        const userNameToSearch = inputStr.slice(1).trim() // 先頭の "@" を除去

        const { data: fetchedEmail, error: rpcError } = await supabase.rpc(
          "get_email_by_username",
          { username_input: userNameToSearch }
        )

        if (rpcError) {
          console.error("RPC Error:", rpcError)
        }

        // メールアドレスが見つかればセット、なければダミー値でログイン失敗へ
        loginEmail = fetchedEmail || "invalid_user_dummy@invalid.local"
      }

      // Supabase Auth でログイン実行
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      })

      if (authError) {
        setError("メールアドレス/ユーザー名 または パスワードが違います")
      } else {
        window.location.href = "/"
      }
    } else {
      // --- 新規登録処理 ---
      if (!Invitationcode.trim()) {
        setError("招待コードを入力してください(開発者に聞いてください)")
        setLoading(false)
        return
      }

      const isValidCode = await verifyInvitationCode(Invitationcode)
      if (!isValidCode) {
        setError("招待コードが正しくありません、または期限切れです")
        setLoading(false)
        return
      }

      // ユーザー名の整形 (先頭の@を取り除き、余計な空白を削る)
      const cleanUserName = userName.trim().replace(/^@/, "")

      if (!cleanUserName) {
        setError("ユーザー名を入力してください")
        setLoading(false)
        return
      }

      // ユーザー名の重複チェック (大文字小文字を区別しない ilike を使用)
      const { data: existing } = await supabase
        .from("users")
        .select("id")
        .ilike("user_name", cleanUserName)
        .maybeSingle()

      if (existing) {
        setError("そのユーザー名はすでに使われています")
        setLoading(false)
        return
      }

      // Supabase Auth にアカウントを作成
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { user_name: cleanUserName },
        },
      })

      if (signUpError) {
        setError("登録に失敗しました: " + signUpError.message)
        setLoading(false)
        return
      }

      // アバター画像のアップロード
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

      // public.users テーブルにユーザープロファイルを登録 (email は含めない)
      if (signUpData.user) {
        const { error: insertError } = await supabase.from("users").insert({
          id: signUpData.user.id,
          user_name: cleanUserName,
          display_name: displayName.trim() || cleanUserName,
          avatar_url: avatarUrl,
        })

        if (insertError) {
          console.error("public.users 保存エラー:", insertError)
          setError("プロフィールの保存に失敗しました: " + insertError.message)
          setLoading(false)
          return
        }
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
            onClick={() => { setConfirmSent(false); handleTabChange(true) }}
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
              type="button"
              onClick={() => handleTabChange(i === 0)}
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

        {/* フォーム構造化 */}
        <form onSubmit={handleSubmit}>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {/* 新規登録専用フィールド */}
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

                <input
                  placeholder="表示名(任意)"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  style={inputStyle}
                />

                {/* アイコン選択 */}
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <div style={{
                    width: "56px", height: "56px", borderRadius: "50%",
                    background: avatarPreview ? "transparent" : "#1d9bf0",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "22px", fontWeight: "bold", color: "#fff",
                    overflow: "hidden", flexShrink: 0
                  }}>
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      userName[0]?.toUpperCase() || "?"
                    )}
                  </div>

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
                        type="button"
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

            {/* メール / ユーザー名 */}
            <input
              placeholder={isLogin ? "メールアドレス または @ユーザー名" : "メールアドレス"}
              type={isLogin ? "text" : "email"}
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
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={eyeButtonStyle}
              >
                <img
                  src={showPassword ? "/Show.svg" : "/hide.svg"}
                  alt={showPassword ? "パスワードを隠す" : "パスワードを表示"}
                  style={{ width: "20px", height: "20px", display: "block" }}
                />
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
                  style={{
                    ...inputStyle,
                    paddingRight: "44px",
                    borderColor: confirmPassword && password !== confirmPassword ? "#f44" : "#444"
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={eyeButtonStyle}>
                  <img
                    src={showConfirmPassword ? "/Show.svg" : "/hide.svg"}
                    alt={showConfirmPassword ? "パスワードを隠す" : "パスワードを表示"}
                    style={{ width: "20px", height: "20px", display: "block" }}
                  />
                </button>
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

            {/* エラーメッセージ */}
            {error && (
              <p style={{ color: "#f44", fontSize: "14px", margin: "4px 0 0" }}>{error}</p>
            )}

            {/* 送信ボタン */}
            <button
              type="submit"
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
        </form>

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
          type="button"
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
            width="20" height="20"
            alt="Google"
          />
          Googleで{isLogin ? "ログイン" : "登録"}
        </button>
      </div>

      <style jsx global>{`
        .mobile-only {
          display: none !important;
        }
        .pc-only {
          display: block !important;
        }

        @media (max-width: 1200px) {
          .mobile-only {
            display: flex !important;
          }
          .pc-only {
            display: none !important;
          }
        }
      `}</style>
    </div>
  )
}