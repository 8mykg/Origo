"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { supabase } from "../lib/supabase"
import Layout, { Reply, PostItem, Post, User } from "../components/Layout"

// ★ 検索キーワードを太字（ハイライト）にするコンポーネント
const HighlightedText = ({ text, query }: { text: string; query: string }) => {
  if (!query) return <span>{text}</span>

  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const parts = text.split(new RegExp(`(${escapedQuery})`, "gi"))

  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <strong key={i} style={{ color: "#1d9bf0", fontWeight: "bold" }}>
            {part}
          </strong>
        ) : (
          part
        )
      )}
    </span>
  )
}

function SearchContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const query = searchParams.get("q") || ""
  const [targetUrl, setTargetUrl] = useState<string | null>(null)
  const [inputQuery, setInputQuery] = useState(query) // ★ 中央の入力バー用
  const [posts, setPosts] = useState<Post[]>([])
  const [matchedUsers, setMatchedUsers] = useState<User[]>([])
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [replyingTo, setReplyingTo] = useState<Post | null>(null)

  // URLのクエリが変わったら入力欄も更新
  useEffect(() => {
    setInputQuery(query)
  }, [query])

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const { data: userData } = await supabase.from("users").select("*").eq("id", session.user.id).single()
        if (userData) setCurrentUser(userData)
      }
    }
    init()
  }, [])

  useEffect(() => {
    if (query) {
      fetchSearchResults()
    } else {
      setPosts([])
      setMatchedUsers([])
      setLoading(false)
    }
  }, [query, currentUser])

  const fetchSearchResults = async () => {
    setLoading(true)

    const cleanQuery = query.startsWith("@") ? query.slice(1) : query
    const { data: usersData } = await supabase
      .from("users")
      .select("*")
      .or(`user_name.ilike.%${cleanQuery}%,display_name.ilike.%${cleanQuery}%`)

    setMatchedUsers(usersData || [])

    const { data: postsData } = await supabase
      .from("posts")
      .select("*")
      .ilike("content", `%${query}%`)
      .order("created_at", { ascending: false })

    const { data: likesData } = await supabase.from("likes").select("*")
    const { data: allUsersData } = await supabase.from("users").select("*")
    const { data: allPostsData } = await supabase.from("posts").select("*")
    const { data: bookmarksData } = await supabase.from("bookmarks").select("*")

    if (postsData) {
      const merged = postsData.map((post) => {
        const postUser = allUsersData?.find((u) => u.user_name === post.user_name)
        let replyToUser = null
        if (post.reply_to) {
          const parentPost = allPostsData?.find((p) => p.id === post.reply_to)
          if (parentPost) replyToUser = parentPost.user_name
        }

        return {
          ...post,
          display_name: postUser?.display_name || post.user_name,
          avatar_url: postUser?.avatar_url || null,
          likes: likesData?.filter((l) => l.post_id === post.id).length || 0,
          liked: likesData?.some((l) => l.post_id === post.id && l.user_name === currentUser?.user_name),
          bookmarked: bookmarksData?.some((b) => b.post_id === post.id && b.user_name === currentUser?.user_name),
          reply_to_user: replyToUser,
        }
      })
      setPosts(merged)
    }
    setLoading(false)
  }

  // 中央バーでEnterキーを押した時の処理
  const handleSearchSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(inputQuery.trim())}`)
    }
  }

  const handleLike = async (post: Post) => {
    if (!currentUser) return
    if (post.liked) {
      await supabase.from("likes").delete().eq("post_id", post.id).eq("user_name", currentUser.user_name)
    } else {
      await supabase.from("likes").insert({ post_id: post.id, user_name: currentUser.user_name })
    }
    fetchSearchResults()
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
    fetchSearchResults()
  }

  const handleDelete = async (postId: string) => {

    await supabase.from("likes").delete().eq("post_id", postId)

    const { error } = await supabase.from("posts").delete().eq("id", postId)

    if (error) {
      console.error("削除失敗:", error.message)
      alert("削除できませんでした: " + error.message)
      return
    }

    fetchSearchResults()
  }

  return (
    <Layout Tab="search">
      {/* ヘッダー */}
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #333" }}>
        <h1 style={{ fontSize: "20px", fontWeight: "bold", margin: 0, color: "#fff" }}>
          {query ? (
            <>検索結果: <span style={{ color: "#1d9bf0" }}>{query}</span></>
          ) : (
            "検索"
          )}
        </h1>
      </div>

      {/* ★ 中央の検索入力バー（スマホ時や/search単体で飛んできた時に大活躍） */}
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #333" }}>
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", display: "flex", alignItems: "center" }}>
            <img
              src={"/search.svg"}
              alt="search"
              style={{ width: "16px", height: "16px" }}
            />
          </span>
          <input
            placeholder="キーワードや @ユーザー名 で検索"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            onKeyDown={handleSearchSubmit}
            style={{
              width: "100%",
              background: "#111",
              border: "1px solid #333",
              borderRadius: "24px",
              padding: "12px 12px 12px 44px",
              color: "#fff",
              fontSize: "15px",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>
      </div>

      {/* 検索ワードがまだ指定されていない場合（/search のみ） */}
      {!query ? (
        <div style={{ padding: "60px 20px", color: "#888", textAlign: "center" }}>
          <p style={{ fontSize: "16px", margin: "0 0 8px", color: "#fff", fontWeight: "bold" }}>キーワードを入力して検索</p>
          <p style={{ fontSize: "14px", margin: 0 }}>ポストのテキストやユーザー名、ハッシュタグを検索できます。</p>
        </div>
      ) : loading ? (
        <div style={{ padding: "20px", color: "#888", textAlign: "center" }}>検索中...</div>
      ) : (
        <>
          {/* 該当ユーザー表示 */}
          {matchedUsers.length > 0 && (
            <div style={{ borderBottom: "1px solid #333" }}>
              <div style={{ padding: "12px 20px 4px", fontSize: "14px", fontWeight: "bold", color: "#888" }}>
                アカウント
              </div>
              {matchedUsers.map((user) => (
                <div
                  key={user.id}
                  onClick={() => router.push(`/profile?user=${user.user_name}`)}
                  style={{
                    padding: "12px 20px",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    cursor: "pointer",
                    borderBottom: "1px solid #222",
                  }}
                >
                  <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: "#1d9bf0", overflow: "hidden", flexShrink: 0 }}>
                    {user.avatar_url && <img src={user.avatar_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: "bold", color: "#fff" }}>
                      <HighlightedText text={user.display_name} query={query.replace(/^@/, "")} />
                    </div>
                    <div style={{ color: "#888", fontSize: "13px" }}>
                      @<HighlightedText text={user.user_name} query={query.replace(/^@/, "")} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 該当ポスト表示 */}
          {posts.length === 0 && matchedUsers.length === 0 ? (
            <div style={{ padding: "40px 20px", color: "#888", textAlign: "center" }}>
              「{query}」に一致する結果は見つかりませんでした。
            </div>
          ) : (
            posts.map((post: Post) => (
              <PostItem
                key={post.id}
                post={post}
                currentUser={currentUser}
                onLike={handleLike}
                onReply={(p: Post) => setReplyingTo(p)}
                onBookmark={handleBookmark}
                onDelete={handleDelete}
                searchQuery={query}
              />
            ))
          )}
        </>
      )}

      <Reply targetPost={replyingTo} onClose={() => setReplyingTo(null)} onSuccess={fetchSearchResults} />
    </Layout>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div style={{ padding: "20px", color: "#888" }}>読み込み中...</div>}>
      <SearchContent />
    </Suspense>
  )
}