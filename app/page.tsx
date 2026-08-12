"use client"
export const dynamic = "force-dynamic"
import { useState, useEffect } from "react"
import { supabase } from "./lib/supabase"
import { useRouter } from "next/navigation"
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
import { Reply } from "./components/Layout"
import Layout, { PostItem, Post, User } from "./components/Layout"

export default function Home() {
  const isMobile = useIsMobile()
  const [posts, setPosts] = useState<Post[]>([])
  const [input, setInput] = useState("")
  const [targetUrl, setTargetUrl] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [replyingTo, setReplyingTo] = useState<any | null>(null)
  const router = useRouter()

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = "/auth"; return }

      const { data: userData } = await supabase
        .from("users").select("*").eq("id", session.user.id).single()

      if (!userData) {
        const userName = session.user.user_metadata?.user_name || session.user.email?.split("@")[0]
        await supabase.from("users").insert({
          id: session.user.id, user_name: userName, display_name: userName, bio: null, created_at: "1970-01-01T00:00:00.000Z"
        })
        setCurrentUser({ id: session.user.id, user_name: userName, display_name: userName, bio: null, created_at: "1970-01-01T00:00:00.000Z" })
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
    const { data: bookmarksData } = await supabase.from("bookmarks").select("*")

    if (postsData) {
      const merged = postsData.map((post) => {
        const postUser = usersData?.find((u) => u.user_name === post.user_name)

        // ★ 返信先（親ポスト）がある場合、その親ポストの投稿者ユーザー名を探す
        let replyToUser = null
        if (post.reply_to) {
          const parentPost = postsData.find((p) => p.id === post.reply_to)
          if (parentPost) {
            replyToUser = parentPost.user_name
          }
        }

        return {
          ...post,
          display_name: postUser?.display_name || post.user_name,
          avatar_url: postUser?.avatar_url || null,
          likes: likesData?.filter((l) => l.post_id === post.id).length || 0,
          liked: likesData?.some((l) => l.post_id === post.id && l.user_name === currentUser?.user_name),
          bookmarked: bookmarksData?.some((b) => b.post_id === post.id && b.user_name === currentUser?.user_name),
          reply_to_user: replyToUser, // ★ 返信先のユーザー名を保持！
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

  const handleBookmark = async (post: Post) => {
    if (!currentUser) return

    if (post.bookmarked) {
      // ブックマーク解除
      await supabase
        .from("bookmarks")
        .delete()
        .eq("post_id", post.id)
        .eq("user_name", currentUser.user_name)
    } else {
      // ブックマーク追加
      await supabase
        .from("bookmarks")
        .insert({ post_id: post.id, user_name: currentUser.user_name })
    }

    // 再取得（TLや検索の再読込関数を呼ぶ）
    fetchPosts()
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
          <PostItem
            key={post.id}
            post={post}
            currentUser={currentUser}
            onLike={handleLike}
            onReply={(p) => setReplyingTo(p)}
            onBookmark={handleBookmark}
            onDelete={handleDelete}
            onLinkClick={(url) => setTargetUrl(url)}
          />
        ))}
      </div>
      <Reply
        targetPost={replyingTo}
        onClose={() => setReplyingTo(null)}
        onSuccess={fetchPosts} // 送信成功したら投稿一覧を再取得！
      />
    </Layout>
  )
}