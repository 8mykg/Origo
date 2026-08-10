"use client"

import { useState, useEffect, use } from "react"
import { supabase } from "../../lib/supabase"
import Layout from "../../components/Layout"

// ----------------------------------------------------
// 型定義
// ----------------------------------------------------
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
  bio: string
  created_at: string
}

export default function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: postId } = use(params)

  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [mainPost, setMainPost] = useState<Post | null>(null)
  const [replies, setReplies] = useState<Post[]>([])
  const [replyInput, setReplyInput] = useState("")
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // 1. 初期データ読み込み
  useEffect(() => {
    const init = async () => {
      // ログインユーザー確認
      const { data: { session } } = await supabase.auth.getSession()
      let myUser: User | null = null
      if (session) {
        const { data: myData } = await supabase
          .from("users")
          .select("*")
          .eq("id", session.user.id)
          .single<User>()
        if (myData) {
          myUser = myData
          setCurrentUser(myData)
        }
      }

      // 対象の親投稿（メイン投稿）を取得
      await fetchMainPostAndReplies(myUser?.user_name)
      setLoading(false)
    }

    init()
  }, [postId])

  // 2. メイン投稿 ＆ 返信一覧の取得
  const fetchMainPostAndReplies = async (myUserName?: string) => {
    // メイン投稿の取得
    const { data: postData } = await supabase
      .from("posts")
      .select("*")
      .eq("id", postId)
      .single<Post>()

    if (postData) {
      // 投稿者のユーザー情報（表示名・アイコン）を取得
      const { data: authorData } = await supabase
        .from("users")
        .select("*")
        .eq("user_name", postData.user_name)
        .single<User>()

      // いいね情報の取得
      const { data: likesData } = await supabase.from("likes").select("*")

      const likes = likesData?.filter((l: { post_id: string }) => l.post_id === postData.id).length || 0
      const liked = likesData?.some(
        (l: { post_id: string; user_name: string }) => l.post_id === postData.id && l.user_name === myUserName
      )

      setMainPost({
        ...postData,
        display_name: authorData?.display_name || postData.user_name,
        avatar_url: authorData?.avatar_url || undefined,
        likes,
        liked,
      })
    }

    // この投稿に対するリプライ（返信）一覧を取得
    const { data: replyData } = await supabase
      .from("posts")
      .select("*")
      .eq("reply_to", postId)
      .order("created_at", { ascending: true })

    if (replyData) {
      // リプライ投稿者のユーザー情報を一括取得
      const { data: usersData } = await supabase.from("users").select("*")
      const { data: likesData } = await supabase.from("likes").select("*")

      const mergedReplies: Post[] = replyData.map((reply: Post) => {
        const author = usersData?.find((u: User) => u.user_name === reply.user_name)
        return {
          ...reply,
          display_name: author?.display_name || reply.user_name,
          avatar_url: author?.avatar_url || undefined,
          likes: likesData?.filter((l: { post_id: string }) => l.post_id === reply.id).length || 0,
          liked: likesData?.some(
            (l: { post_id: string; user_name: string }) => l.post_id === reply.id && l.user_name === myUserName
          ),
        }
      })

      setReplies(mergedReplies)
    }
  }

  // 3. リプライ送信機能
  const handleSendReply = async () => {
    if (!replyInput.trim() || !currentUser || !mainPost || submitting) return
    setSubmitting(true)

    const { error } = await supabase.from("posts").insert({
      user_name: currentUser.user_name,
      display_name: currentUser.display_name,
      content: replyInput.trim(),
      reply_to: mainPost.id, // 親投稿のIDを指定！
    })

    if (error) {
      alert("返信に失敗しました: " + error.message)
    } else {
      setReplyInput("")
      // 返信一覧を更新
      fetchMainPostAndReplies(currentUser.user_name)
    }
    setSubmitting(false)
  }

  // 4. いいね処理
  const handleLike = async (targetPost: Post, isMain = false) => {
    if (!currentUser) return

    if (targetPost.liked) {
      await supabase
        .from("likes")
        .delete()
        .eq("post_id", targetPost.id)
        .eq("user_name", currentUser.user_name)
    } else {
      await supabase
        .from("likes")
        .insert({ post_id: targetPost.id, user_name: currentUser.user_name })
    }

    fetchMainPostAndReplies(currentUser.user_name)
  }

  // ログアウト処理
  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = "/auth"
  }

  // 日時フォーマット
  const formatDate = (str: string) => {
    if (!str) return ""
    const d = new Date(str)
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`
  }

  if (loading) {
    return <div style={{ background: "#000", minHeight: "100vh", color: "#fff", padding: "20px" }}>読み込み中...</div>
  }

  if (!mainPost) {
    return (
      <Layout Tab="home">
        <div style={{ padding: "40px", textAlign: "center", color: "#888" }}>
          投稿が見つかりませんでした。
        </div>
      </Layout>
    )
  }

  return (
    <Layout Tab="home">
      <div style={{ maxWidth: "600px", borderRight: "1px solid #333", borderLeft: "1px solid #333", minHeight: "100vh", paddingBottom: "80px" }}>

        {/* ヘッダー */}
        <div style={{
          position: "sticky", top: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(12px)",
          borderBottom: "1px solid #333", padding: "16px 20px", zIndex: 10, display: "flex", alignItems: "center", gap: "16px"
        }}>
          <button
            onClick={() => window.history.back()}
            style={{ background: "none", border: "none", color: "#fff", fontSize: "20px", cursor: "pointer" }}
          >
            ←
          </button>
          <h1 style={{ margin: 0, fontSize: "18px" }}>投稿</h1>
        </div>

        {/* メイン投稿エリア */}
        <div style={{ padding: "20px", borderBottom: "1px solid #333" }}>
          <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "12px" }}>
            <div style={{
              width: "48px", height: "48px", borderRadius: "50%", background: mainPost.avatar_url ? "transparent" : "#1d9bf0",
              display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "20px", overflow: "hidden"
            }}>
              {mainPost.avatar_url ? (
                <img src={mainPost.avatar_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                mainPost.user_name[0]?.toUpperCase()
              )}
            </div>
            <div>
              <div style={{ fontWeight: "bold", fontSize: "16px" }}>{mainPost.display_name}</div>
              <div style={{ color: "#888", fontSize: "14px" }}>@{mainPost.user_name}</div>
            </div>
          </div>

          {/* 投稿本文（長文対応＆改行反映） */}
          <p style={{
            fontSize: "18px", lineHeight: "1.6", margin: "16px 0",
            wordBreak: "break-word", whiteSpace: "pre-wrap"
          }}>
            {mainPost.content}
          </p>

          <div style={{ color: "#888", fontSize: "14px", marginBottom: "16px" }}>
            {formatDate(mainPost.created_at)}
          </div>

          <div style={{ borderTop: "1px solid #222", borderBottom: "1px solid #222", padding: "12px 0", display: "flex", gap: "24px" }}>
            <button
              onClick={() => handleLike(mainPost, true)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: mainPost.liked ? "#f91880" : "#888", fontSize: "15px",
                display: "flex", alignItems: "center", gap: "6px"
              }}
            >
              {mainPost.liked ? "❤️" : "🤍"} {mainPost.likes}
            </button>
          </div>
        </div>

        {/* 返信入力フォーム */}
        {currentUser && (
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #333", display: "flex", gap: "12px" }}>
            <input
              type="text"
              placeholder="返信をポスト"
              value={replyInput}
              onChange={(e) => setReplyInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendReply()}
              style={{
                flex: 1, background: "#111", border: "1px solid #333", borderRadius: "20px",
                padding: "10px 16px", color: "#fff", fontSize: "15px", outline: "none"
              }}
            />
            <button
              onClick={handleSendReply}
              disabled={submitting || !replyInput.trim()}
              style={{
                background: replyInput.trim() ? "#1d9bf0" : "#555", border: "none", color: "#fff",
                borderRadius: "20px", padding: "8px 20px", fontWeight: "bold", cursor: replyInput.trim() ? "pointer" : "not-allowed"
              }}
            >
              返信
            </button>
          </div>
        )}

        {/* リプライ一覧 */}
        <div>
          {replies.map((reply) => (
            <div key={reply.id} style={{ padding: "16px 20px", borderBottom: "1px solid #222", display: "flex", gap: "12px" }}>
              <div style={{
                width: "40px", height: "40px", borderRadius: "50%", background: reply.avatar_url ? "transparent" : "#1d9bf0",
                display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "16px", overflow: "hidden"
              }}>
                {reply.avatar_url ? (
                  <img src={reply.avatar_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  reply.user_name[0]?.toUpperCase()
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "4px" }}>
                  <strong>{reply.display_name}</strong>
                  <span style={{ color: "#888", fontSize: "13px" }}>@{reply.user_name}</span>
                  <span style={{ color: "#888", fontSize: "13px" }}>{formatDate(reply.created_at)}</span>
                </div>
                <p style={{
                  margin: "0 0 8px", fontSize: "15px", lineHeight: "1.5",
                  wordBreak: "break-word", whiteSpace: "pre-wrap"
                }}>
                  {reply.content}
                </p>
                <button
                  onClick={() => handleLike(reply)}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    color: reply.liked ? "#f91880" : "#888", fontSize: "13px",
                    display: "flex", alignItems: "center", gap: "4px"
                  }}
                >
                  {reply.liked ? "❤️" : "🤍"} {reply.likes}
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>
    </Layout>
  )
}