"use client"

import { useState, useEffect } from "react"
import { supabase } from "../lib/supabase"
import { PostSkeletonList } from "../components/CSSTransformation"
import Layout, { Reply, PostItem, Post, User } from "../components/Layout"

export default function BookmarksPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [replyingTo, setReplyingTo] = useState<Post | null>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const { data: userData } = await supabase.from("users").select("*").eq("id", session.user.id).single()
        if (userData) {
          setCurrentUser(userData)
          fetchBookmarks(userData.user_name)
        }
      }
      setLoading(false)
    }
    init()
  }, [])

  const fetchBookmarks = async (userName: string) => {
    setLoading(true)
    // 自分のブックマーク一覧を取得
    const { data: bookmarkData } = await supabase
      .from("bookmarks")
      .select("post_id")
      .eq("user_name", userName)

    if (bookmarkData && bookmarkData.length > 0) {
      const postIds = bookmarkData.map((b) => b.post_id)

      // ブックマークしたポストだけを取得
      const { data: postsData } = await supabase
        .from("posts")
        .select("*")
        .in("id", postIds)
        .order("created_at", { ascending: false })

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
            liked: likesData?.some((l) => l.post_id === post.id && l.user_name === userName),
            bookmarked: true, // このページにあるのは全部ブックマーク済み
          }
        })
        setPosts(merged)
      }
    } else {
      setPosts([])
    }
    setLoading(false)
  }

  const handleLike = async (post: Post) => {
    if (!currentUser) return
    if (post.liked) {
      await supabase.from("likes").delete().eq("post_id", post.id).eq("user_name", currentUser.user_name)
    } else {
      await supabase.from("likes").insert({ post_id: post.id, user_name: currentUser.user_name })
    }
    fetchBookmarks(currentUser.user_name)
  }

  const handleBookmark = async (post: Post) => {
    if (!currentUser) return
    await supabase.from("bookmarks").delete().eq("post_id", post.id).eq("user_name", currentUser.user_name)
    fetchBookmarks(currentUser.user_name)
  }

  return (
    <Layout Tab="bookmarks">
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #333" }}>
        <h1 style={{ fontSize: "20px", fontWeight: "bold", margin: 0, color: "#fff" }}>
          ブックマーク
        </h1>
      </div>

      {loading ? (
          <PostSkeletonList />
      ) : posts.length === 0 ? (
        <div style={{ padding: "60px 20px", color: "#888", textAlign: "center" }}>
          <p style={{ fontSize: "16px", color: "#fff", fontWeight: "bold" }}>まだブックマークがありません</p>
          <p style={{ fontSize: "14px" }}>気になるポストのアイコンを押して保存しよう！</p>
        </div>
      ) : (
        posts.map((post) => (
          <PostItem
            key={post.id}
            post={post}
            currentUser={currentUser}
            onLike={handleLike}
            onReply={setReplyingTo}
            onBookmark={handleBookmark}
          />
        ))
      )}

      <Reply targetPost={replyingTo} onClose={() => setReplyingTo(null)} onSuccess={() => currentUser && fetchBookmarks(currentUser.user_name)} />
    </Layout>
  )
}