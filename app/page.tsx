"use client"
export const dynamic = "force-dynamic"
import { useState, useEffect } from "react"
import { supabase } from "./lib/supabase"
import Layout from "./components/Layout"
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])
  return isMobile
}

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
  const isMobile = useIsMobile()
  const [posts, setPosts] = useState<Post[]>([])
  const [targetUrl, setTargetUrl] = useState<string | null>(null)
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

  const LinkedText = ({ text, onLinkClick }: { text: string; onLinkClick: (url: string) => void }) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g
    const parts = text.split(urlRegex)

    return (
      <span>
        {parts.map((part, i) =>
          urlRegex.test(part) ? (
            <span
              key={i}
              onClick={(e) => {
                e.stopPropagation()
                onLinkClick(part)
              }}
              style={{ color: "#1d9bf0", cursor: "pointer", textDecoration: "underline" }}
              onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
            >
              {part}
            </span>
          ) : (
            part
          )
        )}
      </span>
    )
  }

  const handleDelete = async (postId: string) => {

    await supabase.from("likes").delete().eq("post_id", postId)

    const { error } = await supabase.from("posts").delete().eq("id", postId)

    if (error) {
      console.error("削除失敗:", error.message)
      alert("削除できませんでした: " + error.message)
      return
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

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#000", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontFamily: "sans-serif" }}>
      <p>読み込み中...</p>
    </div>
  )

  return (
    <Layout 
      Tab="home"
    >
      < div style={{ padding: "16px" }}>
        {<div style={{ borderBottom: "1px solid #333", padding: "16px 20px", display: "flex", gap: "12px" }}>
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
        </div>}
        {posts.map((post) => (
          <div key={post.id} style={{ borderBottom: "1px solid #333", padding: "16px 20px", display: "flex", gap: "12px" }}>
            <button
              onClick={() => window.location.href = `/profile/${post.user_name}`}
              style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}>
              <Avatar url={post.avatar_url} name={post.user_name} />
            </button>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "4px" }}>
                <strong style={{ fontSize: "15px" }}>{post.display_name}</strong>
                <span style={{ color: "#888", fontSize: "13px" }}>@{post.user_name}</span>
                <span style={{ color: "#888", fontSize: "13px" }}>{formatDate(post.created_at)}</span>
              </div>
              <p style={{ margin: "0 0 12px", fontSize: "15px", lineHeight: "1.5" }}>
                <LinkedText text={post.content} onLinkClick={(url) => setTargetUrl(url)} />
              </p>
              <div style={{ display: "flex", gap: "16px" }}>
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
      </div>
    </Layout >
  )
}