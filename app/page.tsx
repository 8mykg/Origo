"use client"
export const dynamic = "force-dynamic"
import { useState, useEffect } from "react"
import { supabase } from "./lib/supabase"

type Post = {
  id: string
  user_name: string
  display_name: string
  content: string
  created_at: string
  likes?: number
  liked?: boolean
  avatar_url?: string
  reply_to?: string | null
  reply_count?: number
}

type User = {
  id: string
  user_name: string
  display_name: string
  avatar_url?: string
}

export default function Home() {
  const [posts, setPosts] = useState<Post[]>([])
  const [replyingTo, setReplyingTo] = useState<Post | null>(null)
  const [replyInput, setReplyInput] = useState("")
  const [input, setInput] = useState("")
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("home")

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = "/auth"; return }

      const { data: userData } = await supabase
        .from("users").select("*").eq("id", session.user.id).single()

      if (!userData) {
        const userName = session.user.user_metadata?.user_name || session.user.email?.split("@")[0]
        await supabase.from("users").insert({
          id: session.user.id, user_name: userName, display_name: userName,
        })
        setCurrentUser({ id: session.user.id, user_name: userName, display_name: userName })
      } else {
        setCurrentUser(userData)
      }
      setLoading(false)
    }
    init()
  }, [])

  useEffect(() => { if (currentUser) fetchPosts() }, [currentUser])

  const fetchPosts = async () => {
    const { data: postsData } = await supabase.from("posts").select("*").order("created_at", { ascending: false })
    const { data: likesData } = await supabase.from("likes").select("*")
    const { data: usersData } = await supabase.from("users").select("*")

    if (postsData) {
      const merged = postsData.map((post) => {
        const postUser = usersData?.find((u) => u.user_name === post.user_name)
        return {
          ...post,
          display_name: postUser?.display_name || post.user_name,
          avatar_url: postUser?.avatar_url || null,
          likes: likesData?.filter((l) => l.post_id === post.id).length || 0,
          liked: likesData?.some((l) => l.post_id === post.id && l.user_name === currentUser?.user_name),
        }
      })
      setPosts(merged)
    }
  }

  const handlePost = async () => {
    if (!input.trim() || !currentUser) return
    await supabase.from("posts").insert({ user_name: currentUser.user_name, content: input })
    setInput("")
    fetchPosts()
  }

  const handleLike = async (post: Post) => {
    if (!currentUser) return
    if (post.liked) {
      await supabase.from("likes").delete().eq("post_id", post.id).eq("user_name", currentUser.user_name)
    } else {
      await supabase.from("likes").insert({ post_id: post.id, user_name: currentUser.user_name })
    }
    fetchPosts()
  }

  const handleReply = async () => {
    if (!replyInput.trim() || !currentUser || !replyingTo) return
    await supabase.from("posts").insert({
      user_name: currentUser.user_name,
      content: replyInput,
      reply_to: replyingTo.id,
    })

    // リプライ数を更新
    await supabase.from("posts")
      .update({ reply_count: (replyingTo.reply_count || 0) + 1 })
      .eq("id", replyingTo.id)

    setReplyInput("")
    setReplyingTo(null)
    fetchPosts()
  }

  const handleDelete = async (postId: string) => {
    if (!confirm("この投稿を削除しますか？")) return
    await supabase.from("posts").delete().eq("id", postId)
    fetchPosts()
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = "/auth"
  }

  const formatDate = (str: string) => {
    const d = new Date(str)
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`
  }

  const Avatar = ({ url, name, size = 44 }: { url?: string | null, name: string, size?: number }) => (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: url ? "transparent" : "#1d9bf0",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: "bold", fontSize: size * 0.4, color: "#fff",
      overflow: "hidden", flexShrink: 0
    }}>
      {url
        ? <img src={url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        : name[0]?.toUpperCase()
      }
    </div>
  )

  const navItems = [
    {
      id: "home",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ),
      label: "ホーム",
      action: () => setActiveTab("home")
    },
    {
      id: "notifications",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      ),
      label: "通知",
      action: () => setActiveTab("notifications"),
      soon: true
    },
    {
      id: "bookmarks",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
      ),
      label: "ブックマーク",
      action: () => setActiveTab("bookmarks"),
      soon: true
    },
    {
      id: "profile",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
      label: "プロフィール",
      action: () => window.location.href = "/profile"
    },
    {
      id: "settings",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      ),
      label: "設定",
      action: () => setActiveTab("settings"),
      soon: true
    },
  ]

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#000", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontFamily: "sans-serif" }}>
      <p>読み込み中...</p>
    </div>
  )

  return (
    <div style={{
      minHeight: "100vh", background: "#000",
      fontFamily: "sans-serif", color: "#fff",
      display: "flex", justifyContent: "space-between"
    }}>

      {/* リプライモーダル */}
      {replyingTo && (
        <div style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.7)",
          zIndex: 1000, display: "flex",
          alignItems: "center", justifyContent: "center"
        }}>
          <div style={{
            background: "#111", border: "1px solid #333",
            borderRadius: "16px", padding: "24px",
            width: "500px", maxWidth: "90vw"
          }}>
            {/* 元の投稿 */}
            <div style={{ display: "flex", gap: "12px", marginBottom: "16px", opacity: 0.7 }}>
              <Avatar url={replyingTo.avatar_url} name={replyingTo.user_name} size={36} />
              <div>
                <span style={{ fontWeight: "bold", fontSize: "14px" }}>{replyingTo.display_name}</span>
                <span style={{ color: "#888", fontSize: "13px", marginLeft: "8px" }}>@{replyingTo.user_name}</span>
                <p style={{ margin: "4px 0 0", fontSize: "14px", color: "#ccc" }}>{replyingTo.content}</p>
              </div>
            </div>

            <div style={{ borderLeft: "2px solid #333", marginLeft: "18px", paddingLeft: "16px", marginBottom: "16px" }}>
              <span style={{ color: "#888", fontSize: "13px" }}>返信先: @{replyingTo.user_name}</span>
            </div>

            {/* リプライ入力 */}
            <div style={{ display: "flex", gap: "12px" }}>
              <Avatar url={currentUser?.avatar_url} name={currentUser?.user_name || ""} size={36} />
              <textarea
                placeholder={`@${replyingTo.user_name}に返信`}
                value={replyInput}
                onChange={(e) => setReplyInput(e.target.value)}
                autoFocus
                style={{
                  flex: 1, background: "transparent",
                  border: "none", outline: "none",
                  fontSize: "16px", resize: "none",
                  color: "#fff", minHeight: "80px"
                }}
                rows={3}
              />
            </div>

            <div style={{
              display: "flex", justifyContent: "space-between",
              alignItems: "center", marginTop: "16px",
              borderTop: "1px solid #333", paddingTop: "12px"
            }}>
              <button
                onClick={() => { setReplyingTo(null); setReplyInput("") }}
                style={{
                  background: "none", border: "none",
                  color: "#888", cursor: "pointer", fontSize: "14px"
                }}>
                キャンセル
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ color: replyInput.length > 300 ? "#f00" : "#888", fontSize: "14px" }}>
                  {300 - replyInput.length}
                </span>
                <button
                  onClick={handleReply}
                  disabled={!replyInput.trim() || replyInput.length > 300}
                  style={{
                    background: !replyInput.trim() || replyInput.length > 300 ? "#555" : "#1d9bf0",
                    color: "white", border: "none", borderRadius: "24px",
                    padding: "8px 20px", fontWeight: "bold",
                    cursor: !replyInput.trim() || replyInput.length > 300 ? "not-allowed" : "pointer"
                  }}>
                  返信する
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 左サイドバー */}
      <div style={{
        width: "280px", padding: "20px 12px",
        position: "sticky", top: 0, height: "100vh",
        display: "flex", flexDirection: "column",
        borderRight: "1px solid #333",
        flexShrink: 0
      }}>
        {/* ロゴ */}
        <div style={{ padding: "0px 0px", marginBottom: "12px" }}>
          <img src="/logo-compact.svg" alt="Origo" style={{ height: "60px", width: "auto" }} />
        </div>
        {/* ナビ */}
        <nav style={{ flex: 1 }}>
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={item.action}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: "16px",
                background: activeTab === item.id ? "#111" : "none",
                border: "none", borderRadius: "12px",
                padding: "12px 16px", cursor: "pointer",
                color: activeTab === item.id ? "#fff" : "#aaa",
                fontSize: "16px", marginBottom: "4px",
                textAlign: "left"
              }}>
              <span style={{ fontSize: "20px" }}>{item.icon}</span>
              <span style={{ fontWeight: activeTab === item.id ? "bold" : "normal" }}>
                {item.label}
              </span>
              {item.soon && (
                <span style={{
                  marginLeft: "auto", fontSize: "10px",
                  background: "#1d9bf020", color: "#1d9bf0",
                  padding: "2px 8px", borderRadius: "10px",
                  border: "1px solid #1d9bf040"
                }}>
                  開発中
                </span>
              )}
            </button>
          ))}

          {/* 投稿ボタン */}
          <button
            onClick={() => setActiveTab("home")}
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
        <div
          style={{
            display: "flex", alignItems: "center", gap: "12px",
            background: "none", border: "none", color: "#fff",
            borderRadius: "12px", padding: "12px",
            width: "100%", textAlign: "left"
          }}>
          <Avatar url={currentUser?.avatar_url} name={currentUser?.user_name || ""} size={40} />
          <div style={{ flex: 1, overflow: "hidden" }}>
            <p style={{ margin: 0, fontSize: "14px", fontWeight: "bold", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {currentUser?.display_name}
            </p>
            <p style={{ margin: 0, fontSize: "13px", color: "#888" }}>@{currentUser?.user_name}</p>
          </div>
          <button
            onClick={handleLogout}
            style={{
              background: "none", border: "none", color: "#888",
              cursor: "pointer", padding: "4px"
            }}>
            ↩
          </button>
        </div>
      </div>

      {/* メインフィード */}
      <div style={{ flex: 1, borderRight: "1px solid #333", borderLeft: "1px solid #333" }}>
        {/* ヘッダー */}
        <div style={{
          position: "sticky", top: 0,
          background: "rgba(0,0,0,0.8)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid #333",
          padding: "16px 20px", zIndex: 10
        }}>
          <h1 style={{ fontSize: "20px", fontWeight: "bold", margin: 0 }}>ホーム</h1>
        </div>

        {/* 開発中タブが選ばれたとき */}
        {activeTab !== "home" && (
          <div style={{
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            padding: "80px 20px", color: "#888", textAlign: "center"
          }}>
            <p style={{ fontSize: "40px", margin: "0 0 16px" }}>🚧</p>
            <p style={{ fontSize: "20px", fontWeight: "bold", color: "#fff", margin: "0 0 8px" }}>開発中！</p>
            <p style={{ fontSize: "15px" }}>この機能は現在開発中です。お楽しみに！</p>
            <button
              onClick={() => setActiveTab("home")}
              style={{
                marginTop: "24px", background: "#1d9bf0",
                border: "none", borderRadius: "24px",
                padding: "10px 24px", color: "#fff",
                fontWeight: "bold", cursor: "pointer"
              }}>
              ホームに戻る
            </button>
          </div>
        )}

        {/* ホームフィード */}
        {activeTab === "home" && (
          <>
            {/* 投稿ボックス */}
            <div style={{ borderBottom: "1px solid #333", padding: "16px 20px", display: "flex", gap: "12px" }}>
              <Avatar url={currentUser?.avatar_url} name={currentUser?.user_name || ""} />
              <div style={{ flex: 1 }}>
                <textarea
                  placeholder="いまなにしてる？"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  style={{
                    width: "100%", background: "transparent",
                    border: "none", outline: "none",
                    fontSize: "18px", resize: "none",
                    color: "#fff", boxSizing: "border-box", minHeight: "80px"
                  }}
                  rows={3}
                />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #333", paddingTop: "12px" }}>
                  <span style={{ color: input.length > 300 ? "#f00" : "#888", fontSize: "14px" }}>
                    {300 - input.length}
                  </span>
                  <button
                    onClick={handlePost}
                    disabled={!input.trim() || input.length > 300}
                    style={{
                      background: !input.trim() || input.length > 300 ? "#555" : "#1d9bf0",
                      color: "white", border: "none", borderRadius: "24px",
                      padding: "8px 20px", fontWeight: "bold",
                      fontSize: "15px", cursor: !input.trim() || input.length > 300 ? "not-allowed" : "pointer"
                    }}>
                    投稿する
                  </button>
                </div>
              </div>
            </div>

            {/* 投稿一覧 */}
            {posts.map((post) => (
              <div key={post.id} style={{ borderBottom: "1px solid #333", padding: "16px 20px", display: "flex", gap: "12px" }}>
                <button
                  onClick={() => window.location.href = `/profile?user=${post.user_name}`}
                  style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}>
                  <Avatar url={post.avatar_url} name={post.user_name} />
                </button>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "4px" }}>
                    <strong style={{ fontSize: "15px" }}>{post.display_name}</strong>
                    <span style={{ color: "#888", fontSize: "13px" }}>@{post.user_name}</span>
                    <span style={{ color: "#888", fontSize: "13px" }}>{formatDate(post.created_at)}</span>
                  </div>
                  {/* いいねボタン */}
                  <button
                    onClick={() => handleLike(post)}
                    style={{
                      background: "none", border: "none", cursor: "pointer",
                      color: post.liked ? "#f91880" : "#888",
                      fontSize: "14px", display: "flex", alignItems: "center",
                      gap: "6px", padding: "4px 8px", borderRadius: "20px"
                    }}>
                    {post.liked ? "❤️" : "🤍"} {post.likes}
                  </button>
                  <p style={{ margin: "0 0 12px", fontSize: "15px", lineHeight: "1.5" }}>{post.content}</p>
                  <div style={{ display: "flex", gap: "16px" }}>
                    {/* リプライボタン */}
                    <button
                      onClick={() => setReplyingTo(post)}
                      style={{
                        background: "none", border: "none",
                        cursor: "pointer", color: "#888",
                        fontSize: "14px", display: "flex",
                        alignItems: "center", gap: "6px",
                        padding: "4px 8px", borderRadius: "20px"
                      }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                      {post.reply_count || 0}
                    </button>
                      {/* 自分の投稿だけ削除ボタン表示 */}
                      {post.user_name === currentUser?.user_name && (
                        <button
                          onClick={() => handleDelete(post.id)}
                          style={{
                            marginLeft: "auto", background: "none",
                            border: "none", cursor: "pointer",
                            color: "#555", padding: "2px 6px",
                            borderRadius: "4px", fontSize: "13px"
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.color = "#f44"}
                          onMouseLeave={(e) => e.currentTarget.style.color = "#555"}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                            <path d="M10 11v6M14 11v6" />
                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                          </svg>
                        </button>
                      )}
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* 右サイドバー */}
      <div style={{
        width: "320px", padding: "20px 16px",
        position: "sticky", top: 0, height: "100vh",
        overflowY: "auto", flexShrink: 0,
        borderLeft: "1px solid #333"
      }}>
        {/* 検索欄 */}
        <div style={{ position: "relative", marginBottom: "16px" }}>
          <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", fontSize: "16px" }}>🔍</span>
          <input
            placeholder="検索（開発中）"
            disabled
            style={{
              width: "100%", background: "#111",
              border: "1px solid #333", borderRadius: "24px",
              padding: "12px 12px 12px 44px",
              color: "#555", fontSize: "15px",
              outline: "none", boxSizing: "border-box",
              cursor: "not-allowed"
            }}
          />
        </div>

        {/* トレンド */}
        <div style={{ background: "#111", borderRadius: "16px", padding: "16px", marginBottom: "16px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: "bold", margin: "0 0 16px" }}>トレンド</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {["#Origo", "#SNS開発", "#Next_js", "#Supabase"].map((tag, i) => (
              <div key={i} style={{ borderBottom: i < 3 ? "1px solid #222" : "none", paddingBottom: i < 3 ? "12px" : "0" }}>
                <p style={{ margin: "0 0 2px", fontSize: "13px", color: "#888" }}>トレンド</p>
                <p style={{ margin: 0, fontWeight: "bold", fontSize: "15px" }}>{tag}</p>
              </div>
            ))}
          </div>
          <button style={{ background: "none", border: "none", color: "#1d9bf0", cursor: "not-allowed", fontSize: "14px", marginTop: "12px", padding: 0 }}>
            もっと見る（開発中）
          </button>
        </div>

        {/* おすすめユーザー */}
        <div style={{ background: "#111", borderRadius: "16px", padding: "16px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: "bold", margin: "0 0 16px" }}>おすすめユーザー</h2>
          <p style={{ color: "#888", fontSize: "14px", margin: 0 }}>フォロー機能は開発中！</p>
        </div>
      </div>

    </div>
  )
}