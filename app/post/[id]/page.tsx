"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { supabase } from "../../lib/supabase" // パスは環境に合わせてね
import Layout, { Reply } from "../../components/Layout"

type Post = {
  id: string
  user_name: string
  display_name?: string  // ★ これを追加！
  content: string
  created_at: string
  likes?: number
  liked?: boolean
  avatar_url?: string    // ★ これを追加！
  reply_to?: string | null
  reply_count?: number
}

// ★ アバター用コンポーネント（Layout と同じスタイル）
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

export default function PostDetailPage() {
  const params = useParams()
  const postId = params.id as string

  const [mainPost, setMainPost] = useState<Post | null>(null)
  const [replies, setReplies] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  // モーダル用 State
  const [replyingTo, setReplyingTo] = useState<Post | null>(null)

  // 1. 投稿データと返信一覧の取得
  // 1. 投稿データと返信一覧の取得
  const fetchPostAndReplies = async () => {
    if (!postId) return
    setLoading(true)

    // 親投稿の取得（users テーブルを結合して avatar_url と display_name を取得）
    const { data: postData, error: postError } = await supabase
      .from("posts")
      .select(`
      *,
      users (
        avatar_url,
        display_name
      )
    `)
      .eq("id", postId)
      .single()

    if (postError || !postData) {
      console.error("投稿の取得に失敗:", postError)
      setLoading(false)
      return
    }

    // users の情報をフラットに整形してセット
    const formattedMainPost = {
      ...postData,
      avatar_url: postData.users?.avatar_url,
      display_name: postData.users?.display_name || postData.user_name,
    }
    setMainPost(formattedMainPost)

    // この投稿に対する返信一覧の取得（こちらも同様に users を結合）
    const { data: replyData, error: replyError } = await supabase
      .from("posts")
      .select(`
      *,
      users (
        avatar_url,
        display_name
      )
    `)
      .eq("reply_to", postId)
      .order("created_at", { ascending: true })

    if (!replyError && replyData) {
      const formattedReplies = replyData.map((reply: any) => ({
        ...reply,
        avatar_url: reply.users?.avatar_url,
        display_name: reply.users?.display_name || reply.user_name,
      }))
      setReplies(formattedReplies)
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchPostAndReplies()
  }, [postId])

  if (loading) {
    return (
      <Layout Tab="home">
        <div style={{ padding: "20px", color: "#888" }}>読み込み中...</div>
      </Layout>
    )
  }

  if (!mainPost) {
    return (
      <Layout Tab="home">
        <div style={{ padding: "20px", color: "#888" }}>投稿が見つかりませんでした。</div>
      </Layout>
    )
  }

  return (
    <Layout Tab="home">
      {/* 1. 戻るボタンヘッダー */}
      <div style={{
        padding: "12px 16px",
        borderBottom: "1px solid #333",
        display: "flex",
        alignItems: "center",
        gap: "16px"
      }}>
        <button
          onClick={() => window.history.back()}
          style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: "18px" }}
        >
          ←
        </button>
        <h1 style={{ fontSize: "18px", fontWeight: "bold", margin: 0 }}>ポスト</h1>
      </div>

      {/* 2. 親ポスト（メインの投稿） */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
        <Avatar url={mainPost.avatar_url} name={mainPost.display_name || mainPost.user_name} size={48} />
        <div style={{ display: "flex", flexDirection: "column" }}>
          {/* 表示名 */}
          <span style={{ fontWeight: "bold", fontSize: "16px", color: "#fff" }}>
            {mainPost.display_name || mainPost.user_name}
          </span>
          {/* ユーザー名 */}
          <span style={{ fontSize: "14px", color: "#888" }}>
            @{mainPost.user_name}
          </span>
        </div>
        <p style={{ fontSize: "18px", lineHeight: "1.5", margin: "12px 0", whiteSpace: "pre-wrap" }}>
          {mainPost.content}
        </p>
        <div style={{ color: "#888", fontSize: "13px", marginBottom: "12px" }}>
          {new Date(mainPost.created_at).toLocaleString("ja-JP")}
        </div>

        {/* アクション領域（返信ボタン） */}
        <div style={{ borderTop: "1px solid #222", paddingTop: "12px" }}>
          <button
            onClick={() => setReplyingTo(mainPost)}
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
          </button>
        </div>
      </div>

      {/* 3. 返信（リプライ）一覧 */}
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
                padding: "16px",
                borderBottom: "1px solid #222",
                display: "flex",
                flexDirection: "column",
                gap: "6px"
              }}
            >
              <div style={{ fontWeight: "bold", fontSize: "14px", color: "#ccc" }}>
                @{reply.user_name}
              </div>
              <p style={{ margin: 0, fontSize: "15px", whiteSpace: "pre-wrap" }}>
                {reply.content}
              </p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "6px" }}>
                <button
                  onClick={() => setReplyingTo(reply)}
                  style={{ background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: "13px" }}
                >
                  💬 {reply.reply_count || 0}
                </button>
                <span style={{ color: "#555", fontSize: "12px" }}>
                  {new Date(reply.created_at).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 4. 作成した Reply モーダルを設置！ */}
      <Reply
        targetPost={replyingTo}
        onClose={() => setReplyingTo(null)}
        onSuccess={fetchPostAndReplies} // 返信できたら再読み込み！
      />
    </Layout >
  )
}