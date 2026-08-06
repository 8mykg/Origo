"use client"
export const dynamic = "force-dynamic"
import { useState, useEffect } from "react"
import { supabase } from "../../lib/supabase"

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

export default function PostPage({ params }: { params: { id: string } }) {
  const [post, setPost] = useState<Post | null>(null)
  const [replies, setReplies] = useState<Post[]>([])
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [replyInput, setReplyInput] = useState("")
  const [loading, setLoading] = useState(true)

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

  const formatDate = (str: string) => {
    const d = new Date(str)
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`
  }

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = "/auth"; return }

      const { data: userData } = await supabase
        .from("users").select("*").eq("id", session.user.id).single()
      if (userData) setCurrentUser(userData)

      fetchPost(session.user.id)
    }
    init()
  }, [])

  const fetchPost = async (userId?: string) => {
    const { data: usersData } = await supabase.from("users").select("*")
    const { data: likesData } = await supabase.from("likes").select("*")

    // 元の投稿
    const { data: postData } = await supabase
      .from("posts").select("*").eq("id", params.id).single()

    if (postData) {
      const postUser = usersData?.find((u) => u.user_name === postData.user_name)
      setPost({
        ...postData,
        display_name: postUser?.display_name || postData.user_name,
        avatar_url: postUser?.avatar_url || null,
        likes: likesData?.filter((l) => l.post_id === postData.id).length || 0,
        liked: likesData?.some((l) => l.post_id === postData.id && l.user_name === postUser?.user_name),
      })
    }

    // リプライ一覧
    const { data: repliesData } = await supabase
      .from("posts").select("*")
      .eq("reply_to", params.id)
      .order("created_at", { ascending: true })

    if (repliesData) {
      const merged = repliesData.map((r) => {
        const replyUser = usersData?.find((u) => u.user_name === r.user_name)
        return {
          ...r,
          display_name: replyUser?.display_name || r.user_name,
          avatar_url: replyUser?.avatar_url || null,
          likes: likesData?.filter((l) => l.post_id === r.id).length || 0,
          liked: likesData?.some((l) => l.post_id === r.id && l.user_name === replyUser?.user_name),
        }
      })
      setReplies(merged)
    }
    setLoading(false)
  }

  const handleLike = async (target: Post) => {
    if (!currentUser) return
    if (target.liked) {
      await supabase.from("likes").delete()
        .eq("post_id", target.id).eq("user_name", currentUser.user_name)
    } else {
      await supabase.from("likes").insert({
        post_id: target.id, user_name: currentUser.user_name
      })
    }
    fetchPost()
  }

  const handleReply = async () => {
    if (!replyInput.trim() || !currentUser || !post) return
    await supabase.from("posts").insert({
      user_name: currentUser.user_name,
      content: replyInput,
      reply_to: post.id,
    })
    await supabase.from("posts")
      .update({ reply_count: (post.reply_count || 0) + 1 })
      .eq("id", post.id)
    setReplyInput("")
    fetchPost()
  }

  const handleDelete = async (postId: string) => {
    if (!confirm("この投稿を削除しますか？")) return
    await supabase.from("posts").delete().eq("id", postId)
    if (postId === params.id) {
      window.location.href = "/"
    } else {
      fetchPost()
    }
  }

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#000", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontFamily: "sans-serif" }}>
      <p>読み込み中...</p>
    </div>
  )

  return (
    <div style={{ minHeight: "100vh", background: "#000", fontFamily: "sans-serif", color: "#fff", display: "flex", justifyContent: "center" }}>

      {/* メインコンテンツ */}
      <div style={{ width: "100%", maxWidth: "600px", borderRight: "1px solid #333", borderLeft: "1px solid #333" }}>

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
            onClick={() => window.history.back()}
            style={{ background: "none", border: "none", color: "#fff", fontSize: "20px", cursor: "pointer" }}>
            ←
          </button>
          <h1 style={{ fontSize: "18px", fontWeight: "bold", margin: 0 }}>投稿</h1>
        </div>

        {/* 元の投稿 */}
        {post && (
          <div style={{ padding: "20px", borderBottom: "1px solid #333" }}>
            <div style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
              <button
                onClick={() => window.location.href = `/profile?user=${post.user_name}`}
                style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}>
                <Avatar url={post.avatar_url} name={post.user_name} size={48} />
              </button>
              <div>
                <p style={{ margin: 0, fontWeight: "bold", fontSize: "16px" }}>{post.display_name}</p>
                <p style={{ margin: 0, color: "#888", fontSize: "14px" }}>@{post.user_name}</p>
              </div>
              {post.user_name === currentUser?.user_name && (
                <button
                  onClick={() => handleDelete(post.id)}
                  style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#555" }}
                  onMouseEnter={(e) => e.currentTarget.style.color = "#f44"}
                  onMouseLeave={(e) => e.currentTarget.style.color = "#555"}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                    <path d="M10 11v6M14 11v6"/>
                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                  </svg>
                </button>
              )}
            </div>

            {/* 本文 */}
            <p style={{ fontSize: "20px", lineHeight: "1.6", margin: "0 0 16px" }}>{post.content}</p>
            <p style={{ color: "#888", fontSize: "14px", margin: "0 0 16px" }}>{formatDate(post.created_at)}</p>

            {/* アクション */}
            <div style={{ display: "flex", gap: "24px", borderTop: "1px solid #333", paddingTop: "12px" }}>
              <button
                onClick={() => handleLike(post)}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: post.liked ? "#f91880" : "#888",
                  fontSize: "14px", display: "flex", alignItems: "center", gap: "6px"
                }}>
                {post.liked ? "❤️" : "🤍"} {post.likes} いいね
              </button>
              <span style={{ color: "#888", fontSize: "14px", display: "flex", alignItems: "center", gap: "6px" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                {post.reply_count || 0} 返信
              </span>
            </div>
          </div>
        )}

        {/* リプライ入力 */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #333", display: "flex", gap: "12px" }}>
          <Avatar url={currentUser?.avatar_url} name={currentUser?.user_name || ""} />
          <div style={{ flex: 1 }}>
            <textarea
              placeholder="返信する..."
              value={replyInput}
              onChange={(e) => setReplyInput(e.target.value)}
              style={{
                width: "100%", background: "transparent",
                border: "none", outline: "none",
                fontSize: "16px", resize: "none",
                color: "#fff", boxSizing: "border-box", minHeight: "60px"
              }}
              rows={2}
            />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #333", paddingTop: "12px" }}>
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

        {/* リプライ一覧 */}
        {replies.map((reply) => (
          <div key={reply.id} style={{ borderBottom: "1px solid #333", padding: "16px 20px", display: "flex", gap: "12px" }}>
            <button
              onClick={() => window.location.href = `/profile?user=${reply.user_name}`}
              style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}>
              <Avatar url={reply.avatar_url} name={reply.user_name} />
            </button>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "4px" }}>
                <strong style={{ fontSize: "15px" }}>{reply.display_name}</strong>
                <span style={{ color: "#888", fontSize: "13px" }}>@{reply.user_name}</span>
                <span style={{ color: "#888", fontSize: "13px" }}>{formatDate(reply.created_at)}</span>
              </div>
              <p style={{ margin: "0 0 12px", fontSize: "15px", lineHeight: "1.5" }}>{reply.content}</p>
              <div style={{ display: "flex", gap: "16px" }}>
                <button
                  onClick={() => handleLike(reply)}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    color: reply.liked ? "#f91880" : "#888",
                    fontSize: "14px", display: "flex", alignItems: "center", gap: "6px",
                    padding: "4px 8px", borderRadius: "20px"
                  }}>
                  {reply.liked ? "❤️" : "🤍"} {reply.likes}
                </button>
                {reply.user_name === currentUser?.user_name && (
                  <button
                    onClick={() => handleDelete(reply.id)}
                    style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#555" }}
                    onMouseEnter={(e) => e.currentTarget.style.color = "#f44"}
                    onMouseLeave={(e) => e.currentTarget.style.color = "#555"}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                      <path d="M10 11v6M14 11v6"/>
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}