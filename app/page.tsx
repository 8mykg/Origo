export const dynamic = "force-dynamic"
"use client"
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
}

type User = {
  id: string
  user_name: string
  display_name: string
}

export default function Home() {
  const [posts, setPosts] = useState<Post[]>([])
  const [input, setInput] = useState("")
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

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

      if (!userData) {
        const userName = session.user.user_metadata?.user_name || session.user.email?.split("@")[0]
        await supabase.from("users").insert({
          id: session.user.id,
          user_name: userName,
          display_name: userName,
        })
        setCurrentUser({ id: session.user.id, user_name: userName, display_name: userName })
      } else {
        setCurrentUser(userData)
      }

      setLoading(false)
    }

    init()
  }, [])

  useEffect(() => {
    if (currentUser) fetchPosts()
  }, [currentUser])

  const fetchPosts = async () => {
    const { data: postsData } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false })

    const { data: likesData } = await supabase
      .from("likes")
      .select("*")

    const { data: usersData } = await supabase
      .from("users")
      .select("*")

    if (postsData) {
      const merged = postsData.map((post) => {
        const postUser = usersData?.find((u) => u.user_name === post.user_name)
        return {
          ...post,
          display_name: postUser?.display_name || post.user_name,
          likes: likesData?.filter((l) => l.post_id === post.id).length || 0,
          liked: likesData?.some((l) => l.post_id === post.id && l.user_name === currentUser?.user_name),
        }
      })
      setPosts(merged)
    }
  }

  const handlePost = async () => {
    if (!input.trim() || !currentUser) return
    await supabase.from("posts").insert({
      user_name: currentUser.user_name,
      content: input,
    })
    setInput("")
    fetchPosts()
  }

  const handleLike = async (post: Post) => {
    if (!currentUser) return
    if (post.liked) {
      await supabase
        .from("likes")
        .delete()
        .eq("post_id", post.id)
        .eq("user_name", currentUser.user_name)
    } else {
      await supabase.from("likes").insert({
        post_id: post.id,
        user_name: currentUser.user_name,
      })
    }
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
    <div style={{ minHeight: "100vh", background: "#000", fontFamily: "sans-serif", color: "#fff" }}>
      {/* ヘッダー */}
      <div style={{
        position: "sticky", top: 0,
        background: "rgba(0,0,0,0.8)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid #333",
        padding: "16px 20px",
        maxWidth: "600px",
        margin: "0 auto",
        zIndex: 10
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 style={{ fontSize: "20px", fontWeight: "bold", margin: 0 }}>ホーム</h1>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button
              onClick={() => window.location.href = "/profile"}
              style={{
                background: "none", border: "1px solid #555",
                color: "#fff", borderRadius: "20px",
                padding: "6px 14px", cursor: "pointer", fontSize: "14px"
              }}>
              @{currentUser?.user_name}
            </button>
            <button
              onClick={handleLogout}
              style={{
                background: "none", border: "1px solid #555",
                color: "#888", borderRadius: "20px",
                padding: "6px 14px", cursor: "pointer", fontSize: "14px"
              }}>
              ログアウト
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: "600px", margin: "0 auto" }}>
        {/* 投稿ボックス */}
        <div style={{
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
            {currentUser?.user_name[0]?.toUpperCase()}
          </div>
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
            <div style={{
              display: "flex", justifyContent: "space-between",
              alignItems: "center",
              borderTop: "1px solid #333", paddingTop: "12px"
            }}>
              <span style={{ color: input.length > 140 ? "#f00" : "#888", fontSize: "14px" }}>
                {140 - input.length}
              </span>
              <button
                onClick={handlePost}
                disabled={!input.trim() || input.length > 140}
                style={{
                  background: !input.trim() || input.length > 140 ? "#555" : "#1d9bf0",
                  color: "white", border: "none", borderRadius: "24px",
                  padding: "8px 20px", fontWeight: "bold",
                  fontSize: "15px",
                  cursor: !input.trim() || input.length > 140 ? "not-allowed" : "pointer"
                }}>
                投稿する
              </button>
            </div>
          </div>
        </div>

        {/* 投稿一覧 */}
        {posts.map((post) => (
          <div key={post.id} style={{
            borderBottom: "1px solid #333",
            padding: "16px 20px",
            display: "flex", gap: "12px"
          }}>
            <button
              onClick={() => window.location.href = `/profile?user=${post.user_name}`}
              style={{
                width: "44px", height: "44px", borderRadius: "50%",
                background: post.user_name === currentUser?.user_name ? "#1d9bf0" : "#555",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: "bold", fontSize: "18px", flexShrink: 0,
                border: "none", cursor: "pointer", color: "#fff"
              }}>
              {post.user_name[0]?.toUpperCase()}
            </button>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "4px" }}>
                <strong style={{ fontSize: "15px" }}>{post.display_name}</strong>
                <span style={{ color: "#888", fontSize: "13px" }}>@{post.user_name}</span>
                <span style={{ color: "#888", fontSize: "13px" }}>{formatDate(post.created_at)}</span>
              </div>
              <p style={{ margin: "0 0 12px", fontSize: "15px", lineHeight: "1.5" }}>{post.content}</p>
              <button
                onClick={() => handleLike(post)}
                style={{
                  background: "none", border: "none",
                  cursor: "pointer",
                  color: post.liked ? "#f91880" : "#888",
                  fontSize: "14px", display: "flex",
                  alignItems: "center", gap: "6px",
                  padding: "4px 8px", borderRadius: "20px"
                }}>
                {post.liked ? "❤️" : "🤍"} {post.likes}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}