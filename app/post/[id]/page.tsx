"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "../../lib/supabase"
import { FullScreenLoading } from "../../components/CSSTransformation"
import { sendDeviceNotification } from "../../lib/notification"
import Layout, { Reply, PostItem, Post, User, ReactionModal, LinkedText } from "../../components/Layout"

export default function PostDetailPage() {
  const params = useParams()
  const router = useRouter()
  const postId = params?.id as string
  const [targetUrl, setTargetUrl] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [mainPost, setMainPost] = useState<Post | null>(null)
  const [replies, setReplies] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [replyingTo, setReplyingTo] = useState<Post | null>(null)
  const [reactionTargetPost, setReactionTargetPost] = useState<any | null>(null)
  const [viewsCount, setViewsCount] = useState<number>(0)

  // 1. ユーザーセッションの初期化
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
        setCurrentUser({
          id: session.user.id, user_name: userName, display_name: userName,
          bio: null, created_at: "1970-01-01T00:00:00.000Z", role: "user"
        })
      }
    }
    init()
  }, [])

  // 2. 閲覧ログの記録と閲覧数取得
  useEffect(() => {
    const recordAndFetchViews = async () => {
      if (!postId) return
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        await supabase.from("post_views").upsert(
          { post_id: postId, user_id: user.id },
          { onConflict: "post_id,user_id", ignoreDuplicates: true }
        )
      }

      const { count } = await supabase
        .from("post_views")
        .select("*", { count: "exact", head: true })
        .eq("post_id", postId)

      if (count !== null) {
        setViewsCount(count)
      }
    }

    recordAndFetchViews()
  }, [postId])

  // 3. 投稿データの取得
  useEffect(() => {
    if (currentUser && postId) {
      fetchPostAndReplies()
    }
  }, [currentUser, postId])

  const fetchPostAndReplies = async () => {
    if (!postId || !currentUser) return
    setLoading(true)

    try {
      // 対象ポストに関連する周辺情報のみ取得
      const { data: likesData } = await supabase.from("likes").select("*")
      const { data: usersData } = await supabase.from("users").select("*")
      const { data: allPostsData } = await supabase.from("posts").select("*")
      const { data: bookmarksData } = await supabase.from("bookmarks").select("*")

      // ① メインポストの取得
      const { data: postData } = await supabase
        .from("posts")
        .select("*")
        .eq("id", postId)
        .single()

      if (postData) {
        const postUser = usersData?.find((u) => u.user_name === postData.user_name)
        const replyCount = allPostsData?.filter((p) => p.reply_to === postData.id).length || 0

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
          bookmarked: bookmarksData?.some((b) => b.post_id === postData.id && b.user_name === currentUser.user_name),
          bookmarks_count: bookmarksData?.filter((b) => b.post_id === postData.id).length || 0,
          reply_count: replyCount,
          reply_to_user: replyToUser,
        })
      } else {
        setMainPost(null)
      }

      // ② 返信（子ポスト）の取得
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
            bookmarked: bookmarksData?.some((b) => b.post_id === reply.id && b.user_name === currentUser.user_name),
            bookmarks_count: bookmarksData?.filter((b) => b.post_id === reply.id).length || 0,
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

  // いいね処理
  const handleLike = async (post: Post) => {
    if (!currentUser) return

    const isMain = post.id === mainPost?.id
    const nextLiked = !post.liked
    const currentLikes = post.likes ?? 0
    const nextLikes = post.liked ? currentLikes - 1 : currentLikes + 1

    if (isMain && mainPost) {
      setMainPost({ ...mainPost, liked: nextLiked, likes: nextLikes })
    } else {
      setReplies((prev) =>
        prev.map((r) => (r.id === post.id ? { ...r, liked: nextLiked, likes: nextLikes } : r))
      )
    }

    if (post.liked) {
      await supabase.from("likes").delete().eq("post_id", post.id).eq("user_name", currentUser.user_name)
    } else {
      await supabase.from("likes").insert({ post_id: post.id, user_name: currentUser.user_name })
    }

    if (post.user_name !== currentUser.user_name) {
      await supabase.from("notifications").insert({
        user_name: post.user_name,
        actor_name: currentUser.user_name,
        type: "like",
        post_id: post.id,
      })

      sendDeviceNotification("新しいいいね！", {
        body: `@${currentUser.user_name} さんがあなたのポストに「いいね」しました`,
      })
    }
  }

  // ブックマーク処理
  const handleBookmark = async (post: Post) => {
    if (!currentUser) return

    const isMain = post.id === mainPost?.id
    const nextBookmarked = !post.bookmarked
    const currentCount = post.bookmarks_count ?? 0
    const nextCount = nextBookmarked ? currentCount + 1 : Math.max(0, currentCount - 1)

    if (isMain && mainPost) {
      setMainPost({
        ...mainPost,
        bookmarked: nextBookmarked,
        bookmarks_count: nextCount
      })
    } else {
      setReplies((prev) =>
        prev.map((r) =>
          r.id === post.id
            ? { ...r, bookmarked: nextBookmarked, bookmarks_count: nextCount }
            : r
        )
      )
    }

    if (post.bookmarked) {
      await supabase.from("bookmarks").delete().eq("post_id", post.id).eq("user_name", currentUser.user_name)
    } else {
      await supabase.from("bookmarks").insert({ post_id: post.id, user_name: currentUser.user_name })
    }
  }

  // リアクション処理
  const handleToggleReaction = async (post: Post, emoji: string) => {
    if (!currentUser) return

    const myReactions = post.reactions?.filter((r) => r.hasReacted) || []
    const alreadyReacted = myReactions.some((r) => r.emoji === emoji)

    if (alreadyReacted) {
      const { error } = await supabase
        .from("reactions")
        .delete()
        .eq("post_id", post.id)
        .eq("user_name", currentUser.user_name)
        .eq("emoji", emoji)

      if (error) alert("削除に失敗しました: " + error.message)
    } else {
      if (myReactions.length >= 3) {
        alert("リアクションは1つの投稿につき3個までです")
        return
      }

      const { error } = await supabase.from("reactions").insert({
        post_id: post.id,
        user_name: currentUser.user_name,
        emoji: emoji.trim().slice(0, 10),
      })

      if (error) {
        alert("追加に失敗しました: " + error.message)
      } else if (post.user_name !== currentUser.user_name) {
        await supabase.from("notifications").insert({
          user_name: post.user_name,
          actor_name: currentUser.user_name,
          type: "reaction",
          post_id: post.id,
        })
      }
    }
  }

  // 削除処理
  const handleDelete = async (targetPostId: string, isMainPost = false) => {
    if (!confirm("本当に削除しますか？")) return

    await supabase.from("likes").delete().eq("post_id", targetPostId)
    const { error } = await supabase.from("posts").delete().eq("id", targetPostId)

    if (error) {
      alert("削除できませんでした: " + error.message)
      return
    }

    if (isMainPost) {
      router.push("/")
    } else {
      fetchPostAndReplies()
    }
  }

  const formatDate = (str: string) => {
    const d = new Date(str)
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`
  }

  if (loading) {
    return (
      <Layout Tab="home">
        <FullScreenLoading />
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
          position: "sticky",
          top: 0,
          background: "rgba(0,0,0,0.8)",
          backdropFilter: "blur(12px)",
          zIndex: 10
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
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: mainPost.avatar_url ? "transparent" : "#1d9bf0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "bold",
              fontSize: 18,
              color: "#fff",
              overflow: "hidden",
              flexShrink: 0,
            }}
          >
            {mainPost.avatar_url ? (
              <img src={mainPost.avatar_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt={mainPost.user_name} />
            ) : (
              mainPost.user_name[0]?.toUpperCase()
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontWeight: "bold", fontSize: "16px", color: "#fff" }}>
              {mainPost.display_name}
            </span>
            <span style={{ fontSize: "14px", color: "#888" }}>@{mainPost.user_name}</span>
          </div>
        </div>

        {mainPost.reply_to_user && (
          <div style={{ color: "#888", fontSize: "14px", marginBottom: "8px" }}>
            返信先: <span style={{ color: "#1d9bf0" }}>@{mainPost.reply_to_user}</span> さん
          </div>
        )}

        <p style={{
          margin: "0 0 12px",
          fontSize: "18px",
          lineHeight: "1.5",
          wordBreak: "break-word",
          whiteSpace: "pre-wrap",
        }}>
          <LinkedText
            text={mainPost.content}
            onLinkClick={(url) => setTargetUrl(url)}
            query=""
          />
        </p>

        <div style={{ color: "#888", fontSize: "14px", marginBottom: "12px" }}>
          {formatDate(mainPost.created_at)}
        </div>

        {/* アクションバー */}
        <div style={{ borderTop: "1px solid #222", paddingTop: "12px", display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
          {/* いいねボタン */}
          <button
            onClick={() => handleLike(mainPost)}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: mainPost.liked ? "#f91880" : "#888",
              fontSize: "14px", display: "flex", alignItems: "center", gap: "6px",
              padding: "4px 8px", borderRadius: "20px"
            }}
          >
            <img src={mainPost.liked ? "/heart-filled.svg" : "/heart.svg"} alt="like" style={{ width: "18px", height: "18px" }} />
            <span>{mainPost.likes}</span>
          </button>

          {/* 返信ボタン */}
          <button
            onClick={() => setReplyingTo(mainPost)}
            style={{
              background: "none", border: "none", color: "#888",
              cursor: "pointer", fontSize: "14px", display: "flex",
              alignItems: "center", gap: "6px", padding: "4px 8px", borderRadius: "20px"
            }}
          >
            <img src="/comment.svg" alt="comment" style={{ width: "18px", height: "18px" }} />
            <span>{mainPost.reply_count}</span>
          </button>

          {/* ブックマークボタン */}
          <button
            onClick={() => handleBookmark(mainPost)}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: mainPost.bookmarked ? "#1d9bf0" : "#888",
              fontSize: "14px", display: "flex", alignItems: "center", gap: "6px",
              padding: "4px 8px", borderRadius: "20px"
            }}
          >
            <img
              src={mainPost.bookmarked ? "/bookmark-filled.svg" : "/bookmark.svg"}
              alt="bookmark"
              style={{ width: "16px", height: "16px" }}
            />
            <span>{mainPost.bookmarks_count ?? 0}</span>
          </button>

          {/* 閲覧数表示 */}
          <div
            style={{
              color: "#888",
              fontSize: "14px", display: "flex", alignItems: "center", gap: "6px",
              padding: "4px 8px"
            }}
          >
            <img src="/view.svg" alt="views" style={{ width: "18px", height: "18px" }} />
            <span>{viewsCount}回表示</span>
          </div>

          {/* リアクション一覧 */}
          {mainPost.reactions?.map((r: any) => (
            <button
              key={r.emoji}
              onClick={() => handleToggleReaction(mainPost, r.emoji)}
              style={{
                background: r.hasReacted ? "rgba(29, 155, 240, 0.15)" : "#181818",
                border: r.hasReacted ? "1px solid #1d9bf0" : "1px solid #333",
                color: r.hasReacted ? "#1d9bf0" : "#ccc",
                borderRadius: "12px",
                padding: "3px 9px",
                fontSize: "12px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                fontWeight: r.hasReacted ? "bold" : "normal",
              }}
            >
              <span>{r.emoji}</span>
              <span>{r.count}</span>
            </button>
          ))}

          {/* リアクション追加ボタン */}
          <button
            onClick={() => setReactionTargetPost(mainPost)}
            style={{
              background: "none",
              border: "1px dashed #444",
              borderRadius: "12px",
              color: "#888",
              padding: "3px 8px",
              cursor: "pointer",
              fontSize: "12px",
            }}
          >
            + リアクション
          </button>

          {/* 削除ボタン */}
          {mainPost.user_name === currentUser?.user_name && (
            <button
              onClick={() => handleDelete(mainPost.id, true)}
              style={{
                marginLeft: "auto", background: "none", border: "none", cursor: "pointer",
                color: "#555", padding: "2px 6px", borderRadius: "4px", fontSize: "13px"
              }}
            >
              削除
            </button>
          )}
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
            <PostItem
              key={reply.id}
              post={reply}
              currentUser={currentUser}
              onLike={handleLike}
              onReply={(p) => setReplyingTo(p)}
              onBookmark={handleBookmark}
              onDelete={(id) => handleDelete(id, false)}
              onLinkClick={(url) => setTargetUrl(url)}
              onToggleReaction={handleToggleReaction}
              onReactionClick={(p) => setReactionTargetPost(p)}
            />
          ))
        )}
      </div>

      <style jsx global>{`
        .mobile-only {
          display: none !important;
        }
        .pc-only {
          display: block !important;
        }

        @media (max-width: 1200px) {
          .mobile-only {
            display: flex !important;
          }
          .pc-only {
            display: none !important;
          }
        }
      `}</style>

      {/* モーダル群 */}
      <Reply
        targetPost={replyingTo}
        onClose={() => setReplyingTo(null)}
        onSuccess={fetchPostAndReplies}
      />
      {reactionTargetPost && (
        <ReactionModal
          targetPost={reactionTargetPost}
          onClose={() => setReactionTargetPost(null)}
          onSuccess={() => fetchPostAndReplies()}
        />
      )}
    </Layout>
  )
}