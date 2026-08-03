"use client"
export const dynamic = "force-dynamic"
import { useState, useEffect } from "react"
import { supabase } from "../lib/supabase"
import AvatarUpload from "../components/AvatarUpload"

type User = {
  id: string
  user_name: string
  display_name: string
  bio: string
  created_at: string
}

type Post = {
  id: string
  user_name: string
  content: string
  created_at: string
  likes?: number
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [editing, setEditing] = useState(false)
  const [displayName, setDisplayName] = useState("")
  const [userName, setUserName] = useState("")
  const [newUserName, setNewUserName] = useState("")
  const [bio, setBio] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        window.location.href = "/auth"
        return
      }

      const { data: userData } = await supabase
        .from("users")
        .select("*")
        .eq("id", session.user.id)
        .single()

      if (userData) {
        setUser(userData)
        setAvatarUrl(userData.avatar_url || null)
        setUserName(userData.user_name)
        setNewUserName(userData.user_name)
        setDisplayName(userData.display_name || "")
        setBio(userData.bio || "")
        fetchPosts(userData.user_name)
      }
      setLoading(false)
    }
    init()
  }, [])

  const fetchPosts = async (name: string) => {
    const { data: postsData } = await supabase
      .from("posts")
      .select("*")
      .eq("user_name", name)
      .order("created_at", { ascending: false })

    const { data: likesData } = await supabase
      .from("likes")
      .select("*")

    if (postsData) {
      const merged = postsData.map((post) => ({
        ...post,
        likes: likesData?.filter((l) => l.post_id === post.id).length || 0,
      }))
      setPosts(merged)
    }
  }

  const handleSave = async () => {
    setError("")
    setSaving(true)

    // ユーザー名が変わった場合は重複チェック
    if (newUserName !== userName) {
      if (newUserName.length < 3) {
        setError("ユーザー名は3文字以上にしてください")
        setSaving(false)
        return
      }
      if (!/^[a-zA-Z0-9_]+$/.test(newUserName)) {
        setError("ユーザー名は英数字とアンダースコアのみ使えます")
        setSaving(false)
        return
      }

      const { data: existing } = await supabase
        .from("users")
        .select("*")
        .eq("user_name", newUserName)
        .single()

      if (existing) {
        setError("そのユーザー名はすでに使われています")
        setSaving(false)
        return
      }

      // 投稿・いいねのユーザー名も更新
      await supabase
        .from("posts")
        .update({ user_name: newUserName })
        .eq("user_name", userName)

      await supabase
        .from("likes")
        .update({ user_name: newUserName })
        .eq("user_name", userName)
    }

    // プロフィール更新
    await supabase
      .from("users")
      .update({
        user_name: newUserName,
        display_name: displayName,
        bio,
      })
      .eq("id", user?.id)

    setUserName(newUserName)
    setUser((prev) => prev ? {
      ...prev,
      user_name: newUserName,
      display_name: displayName,
      bio,
    } : null)
    fetchPosts(newUserName)
    setEditing(false)
    setSaving(false)
  }

  const formatDate = (str: string) => {
    const d = new Date(str)
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`
  }

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh", background: "#000",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#fff", fontFamily: "sans-serif"
      }}>
        <p>読み込み中...</p>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: "100vh", background: "#000",
      fontFamily: "sans-serif", color: "#fff",
      display: "flex", justifyContent: "space-between"
    }}>

      {/* 左サイドバー */}
      <div style={{
        width: "260px", padding: "20px 12px",
        position: "sticky", top: 0, height: "100vh",
        display: "flex", flexDirection: "column",
        borderRight: "1px solid #333", flexShrink: 0
      }}>
        <div style={{ padding: "12px 16px", marginBottom: "8px" }}>
          <img src="/logo-compact.svg" alt="Origo" style={{ height: "40px", width: "auto" }} />
        </div>

        <nav style={{ flex: 1 }}>
          {[
            {
              icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              ), label: "ホーム", action: () => window.location.href = "/"
            },
            {
              icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              ), label: "プロフィール", action: () => window.location.href = "/profile", active: true
            },
            {
              icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              ), label: "設定", action: () => { }, soon: true
            },
          ].map((item, i) => (
            <button
              key={i}
              onClick={item.action}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: "16px",
                background: item.active ? "#111" : "none",
                border: "none", borderRadius: "12px",
                padding: "12px 16px", cursor: "pointer",
                color: item.active ? "#fff" : "#aaa",
                fontSize: "16px", marginBottom: "4px", textAlign: "left"
              }}>
              {item.icon}
              <span style={{ fontWeight: item.active ? "bold" : "normal" }}>{item.label}</span>
              {item.soon && (
                <span style={{
                  marginLeft: "auto", fontSize: "10px",
                  background: "#1d9bf020", color: "#1d9bf0",
                  padding: "2px 8px", borderRadius: "10px",
                  border: "1px solid #1d9bf040"
                }}>近日公開</span>
              )}
            </button>
          ))}

          <button
            onClick={() => window.location.href = "/"}
            style={{
              width: "100%", background: "#1d9bf0",
              border: "none", borderRadius: "24px",
              padding: "14px", color: "#fff",
              fontWeight: "bold", fontSize: "16px",
              cursor: "pointer", marginTop: "16px"
            }}>
            投稿する
          </button>
        </nav>

        {/* ユーザー情報 */}
        <div style={{
          display: "flex", alignItems: "center", gap: "12px",
          borderRadius: "12px", padding: "12px"
        }}>
          {avatarUrl ? (
            <img src={avatarUrl} style={{ width: "40px", height: "40px", borderRadius: "50%", objectFit: "cover" }} />
          ) : (
            <div style={{
              width: "40px", height: "40px", borderRadius: "50%",
              background: "#1d9bf0", display: "flex", alignItems: "center",
              justifyContent: "center", fontWeight: "bold", fontSize: "16px"
            }}>{userName[0]?.toUpperCase()}</div>
          )}
          <div style={{ flex: 1, overflow: "hidden" }}>
            <p style={{ margin: 0, fontSize: "14px", fontWeight: "bold", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user?.display_name}
            </p>
            <p style={{ margin: 0, fontSize: "13px", color: "#888" }}>@{userName}</p>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div style={{ flex: 1, borderRight: "1px solid #333", borderLeft: "1px solid #333" }}>
        {/* ヘッダー */}
        <div style={{
          position: "sticky", top: 0,
          background: "rgba(0,0,0,0.8)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid #333",
          padding: "16px 20px", zIndex: 10,
          display: "flex", alignItems: "center", gap: "16px"
        }}>
          <button
            onClick={() => window.location.href = "/"}
            style={{ background: "none", border: "none", color: "#fff", fontSize: "20px", cursor: "pointer" }}>
            ←
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: "18px" }}>{user?.display_name || userName}</h1>
            <p style={{ margin: 0, fontSize: "13px", color: "#888" }}>{posts.length}件の投稿</p>
          </div>
        </div>

        {/* プロフィールカード */}
        <div style={{ padding: "20px", borderBottom: "1px solid #333" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
            <AvatarUpload
              userId={user?.id || ""}
              currentAvatar={avatarUrl}
              userName={userName}
              onUploadComplete={(url) => setAvatarUrl(url)}
            />
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                style={{
                  background: "none", border: "1px solid #555",
                  color: "#fff", borderRadius: "20px",
                  padding: "8px 16px", cursor: "pointer", fontWeight: "bold"
                }}>
                編集
              </button>
            ) : (
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() => {
                    setEditing(false)
                    setNewUserName(userName)
                    setDisplayName(user?.display_name || "")
                    setBio(user?.bio || "")
                    setError("")
                  }}
                  style={{
                    background: "none", border: "1px solid #555",
                    color: "#888", borderRadius: "20px",
                    padding: "8px 16px", cursor: "pointer", fontWeight: "bold"
                  }}>
                  キャンセル
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    background: saving ? "#555" : "#1d9bf0",
                    border: "none", color: "#fff", borderRadius: "20px",
                    padding: "8px 16px", cursor: saving ? "not-allowed" : "pointer", fontWeight: "bold"
                  }}>
                  {saving ? "保存中..." : "保存"}
                </button>
              </div>
            )}
          </div>

          {editing ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ color: "#888", fontSize: "13px", marginBottom: "4px", display: "block" }}>
                  ユーザー名（英数字・アンダースコアのみ）
                </label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#888" }}>@</span>
                  <input
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    style={{
                      width: "100%", background: "#111",
                      border: "1px solid #444", borderRadius: "8px",
                      padding: "10px 10px 10px 28px",
                      color: "#fff", fontSize: "15px",
                      outline: "none", boxSizing: "border-box" as const
                    }}
                  />
                </div>
              </div>
              <div>
                <label style={{ color: "#888", fontSize: "13px", marginBottom: "4px", display: "block" }}>表示名</label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  style={{
                    width: "100%", background: "#111",
                    border: "1px solid #444", borderRadius: "8px",
                    padding: "10px", color: "#fff", fontSize: "15px",
                    outline: "none", boxSizing: "border-box" as const
                  }}
                />
              </div>
              <div>
                <label style={{ color: "#888", fontSize: "13px", marginBottom: "4px", display: "block" }}>自己紹介</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  style={{
                    width: "100%", background: "#111",
                    border: "1px solid #444", borderRadius: "8px",
                    padding: "10px", color: "#fff", fontSize: "15px",
                    outline: "none", resize: "none", boxSizing: "border-box" as const
                  }}
                />
              </div>
              {error && <p style={{ color: "#f44", fontSize: "14px", margin: 0 }}>{error}</p>}
            </div>
          ) : (
            <div>
              <p style={{ margin: "0 0 4px", fontWeight: "bold", fontSize: "18px" }}>{user?.display_name || userName}</p>
              <p style={{ margin: "0 0 8px", color: "#888", fontSize: "14px" }}>@{userName}</p>
              {user?.bio && <p style={{ margin: "0 0 8px", fontSize: "15px" }}>{user.bio}</p>}
              <p style={{ margin: 0, color: "#888", fontSize: "13px" }}>登録日: {user ? formatDate(user.created_at) : ""}</p>
            </div>
          )}
        </div>

        {/* 投稿一覧 */}
        {posts.map((post) => (
          <div key={post.id} style={{ borderBottom: "1px solid #333", padding: "16px 20px", display: "flex", gap: "12px" }}>
            <div style={{
              width: "44px", height: "44px", borderRadius: "50%",
              background: avatarUrl ? "transparent" : "#1d9bf0",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: "bold", fontSize: "18px", flexShrink: 0, overflow: "hidden"
            }}>
              {avatarUrl
                ? <img src={avatarUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : userName[0]?.toUpperCase()
              }
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "4px" }}>
                <strong>{user?.display_name || userName}</strong>
                <span style={{ color: "#888", fontSize: "13px" }}>@{userName}</span>
                <span style={{ color: "#888", fontSize: "13px" }}>{formatDate(post.created_at)}</span>
              </div>
              <p style={{ margin: "0 0 8px", fontSize: "15px", lineHeight: "1.5" }}>{post.content}</p>
              <span style={{ color: "#888", fontSize: "13px" }}>❤️ {post.likes}</span>
            </div>
          </div>
        ))}
      </div>

      {/* 右サイドバー */}
      <div style={{
        width: "320px", padding: "20px 16px",
        position: "sticky", top: 0, height: "100vh",
        overflowY: "auto", flexShrink: 0
      }}>
        <div style={{ background: "#111", borderRadius: "16px", padding: "16px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: "bold", margin: "0 0 8px" }}>プロフィール</h2>
          <p style={{ color: "#888", fontSize: "14px", margin: 0 }}>
            編集ボタンから表示名・自己紹介・ユーザー名を変更できます
          </p>
        </div>
      </div>

    </div>
  )
}