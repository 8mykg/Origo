"use client"

import { useEffect, useState, use } from "react"
import { supabase } from "../../lib/supabase" // パスは環境に合わせて調整してください（例: "../lib/supabase" や "@/app/lib/supabase" など）
import Link from "next/link"
import Layout, { PostItem, Reply, ReactionModal, Post, User } from "../../components/Layout"

interface Room {
  id: string
  name: string
  description: string
  created_at: string
  created_by: string
  show_in_tl: boolean // ★ 追加
  creator?: User | null
}

export default function RoomDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const roomId = resolvedParams.id
  const [room, setRoom] = useState<Room | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [input, setInput] = useState("")
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [content, setContent] = useState("")
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [replyingTo, setReplyingTo] = useState<any | null>(null)
  const [reactionTargetPost, setReactionTargetPost] = useState<any | null>(null)
  // 編集モード用の状態
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editShowInTl, setEditShowInTl] = useState(false)

  // 部屋情報取得時に編集用の初期値もセット
  const fetchRoomInfo = async () => {
    const { data: roomData } = await supabase
      .from("rooms")
      .select("*")
      .eq("id", roomId)
      .single()

    if (roomData) {
      const { data: creatorData } = await supabase
        .from("users")
        .select("*")
        .eq("id", roomData.created_by)
        .single()

      const fullRoom = { ...roomData, creator: creatorData }
      setRoom(fullRoom)
      setEditName(roomData.name)
      setEditDescription(roomData.description || "")
      setEditShowInTl(roomData.show_in_tl || false)
    }
  }

  // 初期化：ログインユーザー & 部屋情報取得
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        window.location.href = "/auth"
        return
      }

      // 1. カレントユーザー取得
      const { data: userData } = await supabase
        .from("users")
        .select("*")
        .eq("id", session.user.id)
        .single()

      if (userData) setCurrentUser(userData)

      // 2. 部屋情報 & 作成者データ取得
      const { data: roomData } = await supabase
        .from("rooms")
        .select("*")
        .eq("id", roomId)
        .single()

      if (roomData) {
        const { data: creatorData } = await supabase
          .from("users")
          .select("*")
          .eq("id", roomData.created_by)
          .single()

        setRoom({ ...roomData, creator: creatorData })
      }

      setLoading(false)
    }

    init()
  }, [roomId])

  // currentUser がセットされたら投稿を取得
  useEffect(() => {
    if (currentUser) {
      fetchRoomPosts()
    }
  }, [currentUser, roomId])

  // 部屋の投稿を取得する関数（TLと同様の結合処理）
  const fetchRoomPosts = async () => {
    const { data: postsData } = await supabase
      .from("posts")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: false })

    const { data: likesData } = await supabase.from("likes").select("*")
    const { data: usersData } = await supabase.from("users").select("*")
    const { data: bookmarksData } = await supabase.from("bookmarks").select("*")

    if (postsData) {
      const merged = postsData.map((post) => {
        const postUser = usersData?.find((u) => u.user_name === post.user_name)
        return {
          ...post,
          display_name: postUser?.display_name || post.user_name,
          avatar_url: postUser?.avatar_url || null,
          likes: likesData?.filter((l) => l.post_id === post.id).length || 0,
          liked: likesData?.some((l) => l.post_id === post.id && l.user_name === currentUser?.user_name),
          bookmarked: bookmarksData?.some((b) => b.post_id === post.id && b.user_name === currentUser?.user_name),
        }
      })
      setPosts(merged)
    }
  }

  const handlePost = async () => {
    const textContent = input.trim() || content.trim()
    if ((!textContent && !imageFile) || !currentUser || uploading || submitting) return

    setSubmitting(true)
    setUploading(true)
    let imageUrl = null

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
        setSubmitting(false)
        return
      }

      const { data: publicUrlData } = supabase.storage
        .from("post-images")
        .getPublicUrl(fileName)

      imageUrl = publicUrlData.publicUrl
    }

    // 2. 部屋の投稿として DB に保存 (room_id を指定)
    const { error: postError } = await supabase.from("posts").insert({
      user_name: currentUser.user_name,
      content: textContent,
      image_url: imageUrl,
      room_id: roomId, // ★ 確実に部屋IDを紐付け！
    })

    setUploading(false)
    setSubmitting(false)

    if (postError) {
      alert("投稿に失敗しました: " + postError.message)
    } else {
      setInput("")
      setContent("")
      setImageFile(null)
      fetchRoomPosts() // 部屋の最新投稿を再取得
    }
  }

  // いいね機能（TLと同じロジック）
  const handleLike = async (post: Post) => {
    if (!currentUser) return
    if (post.liked) {
      await supabase.from("likes").delete().eq("post_id", post.id).eq("user_name", currentUser.user_name)
    } else {
      await supabase.from("likes").insert({ post_id: post.id, user_name: currentUser.user_name })
    }
    fetchRoomPosts()
  }

  // ブックマーク機能（TLと同じロジック）
  const handleBookmark = async (post: Post) => {
    if (!currentUser) return
    if (post.bookmarked) {
      await supabase.from("bookmarks").delete().eq("post_id", post.id).eq("user_name", currentUser.user_name)
    } else {
      await supabase.from("bookmarks").insert({ post_id: post.id, user_name: currentUser.user_name })
    }
    fetchRoomPosts()
  }

  const handleToggleReaction = async (post: Post, emoji: string) => {
    if (!currentUser) return

    // 既に自分が同じ絵文字を押しているかチェック
    const existing = post.reactions?.find((r) => r.emoji === emoji && r.hasReacted)

    if (existing) {
      // 削除（トグル解除）
      await supabase
        .from("reactions")
        .delete()
        .eq("post_id", post.id)
        .eq("user_name", currentUser.user_name)
        .eq("emoji", emoji)
    } else {
      // 追加
      await supabase.from("reactions").insert({
        post_id: post.id,
        user_name: currentUser.user_name,
        emoji: emoji.trim().slice(0, 10), // 最大10文字制限（短文対応）
      })
    }

    // 最新データを再取得して表示を更新
    fetchRoomPosts()
  }

  // 削除機能（TLと同じロジック）
  const handleDelete = async (postId: string) => {
    await supabase.from("likes").delete().eq("post_id", postId)
    const { error } = await supabase.from("posts").delete().eq("id", postId)

    if (error) {
      console.error("削除失敗:", error.message)
      alert("削除できませんでした: " + error.message)
      return
    }
    fetchRoomPosts()
  }

  // アバターアイコン表示
  const Avatar = ({ url, name, size = 36 }: { url?: string | null, name: string, size?: number }) => (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: url ? "transparent" : "#1d9bf0",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: "bold", fontSize: size * 0.4, color: "#fff",
      overflow: "hidden", flexShrink: 0
    }}>
      {url
        ? <img src={url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        : (name ? name[0]?.toUpperCase() : "U")
      }
    </div>
  )

  // 1. 編集モードを開始する関数（現在の room 情報を初期値としてセット）
  const handleStartEdit = () => {
    if (room) {
      setEditName(room.name || "")
      setEditDescription(room.description || "")
      setEditShowInTl(room.show_in_tl || false)
      setIsEditing(true)
    }
  }

  // 2. 部屋情報の更新（シンプル版）
  const handleUpdateRoom = async () => {
    if (!editName.trim() || !room) return

    const { error } = await supabase
      .from("rooms")
      .update({
        name: editName,
        description: editDescription,
        show_in_tl: editShowInTl,
      })
      .eq("id", roomId)

    if (error) {
      alert("部屋の更新に失敗しました: " + error.message)
    } else {
      setIsEditing(false)
      fetchRoomInfo() // 最新データを再取得
    }
  }

  // 部屋の削除
  const handleDeleteRoom = async () => {
    if (!confirm("本当にこの部屋を削除しますか？部屋内の投稿も削除されます。")) return

    // 1. 部屋内の投稿を削除（関連データがある場合）
    await supabase.from("posts").delete().eq("room_id", roomId)

    // 2. 部屋自体を削除
    const { error } = await supabase.from("rooms").delete().eq("id", roomId)

    if (error) {
      alert("削除に失敗しました: " + error.message)
    } else {
      alert("部屋を削除しました")
      window.location.href = "/rooms" // 一覧に戻る
    }
  }

  // 自分が部屋の作成者（オーナー）かどうか判断
  const isOwner = currentUser && room && currentUser.id === room.created_by

  if (loading) return (
    <Layout Tab="rooms">
      <div style={{ padding: "20px", color: "#888", textAlign: "center" }}>部屋を読み込み中...</div>
    </Layout>
  )

  return (
    <Layout Tab="rooms">
      <div style={{ width: "100%", color: "#fff", boxSizing: "border-box" }}>

        {/* 1. ヘッダー（線は端から端まで、中身は余白あり） */}
        <div style={{
          position: "sticky", top: 0,
          background: "rgba(0,0,0,0.8)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid #333",
          padding: "12px 16px",
          zIndex: 10,
          display: "flex", alignItems: "center", gap: "16px"
        }}>
          <button
            onClick={() => window.location.href = "/rooms"}
            style={{ background: "none", border: "none", color: "#fff", fontSize: "20px", cursor: "pointer", padding: 0 }}>
            ←
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: "18px" }}>コミュ部屋一覧</h1>
            <p style={{ margin: 0, fontSize: "12px", color: "#888" }}>{posts.length}件の投稿</p>
          </div>
          {/* 部屋主だけに表示する「設定・削除」ボタン */}
          {isOwner && !isEditing && (
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={handleStartEdit}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  background: "#333",
                  color: "#fff",
                  border: "none",
                  padding: "6px 15px",
                  borderRadius: "16px",
                  fontSize: "12px",
                  cursor: "pointer"
                }}
              >
                編集
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </button>
              <button
                onClick={handleDeleteRoom}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  background: "#400",
                  color: "#faa",
                  border: "1px solid #600",
                  padding: "6px 15px",
                  borderRadius: "16px",
                  fontSize: "12px",
                  cursor: "pointer"
                }}
              >
                削除
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#f44"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  <path d="M10 11v6M14 11v6" />
                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                </svg>
              </button>
            </div>
          )}
        </div>
        {/* 部屋情報 ＆ 編集フォーム */}
        {room && (
          <div style={{ borderBottom: "1px solid #333", padding: "16px", boxSizing: "border-box" }}>
            {isEditing ? (
              /* 編集モード時の画面 */
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", backgroundColor: "#111", padding: "16px", borderRadius: "12px", border: "1px solid #333" }}>
                <h3 style={{ margin: 0, fontSize: "16px" }}>部屋の設定変更</h3>
                <div>
                  <label style={{ fontSize: "12px", color: "#888" }}>部屋名</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #333", background: "#000", color: "#fff", marginTop: "4px" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "12px", color: "#888" }}>説明文</label>
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={2}
                    style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #333", background: "#000", color: "#fff", marginTop: "4px" }}
                  />
                </div>

                {/* ★ TL表示トグル設定 */}
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "14px", marginTop: "4px" }}>
                  <input
                    type="checkbox"
                    checked={editShowInTl}
                    onChange={(e) => setEditShowInTl(e.target.checked)}
                  />
                  <span>この部屋の投稿を全体のTLにも表示する</span>
                </label>

                <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "8px" }}>
                  <button onClick={() => setIsEditing(false)} style={{ padding: "6px 16px", borderRadius: "16px", border: "none", background: "#333", color: "#fff", cursor: "pointer" }}>
                    キャンセル
                  </button>
                  <button onClick={handleUpdateRoom} style={{ padding: "6px 16px", borderRadius: "16px", border: "none", background: "#1d9bf0", color: "#fff", fontWeight: "bold", cursor: "pointer" }}>
                    保存
                  </button>
                </div>
              </div>
            ) : (
              /* 通常表示画面 */
              <>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <h1 style={{ fontSize: "22px", margin: "0 0 6px 0" }}>{room.name}</h1>
                  {room.show_in_tl && (
                    <span style={{ fontSize: "11px", background: "#1d9bf022", color: "#1d9bf0", border: "1px solid #1d9bf0", padding: "2px 8px", borderRadius: "10px" }}>
                      TL同期中
                    </span>
                  )}
                </div>
                <p style={{ color: "#aaa", fontSize: "14px", margin: "0 0 12px 0", lineHeight: "1.4" }}>
                  {room.description || "説明はありません"}
                </p>

                {/* 作成者情報 */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", backgroundColor: "#161616", padding: "6px 12px", borderRadius: "20px", width: "fit-content", border: "1px solid #262626" }}>
                  <span style={{ fontSize: "12px", color: "#888" }}>作成者:</span>
                  <Avatar url={room.creator?.avatar_url} name={room.creator?.display_name || room.creator?.user_name || "Unknown"} size={22} />
                  <span style={{ fontSize: "13px", fontWeight: "bold" }}>{room.creator?.display_name || room.creator?.user_name || "不明なユーザー"}</span>
                  {room.creator?.user_name && (
                    <Link
                      href={`/profile/${room.creator.user_name}`}
                      style={{ fontSize: "12px", color: "#888", textDecoration: "none", transition: "color 0.2s" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "#1d9bf0")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "#888")}
                    >
                      @{room.creator.user_name}
                    </Link>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* 3. 投稿フォーム（線は端から端まで、中身は余白あり） */}
        <div style={{ borderBottom: "1px solid #333", padding: "16px", boxSizing: "border-box" }}>
          <div style={{ display: "flex", gap: "12px" }}>
            <Avatar url={currentUser?.avatar_url} name={currentUser?.user_name || ""} size={44} />
            <div style={{ flex: 1 }}>
              <textarea
                placeholder={`${room ? room.name : "この部屋"}で発言する...`}
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
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #222", paddingTop: "12px", marginTop: "8px" }}>
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
                    {submitting ? "送信中..." : "投稿"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4. タイムライン（投稿一覧） */}
        <div>
          {posts.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#666" }}>
              まだこの部屋に投稿はありません。最初のメッセージを送ってみましょう！
            </div>
          ) : (
            posts.map((post) => (
              <PostItem
                key={post.id}
                post={post}
                currentUser={currentUser}
                onLike={handleLike}
                onReply={(p) => { setReplyingTo(p) }}
                onBookmark={handleBookmark}
                onDelete={handleDelete}
                onLinkClick={() => { }}
                onToggleReaction={handleToggleReaction}
                onReactionClick={setReactionTargetPost}
              />
            ))
          )}
          <Reply
            targetPost={replyingTo}
            onClose={() => setReplyingTo(null)}
            onSuccess={fetchRoomPosts} // 送信成功したら投稿一覧を再取得！
          />
          {reactionTargetPost && (
            <ReactionModal
              targetPost={reactionTargetPost}
              onClose={() => setReactionTargetPost(null)}
              onSuccess={() => fetchRoomPosts()} // 最新状態を再取得
            />
          )}
        </div>
        {/* 画面切り替え用のCSS記述 */}
        <style jsx global>{`
        /* デフォルト（PC画面） */
        .mobile-only {
          display: none !important;
        }
        .pc-only {
          display: block !important;
        }

        /* スマホ画面（1200px以下）の場合 */
        @media (max-width: 1200px) {
          .mobile-only {
            display: flex !important; /* または block */
          }
          .pc-only {
            display: none !important;
          }
        }
      `}</style>
      </div>
    </Layout>
  )
}