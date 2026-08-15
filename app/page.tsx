"use client"
export const dynamic = "force-dynamic"
import { useState, useEffect } from "react"
import { supabase } from "./lib/supabase"
import { useRouter } from "next/navigation"
import { FullScreenLoading } from "./components/CSSTransformation"
import { sendDeviceNotification } from "./lib/notification"
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
  const [content, setContent] = useState("")
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

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
        setCurrentUser({
          id: session.user.id, user_name: userName, display_name: userName,
          bio: null, created_at: "1970-01-01T00:00:00.000Z", role: "user"
        })
      } else {
        setCurrentUser(userData)
      }
      setLoading(false)
    }
    init()
  }, [])

  useEffect(() => { if (currentUser) fetchPosts() }, [currentUser])

  const fetchPosts = async () => {
    // 1. まず「TL同期フラグ(show_in_tl = true)」がオンになっている部屋のID一覧を取得
    const { data: allowedRooms } = await supabase
      .from("rooms")
      .select("id")
      .eq("show_in_tl", true)

    const allowedRoomIds = allowedRooms?.map((r: { id: string }) => r.id) || []

    // 2. 「通常のTL投稿 (room_id が null)」を取得
    const { data: normalPosts } = await supabase
      .from("posts")
      .select("*")
      .is("room_id", null)

    // 3. 「TL同期が許可された部屋の投稿」を取得
    let roomPosts: any[] = []
    if (allowedRoomIds.length > 0) {
      const { data: fetchedRoomPosts } = await supabase
        .from("posts")
        .select("*")
        .in("room_id", allowedRoomIds) // 許可された部屋のIDのみ指定

      if (fetchedRoomPosts) {
        roomPosts = fetchedRoomPosts
      }
    }

    // 4. 両方の投稿を合体させて、作成日時（created_at）の新しい順に並び替え
    const allPosts = [...(normalPosts || []), ...roomPosts].sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

    // 5. イイネやユーザー情報の紐付け処理（既存の処理）
    const { data: likesData } = await supabase.from("likes").select("*")
    const { data: usersData } = await supabase.from("users").select("*")
    const { data: bookmarksData } = await supabase.from("bookmarks").select("*")

    const merged = allPosts.map((post) => {
      const postUser = usersData?.find((u) => u.user_name === post.user_name)
      return {
        ...post,
        display_name: postUser?.display_name || post.user_name,
        avatar_url: postUser?.avatar_url || null,
        likes: likesData?.filter((l) => l.post_id === post.id).length || 0,
        liked: likesData?.some((l) => l.post_id === post.id && l.user_name === currentUser?.user_name),
        bookmarked: bookmarksData?.some((b) => b.post_id === post.id && b.user_name === currentUser?.user_name),
        bookmarks_count: bookmarksData?.filter((b) => b.post_id === post.id).length || 0 // ★ ここを追加！
      }
    })

    setPosts(merged)
  }

  const handlePost = async () => {
    const textContent = input.trim() || content.trim()
    // 文字も画像も両方空っぽの場合、またはユーザー情報がない場合は中断
    if ((!textContent && !imageFile) || !currentUser || uploading) return
    if (!content.trim() && !imageFile) return

    setUploading(true)
    let imageUrl = null
    // 1. 画像が選択されていれば Supabase Storage にアップロード
    // 1. 画像があれば Supabase Storage にアップロード
    if (imageFile) {
      const fileExt = imageFile.name.split(".").pop()
      const fileName = `${Date.now()}_${Math.random()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from("post-images")
        .upload(fileName, imageFile)

      if (uploadError) {
        alert("画像のアップロードに失敗しました: " + uploadError.message)
        setUploading(false)
        return
      }

      const { data: publicUrlData } = supabase.storage
        .from("post-images")
        .getPublicUrl(fileName)

      imageUrl = publicUrlData.publicUrl
    }

    // 2. 投稿データを1回だけ DB に保存
    const { error: postError } = await supabase.from("posts").insert({
      user_name: currentUser.user_name,
      content: textContent,
      image_url: imageUrl,
      room_id: null, // 通常のTL投稿
    })

    setUploading(false)

    if (postError) {
      alert("投稿に失敗しました: " + postError.message)
    } else {
      setInput("")
      setContent("")
      setImageFile(null)
      fetchPosts() // 最新一覧を再取得
    }
  }

  const handleLike = async (post: Post) => {
    if (!currentUser) return
    if (post.liked) {
      await supabase.from("likes").delete().eq("post_id", post.id).eq("user_name", currentUser.user_name)
    } else {
      await supabase.from("likes").insert({ post_id: post.id, user_name: currentUser.user_name })
    }
    if (post.user_name !== currentUser.user_name) {
      // ① DBに通知保存
      await supabase.from("notifications").insert({
        user_name: post.user_name,
        actor_name: currentUser.user_name,
        type: "like",
        post_id: post.id,
      })

      // ② 実デバイス通知を飛ばす（相手の端末で許可されていれば届きます）
      sendDeviceNotification("新しいいいね！", {
        body: `@${currentUser.user_name} さんがあなたのポストに「いいね」しました`,
      })
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
    <Layout
      Tab="home"
    >
      <FullScreenLoading />
    </Layout>
  )

  return (
    <Layout
      Tab="home"
    >
      < div style={{ padding: "0px" }}>
        {<div style={{ borderBottom: "2px solid #333", padding: "16px 20px", display: "flex", gap: "12px" }}>
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
              <span style={{
                color: (300 - input.length) <= -1 ? "rgb(126, 0, 0)"
                  : (300 - input.length) <= 0 ? "#f00"
                    : (300 - input.length) <= 50 ? "#f1c40f"
                      : (300 - input.length) <= 100 ? "#2ecc71"
                        : (300 - input.length) <= 200 ? "#2ec1cc"
                          : "#888",
                fontSize: "14px"
              }}>
                {300 - input.length}
              </span>
              {/* 選択した画像のプレビュー表示 */}
              {imageFile && (
                <div style={{ position: "relative", marginBottom: "10px" }}>
                  <img
                    src={URL.createObjectURL(imageFile)}
                    alt="Preview"
                    style={{ maxHeight: "200px", borderRadius: "12px", objectFit: "cover" }}
                  />
                  <button
                    onClick={() => setImageFile(null)}
                    style={{ position: "absolute", top: "5px", left: "5px", background: "rgba(0,0,0,0.7)", color: "#fff", border: "none", borderRadius: "30%", cursor: "pointer" }}
                  >
                    ✕
                  </button>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "16px", marginTop: "10px" }}>
                {/* 画像選択ボタン */}
                <label style={{ cursor: "pointer", fontSize: "20px" }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {/* カメラのボディ */}
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    {/* レンズ */}
                    <circle cx="12" cy="13" r="4" />
                    {/* フラッシュ部分の点 */}
                    <line x1="19" y1="9" x2="19.01" y2="9" />
                  </svg>
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0]
                        const maxSize = 30 * 1024 * 1024 // 30MB (バイト単位: 30メガバイト)

                        // ファイルサイズチェック
                        if (file.size > maxSize) {
                          alert("ンアー！(≧Д≦)ファイルサイズがデカすぎます！30MB以下の画像を選択してください！")
                          e.target.value = "" // 選択をリセット
                          return
                        }

                        setImageFile(file)
                      }
                    }}
                  />
                </label>
                <button
                  onClick={handlePost}
                  disabled={(!input.trim() && !content.trim() && !imageFile) || uploading}
                  style={{
                    // 画像が選ばれているか文字があれば明るい青、なければ薄い灰色にする例
                    background: (input.trim() || content.trim() || imageFile) ? "#1d9bf0" : "#1d9bf088",
                    color: "#fff",
                    border: "none",
                    padding: "8px 16px",
                    borderRadius: "20px",
                    fontWeight: "bold",
                    cursor: (input.trim() || content.trim() || imageFile) ? "pointer" : "not-allowed"
                  }}
                >
                  {uploading ? "送信中..." : "ポスト"}
                </button>
              </div>
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