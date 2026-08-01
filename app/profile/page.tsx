"use client"
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
    <div style={{ minHeight: "100vh", background: "#000", color: "#fff", fontFamily: "sans-serif" }}>
      {/* ヘッダー */}
      <div style={{
        position: "sticky", top: 0,
        background: "rgba(0,0,0,0.8)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid #333",
        padding: "16px 20px",
        maxWidth: "600px",
        margin: "0 auto",
        zIndex: 10,
        display: "flex",
        alignItems: "center",
        gap: "16px"
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

      <div style={{ maxWidth: "600px", margin: "0 auto" }}>
        {/* プロフィールカード */}
        <div style={{ padding: "20px", borderBottom: "1px solid #333" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
            {/* アバター */}
            <div>
            <AvatarUpload
            userId={user?.id || ""}
            currentAvatar={avatarUrl}
            userName={userName}
            onUploadComplete={(url) => setAvatarUrl(url)}
            />
            </div>
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
                    border: "none", color: "#fff",
                    borderRadius: "20px", padding: "8px 16px",
                    cursor: saving ? "not-allowed" : "pointer", fontWeight: "bold"
                  }}>
                  {saving ? "保存中..." : "保存"}
                </button>
              </div>
            )}
          </div>

          {editing ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {/* ユーザー名変更 */}
              <div>
                <label style={{ color: "#888", fontSize: "13px", marginBottom: "4px", display: "block" }}>
                  ユーザー名（英数字・アンダースコアのみ）
                </label>
                <div style={{ position: "relative" }}>
                  <span style={{
                    position: "absolute", left: "12px", top: "50%",
                    transform: "translateY(-50%)", color: "#888"
                  }}>@</span>
                  <input
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    style={{
                      width: "100%", background: "#111",
                      border: "1px solid #444", borderRadius: "8px",
                      padding: "10px 10px 10px 28px",
                      color: "#fff", fontSize: "15px",
                      outline: "none", boxSizing: "border-box"
                    }}
                  />
                </div>
              </div>

              {/* 表示名 */}
              <div>
                <label style={{ color: "#888", fontSize: "13px", marginBottom: "4px", display: "block" }}>
                  表示名
                </label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="表示名"
                  style={{
                    width: "100%", background: "#111",
                    border: "1px solid #444", borderRadius: "8px",
                    padding: "10px", color: "#fff", fontSize: "15px",
                    outline: "none", boxSizing: "border-box"
                  }}
                />
              </div>

              {/* 自己紹介 */}
              <div>
                <label style={{ color: "#888", fontSize: "13px", marginBottom: "4px", display: "block" }}>
                  自己紹介
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="自己紹介を書いてみよう"
                  rows={3}
                  style={{
                    width: "100%", background: "#111",
                    border: "1px solid #444", borderRadius: "8px",
                    padding: "10px", color: "#fff", fontSize: "15px",
                    outline: "none", resize: "none", boxSizing: "border-box"
                  }}
                />
              </div>

              {error && <p style={{ color: "#f44", fontSize: "14px", margin: 0 }}>{error}</p>}
            </div>
          ) : (
            <div>
              <p style={{ margin: "0 0 4px", fontWeight: "bold", fontSize: "18px" }}>
                {user?.display_name || userName}
              </p>
              <p style={{ margin: "0 0 8px", color: "#888", fontSize: "14px" }}>@{userName}</p>
              {user?.bio && <p style={{ margin: "0 0 8px", fontSize: "15px" }}>{user.bio}</p>}
              <p style={{ margin: 0, color: "#888", fontSize: "13px" }}>
                登録日: {user ? formatDate(user.created_at) : ""}
              </p>
            </div>
          )}
        </div>

        {/* 投稿一覧 */}
        {posts.map((post) => (
          <div key={post.id} style={{
            borderBottom: "1px solid #333",
            padding: "16px 20px",
            display: "flex", gap: "12px"
          }}>
            <div style={{
              width: "44px", height: "44px", borderRadius: "50%",
              background: "#1d9bf0",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: "bold", fontSize: "18px", flexShrink: 0
            }}>
              {userName[0]?.toUpperCase()}
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
    </div>
  )
}