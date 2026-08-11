"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "../../lib/supabase"
import Layout, { Reply } from "../../components/Layout"

type Post = {
  id: string
  user_name: string
  display_name?: string
  content: string
  created_at: string
  avatar_url?: string
  reply_to?: string | null
  reply_count?: number
  likes?: number
  liked?: boolean
  reply_to_user?: string | null // ★ これを追加！
}

type User = {
  id: string
  user_name: string
  display_name: string
  avatar_url?: string
}

const Avatar = ({ url, name, size = 44 }: { url?: string | null; name: string; size?: number }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: "50%",
      background: url ? "transparent" : "#1d9bf0",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: "bold",
      fontSize: size * 0.4,
      color: "#fff",
      overflow: "hidden",
      flexShrink: 0,
    }}
  >
    {url ? (
      <img src={url} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt={name} />
    ) : (
      name[0]?.toUpperCase()
    )}
  </div>
)

export default function PostDetailPage() {
  const params = useParams()
  const router = useRouter()
  const postId = params?.id as string

  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [mainPost, setMainPost] = useState<Post | null>(null)
  const [replies, setReplies] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [replyingTo, setReplyingTo] = useState<Post | null>(null)

  // 1. ユーザーセッションの初期化（Homeと同様）
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
        setCurrentUser(userData)
      } else {
        const userName = session.user.user_metadata?.user_name || session.user.email?.split("@")[0] || ""
        setCurrentUser({ id: session.user.id, user_name: userName, display_name: userName })
      }
    }
    init()
  }, [])

  // 2. ユーザー取得後に投稿データを取得
  useEffect(() => {
    if (currentUser && postId) {
      fetchPostAndReplies()
    }
  }, [currentUser, postId])

  // 投稿＆返信データの一括取得処理
  const fetchPostAndReplies = async () => {
    if (!postId || !currentUser) return
    setLoading(true)

    try {
      // 共通データの取得
      const { data: likesData } = await supabase.from("likes").select("*")
      const { data: usersData } = await supabase.from("users").select("*")
      const { data: allPostsData } = await supabase.from("posts").select("*")

      // ① メインポストの取得
      const { data: postData } = await supabase
        .from("posts")
        .select("*")
        .eq("id", postId)
        .single()

      if (postData) {
        const postUser = usersData?.find((u) => u.user_name === postData.user_name)
        const replyCount = allPostsData?.filter((p) => p.reply_to === postData.id).length || 0

        setMainPost({
          ...postData,
          display_name: postUser?.display_name || postData.user_name,
          avatar_url: postUser?.avatar_url || null,
          likes: likesData?.filter((l) => l.post_id === postData.id).length || 0,
          liked: likesData?.some((l) => l.post_id === postData.id && l.user_name === currentUser.user_name),
          reply_count: replyCount,
        })

        // ★ メインポスト自身が返信投稿だった場合の親ユーザー名を取得
        let replyToUser = null
        if (postData.reply_to) {
          const parentPost = allPostsData?.find((p) => p.id === postData.reply_to)
          if (parentPost) {
            replyToUser = parentPost.user_name
          }
        }

        setMainPost({
          ...postData,
          display_name: postUser?.display_name || postData.user_name,
          avatar_url: postUser?.avatar_url || null,
          likes: likesData?.filter((l) => l.post_id === postData.id).length || 0,
          liked: likesData?.some((l) => l.post_id === postData.id && l.user_name === currentUser.user_name),
          reply_count: replyCount,
          reply_to_user: replyToUser, // ★ 追加！
        })
      } else {
        setMainPost(null)
      }

      // ② 子ポスト（返信一覧）の取得
      const { data: replyData } = await supabase
        .from("posts")
        .select("*")
        .eq("reply_to", postId)
        .order("created_at", { ascending: true })

      if (replyData) {
        const mergedReplies = replyData.map((reply) => {
          const replyUser = usersData?.find((u) => u.user_name === reply.user_name)
          const subReplyCount = allPostsData?.filter((p) => p.reply_to === reply.id).length || 0

          return {
            ...reply,
            display_name: replyUser?.display_name || reply.user_name,
            avatar_url: replyUser?.avatar_url || null,
            likes: likesData?.filter((l) => l.post_id === reply.id).length || 0,
            liked: likesData?.some((l) => l.post_id === reply.id && l.user_name === currentUser.user_name),
            reply_count: subReplyCount,
          }
        })
        setReplies(mergedReplies)
      } else {
        setReplies([])
      }
    } catch (err) {
      console.error("データ取得エラー:", err)
    } finally {
      setLoading(false)
    }
  }

  // 3. いいね処理（Homeと同一のロジック）
  const handleLike = async (post: Post) => {
    if (!currentUser) return

    if (post.liked) {
      await supabase
        .from("likes")
        .delete()
        .eq("post_id", post.id)
        .eq("user_name", currentUser.user_name)
    } else {
      await supabase
        .from("likes")
        .insert({ post_id: post.id, user_name: currentUser.user_name })
    }

    fetchPostAndReplies()
  }

  const formatDate = (str: string) => {
    const d = new Date(str)
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`
  }

  if (loading) {
    return (
      <Layout Tab="home">
        <div style={{ padding: "20px", color: "#888", textAlign: "center" }}>読み込み中...</div>
      </Layout>
    )
  }

  if (!mainPost) {
    return (
      <Layout Tab="home">
        <div style={{ padding: "20px", color: "#888", textAlign: "center" }}>投稿が見つかりませんでした。</div>
      </Layout>
    )
  }

  return (
    <Layout Tab="home">
      {/* ヘッダー */}
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid #333",
          display: "flex",
          alignItems: "center",
          gap: "16px",
        }}
      >
        <button
          onClick={() => router.back()}
          style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: "18px" }}
        >
          ←
        </button>
        <h1 style={{ fontSize: "18px", fontWeight: "bold", margin: 0 }}>ポスト</h1>
      </div>

      {/* メインポスト */}
      <div style={{ padding: "16px", borderBottom: "1px solid #333" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
          <Avatar url={mainPost.avatar_url} name={mainPost.user_name} size={48} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontWeight: "bold", fontSize: "16px", color: "#fff" }}>
              {mainPost.display_name}
            </span>
            <span style={{ fontSize: "14px", color: "#888" }}>@{mainPost.user_name}</span>
          </div>
        </div>

        {/* ★ メインポストが返信の場合に「返信先: @ユーザー名」を表示 */}
        {mainPost.reply_to_user && (
          <div style={{ color: "#888", fontSize: "14px", marginBottom: "8px" }}>
            返信先: <span style={{ color: "#1d9bf0" }}>@{mainPost.reply_to_user}</span> さん
          </div>
        )}

        <p style={{ fontSize: "18px", lineHeight: "1.5", margin: "12px 0", whiteSpace: "pre-wrap", wordBreak: "break-word", color: "#fff" }}>
          {mainPost.content}
        </p>

        <div style={{ color: "#888", fontSize: "13px", marginBottom: "12px" }}>
          {formatDate(mainPost.created_at)}
        </div>

        <div style={{ borderTop: "1px solid #222", paddingTop: "12px", display: "flex", gap: "24px", alignItems: "center" }}>
          {/* いいねボタン */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleLike(mainPost)
            }}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: mainPost.liked ? "#f91880" : "#888",
              fontSize: "14px", display: "flex", alignItems: "center", gap: "6px",
              padding: "4px 8px", borderRadius: "20px"
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                fill={mainPost.liked ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
            <span>{mainPost.likes}</span>
          </button>

          {/* 返信ボタン */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              setReplyingTo(mainPost)
            }}
            style={{
              background: "none", border: "none", color: "#888",
              cursor: "pointer", fontSize: "14px", display: "flex",
              alignItems: "center", gap: "6px", padding: "4px 8px", borderRadius: "20px"
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span>{mainPost.reply_count}</span>
          </button>
        </div>
      </div>

      {/* 返信（リプライ）一覧 */}
      <div>
        {replies.length === 0 ? (
          <div style={{ padding: "20px", color: "#888", textAlign: "center", fontSize: "14px" }}>
            まだ返信はありません
          </div>
        ) : (
          replies.map((reply) => (
            <div
              key={reply.id}
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid #333",
                display: "flex",
                gap: "12px",
              }}
            >
              <Avatar url={reply.avatar_url} name={reply.user_name} size={40} />

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "4px" }}>
                  <strong style={{ fontSize: "15px", color: "#fff" }}>{reply.display_name}</strong>
                  <span style={{ color: "#888", fontSize: "13px" }}>@{reply.user_name}</span>
                  <span style={{ color: "#888", fontSize: "13px" }}>{formatDate(reply.created_at)}</span>
                </div>

                <p
                  style={{
                    margin: "0 0 8px",
                    fontSize: "15px",
                    lineHeight: "1.5",
                    wordBreak: "break-word",
                    whiteSpace: "pre-wrap",
                    color: "#eee",
                  }}
                >
                  {reply.content}
                </p>

                <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                  {/* 子ポスト用いいね */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleLike(reply)
                    }}
                    style={{
                      background: "none", border: "none", cursor: "pointer",
                      color: reply.liked ? "#f91880" : "#888",
                      fontSize: "14px", display: "flex", alignItems: "center", gap: "6px",
                      padding: "4px 8px", borderRadius: "20px"
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                        fill={reply.liked ? "currentColor" : "none"}
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                    </svg>
                    <span>{reply.likes}</span>
                  </button>

                  {/* 子ポスト用リプライ */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setReplyingTo(reply)
                    }}
                    style={{
                      background: "none", border: "none", color: "#888",
                      cursor: "pointer", fontSize: "14px", display: "flex",
                      alignItems: "center", gap: "6px", padding: "4px 8px", borderRadius: "20px"
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    <span>{reply.reply_count}</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <Reply
        targetPost={replyingTo}
        onClose={() => setReplyingTo(null)}
        onSuccess={fetchPostAndReplies}
      />
    </Layout>
  )
}