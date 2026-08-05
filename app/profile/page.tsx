"use client"
export const dynamic = "force-dynamic"
import { useState, useEffect } from "react"
import { supabase } from "../lib/supabase"
import AvatarUpload from "../components/AvatarUpload"
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

type User = {
  id: string
  user_name: string
  display_name: string
  bio: string
  created_at: string
  avatar_url?: string
}

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

export default function ProfilePage() {
  const isMobile = useIsMobile()
  const [activeTab, setActiveTab] = useState("profile")
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [editing, setEditing] = useState(false)
  const [displayName, setDisplayName] = useState("")
  const [userName, setUserName] = useState("")
  const [newUserName, setNewUserName] = useState("")
  const [bio, setBio] = useState("")
  const [followersCount, setFollowersCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [isFollowing, setIsFollowing] = useState(false)
  const [isOwnProfile, setIsOwnProfile] = useState(true)
  const [viewingUser, setViewingUser] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [replyingTo, setReplyingTo] = useState<Post | null>(null)
  const [replyInput, setReplyInput] = useState("")

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = "/auth"; return }

      const { data: myData } = await supabase
        .from("users").select("*").eq("id", session.user.id).single()

      if (!myData) { window.location.href = "/"; return }

      // URLパラメータで他人のプロフィールかチェック
      const params = new URLSearchParams(window.location.search)
      const targetUser = params.get("user")

      if (targetUser && targetUser !== myData.user_name) {
        // 他人のプロフィール
        setIsOwnProfile(false)
        setViewingUser(targetUser)

        const { data: targetData } = await supabase
          .from("users").select("*").eq("user_name", targetUser).single()

        if (targetData) {
          setUser(targetData)
          setUserName(targetData.user_name)
          setDisplayName(targetData.display_name || "")
          setBio(targetData.bio || "")
          setAvatarUrl(targetData.avatar_url || null)
        }

        // フォロー状態チェック
        const { data: followData } = await supabase
          .from("follows")
          .select("*")
          .eq("follower_name", myData.user_name)
          .eq("following_name", targetUser)
          .single()

        setIsFollowing(!!followData)
        fetchFollowCounts(targetUser)
        fetchPosts(targetUser)
      } else {
        // 自分のプロフィール
        setIsOwnProfile(true)
        setUser(myData)
        setUserName(myData.user_name)
        setNewUserName(myData.user_name)
        setDisplayName(myData.display_name || "")
        setBio(myData.bio || "")
        setAvatarUrl(myData.avatar_url || null)
        fetchFollowCounts(myData.user_name)
        fetchPosts(myData.user_name)
      }
      setLoading(false)
    }
    init()
  }, [])


  const fetchPosts = async (name: string) => {
    const { data: postsData } = await supabase
      .from("posts").select("*").eq("user_name", name)
      .order("created_at", { ascending: false })

    const { data: likesData } = await supabase.from("likes").select("*")

    if (postsData) {
      const merged = postsData.map((post) => ({
        ...post,
        likes: likesData?.filter((l) => l.post_id === post.id).length || 0,
        liked: likesData?.some((l) => l.post_id === post.id && l.user_name === name),
      }))
      setPosts(merged)
    }
  }

  const navItems = [
    {
      id: "home", icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ), label: "ホーム", action: () => window.location.href = "/"
    },
    {
      id: "notifications", icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      ), label: "通知", action: () => { }, soon: true
    },
    {
      id: "bookmarks", icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
      ), label: "ブックマーク", action: () => { }, soon: true
    },
    {
      id: "profile", icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ), label: "プロフィール", action: () => window.location.href = "/profile"
    },
    {
      id: "settings", icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      ), label: "設定", action: () => { }, soon: true
    },
  ]

  const fetchFollowCounts = async (name: string) => {
    const { data: followers } = await supabase
      .from("follows").select("*").eq("following_name", name)
    const { data: following } = await supabase
      .from("follows").select("*").eq("follower_name", name)

    setFollowersCount(followers?.length || 0)
    setFollowingCount(following?.length || 0)
  }

  const handleFollow = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const { data: myData } = await supabase
      .from("users").select("*").eq("id", session.user.id).single()

    if (isFollowing) {
      await supabase.from("follows").delete()
        .eq("follower_name", myData.user_name)
        .eq("following_name", userName)
      setIsFollowing(false)
      setFollowersCount((c) => c - 1)
    } else {
      await supabase.from("follows").insert({
        follower_name: myData.user_name,
        following_name: userName,
      })
      setIsFollowing(true)
      setFollowersCount((c) => c + 1)
    }
  }

  const handleSave = async () => {
    setError("")
    setSaving(true)

    // ユーザー名が変わった場合は重複チェック
    if (newUserName !== userName) {
      if (newUserName.length < 3) {
        setError("ユーザー名は3文字以上にしてください")
        setSaving(false)
        return
      }
      if (!/^[a-zA-Z0-9_]+$/.test(newUserName)) {
        setError("ユーザー名は英数字とアンダースコアのみ使えます")
        setSaving(false)
        return
      }

      const { data: existing } = await supabase
        .from("users")
        .select("*")
        .eq("user_name", newUserName)
        .single()

      if (existing) {
        setError("そのユーザー名はすでに使われています")
        setSaving(false)
        return
      }

      // 投稿・いいねのユーザー名も更新
      await supabase
        .from("posts")
        .update({ user_name: newUserName })
        .eq("user_name", userName)

      await supabase
        .from("likes")
        .update({ user_name: newUserName })
        .eq("user_name", userName)
    }

    // プロフィール更新
    await supabase
      .from("users")
      .update({
        user_name: newUserName,
        display_name: displayName,
        bio,
      })
      .eq("id", user?.id)

    setUserName(newUserName)
    setUser((prev) => prev ? {
      ...prev,
      user_name: newUserName,
      display_name: displayName,
      bio,
    } : null)
    fetchPosts(newUserName)
    setEditing(false)
    setSaving(false)
  }

  const handleLike = async (post: Post) => {
    if (post.liked) {
      await supabase.from("likes").delete()
        .eq("post_id", post.id).eq("user_name", userName)
    } else {
      await supabase.from("likes").insert({ post_id: post.id, user_name: userName })
    }
    fetchPosts(userName)
  }

  const handleReply = async () => {
    if (!replyInput.trim() || !userName || !replyingTo) return
    await supabase.from("posts").insert({
      user_name: userName,
      content: replyInput,
      reply_to: replyingTo.id,
    })

    // リプライ数を更新
    await supabase.from("posts")
      .update({ reply_count: (replyingTo.reply_count || 0) + 1 })
      .eq("id", replyingTo.id)

    setReplyInput("")
    setReplyingTo(null)
    fetchPosts(userName)
  }

  const handleDelete = async (postId: string) => {
    if (!confirm("この投稿を削除しますか？")) return
    await supabase.from("posts").delete().eq("id", postId)
    fetchPosts(userName)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = "/auth"
  }

  const formatDate = (str: string) => {
    const d = new Date(str)
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`
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

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh", background: "#000",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#fff", fontFamily: "sans-serif"
      }}>
        <p>読み込み中...</p>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: "100vh", background: "#000",
      fontFamily: "sans-serif", color: "#fff",
      display: "flex", justifyContent: "space-between"
    }}>

      {/* リプライモーダル */}
      {replyingTo && (
        <div style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.7)",
          zIndex: 1000, display: "flex",
          alignItems: "center", justifyContent: "center"
        }}>
          <div style={{
            background: "#111", border: "1px solid #333",
            borderRadius: "16px", padding: "24px",
            width: "500px", maxWidth: "90vw"
          }}>
            {/* 元の投稿 */}
            <div style={{ display: "flex", gap: "12px", marginBottom: "16px", opacity: 0.7 }}>
              <Avatar url={replyingTo.avatar_url} name={replyingTo.user_name} size={36} />
              <div>
                <span style={{ fontWeight: "bold", fontSize: "14px" }}>{replyingTo.display_name}</span>
                <span style={{ color: "#888", fontSize: "13px", marginLeft: "8px" }}>@{replyingTo.user_name}</span>
                <p style={{ margin: "4px 0 0", fontSize: "14px", color: "#ccc" }}>{replyingTo.content}</p>
              </div>
            </div>

            <div style={{ borderLeft: "2px solid #333", marginLeft: "18px", paddingLeft: "16px", marginBottom: "16px" }}>
              <span style={{ color: "#888", fontSize: "13px" }}>返信元:返信先|@{userName}:{replyingTo.user_name}</span>
            </div>

            {/* リプライ入力 */}
            <div style={{ display: "flex", gap: "12px" }}>
              <Avatar url={currentUser?.avatar_url} name={currentUser?.user_name || ""} size={36} />
              <textarea
                placeholder={`@${replyingTo.user_name}に返信`}
                value={replyInput}
                onChange={(e) => setReplyInput(e.target.value)}
                autoFocus
                style={{
                  flex: 1, background: "transparent",
                  border: "none", outline: "none",
                  fontSize: "16px", resize: "none",
                  color: "#fff", minHeight: "80px"
                }}
                rows={3}
              />
            </div>

            <div style={{
              display: "flex", justifyContent: "space-between",
              alignItems: "center", marginTop: "16px",
              borderTop: "1px solid #333", paddingTop: "12px"
            }}>
              <button
                onClick={() => { setReplyingTo(null); setReplyInput("") }}
                style={{
                  background: "none", border: "none",
                  color: "#888", cursor: "pointer", fontSize: "14px"
                }}>
                キャンセル
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
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
        </div>
      )}

      {/* 左サイドバー */}
      {!isMobile && <div style={{
        width: "280px", padding: "20px 12px",
        position: "sticky", top: 0, height: "100vh",
        display: "flex", flexDirection: "column",
        borderRight: "1px solid #333", flexShrink: 0
      }}>
        <div style={{ padding: "0px 0px", marginBottom: "12px" }}>
          <img src="/logo-compact.svg" alt="Origo" style={{ height: "60px", width: "auto" }} />
        </div>

        <nav style={{ flex: 1 }}>
          {[
            {
              icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              ), label: "ホーム", action: () => window.location.href = "/"
            },
            {
              icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
              ), label: "通知", action: () => { }, soon: true
            },
            {
              icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                </svg>
              ), label: "ブックマーク", action: () => { }, soon: true
            },
            {
              icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              ), label: "プロフィール", action: () => window.location.href = "/profile", active: true
            },
            {
              icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              ), label: "設定", action: () => { }, soon: true
            },
          ].map((item, i) => (
            <button
              key={i}
              onClick={item.action}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: "16px",
                background: item.active ? "#111" : "none",
                border: "none", borderRadius: "12px",
                padding: "12px 16px", cursor: "pointer",
                color: item.active ? "#fff" : "#aaa",
                fontSize: "16px", marginBottom: "4px", textAlign: "left"
              }}>
              {item.icon}
              <span style={{ fontWeight: item.active ? "bold" : "normal" }}>{item.label}</span>
              {item.soon && (
                <span style={{
                  marginLeft: "auto", fontSize: "10px",
                  background: "#1d9bf020", color: "#1d9bf0",
                  padding: "2px 8px", borderRadius: "10px",
                  border: "1px solid #1d9bf040"
                }}>開発中</span>
              )}
            </button>
          ))}

          <button
            onClick={() => window.location.href = "/"}
            style={{
              width: "100%", background: "#1d9bf0",
              border: "none", borderRadius: "24px",
              padding: "14px", color: "#fff",
              fontWeight: "bold", fontSize: "16px",
              cursor: "pointer", marginTop: "16px"
            }}>
            投稿する
          </button>
        </nav>

        {/* ユーザー情報 */}
        <div
          style={{
            display: "flex", alignItems: "center", gap: "12px",
            background: "none", border: "none", color: "#fff",
            borderRadius: "12px", padding: "12px",
            width: "100%", textAlign: "left"
          }}>
          <Avatar url={currentUser?.avatar_url} name={currentUser?.user_name || ""} size={40} />
          <div style={{ flex: 1, overflow: "hidden" }}>
            <p style={{ margin: 0, fontSize: "14px", fontWeight: "bold", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {currentUser?.display_name}
            </p>
            <p style={{ margin: 0, fontSize: "13px", color: "#888" }}>@{currentUser?.user_name}</p>
          </div>
          <button
            onClick={handleLogout}
            style={{
              background: "none", border: "none", color: "#888",
              cursor: "pointer", padding: "4px"
            }}>
            ↩
          </button>
        </div>
      </div>}

      {/* メインコンテンツ */}
      <div style={{ flex: 1, borderRight: isMobile ? "none" : "1px solid #333", borderLeft: isMobile ? "none" : "1px solid #333", paddingBottom: isMobile ? "80px" : "0" }}>
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
            onClick={() => window.location.href = "/"}
            style={{ background: "none", border: "none", color: "#fff", fontSize: "20px", cursor: "pointer" }}>
            ←
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: "18px" }}>{user?.display_name || userName}</h1>
            <p style={{ margin: 0, fontSize: "13px", color: "#888" }}>{posts.length}件の投稿</p>
          </div>
        </div>

        {/* プロフィールカード */}
        <div style={{ padding: "20px", borderBottom: "1px solid #333" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
            <AvatarUpload
              userId={user?.id || ""}
              currentAvatar={avatarUrl}
              userName={userName}
              onUploadComplete={(url) => setAvatarUrl(url)}
            />
            {isOwnProfile ? (
              !editing ? (
                <button
                  onClick={() => setEditing(true)}
                  style={{
                    background: "none", border: "1px solid #555",
                    color: "#fff", borderRadius: "20px",
                    padding: "8px 16px", cursor: "pointer", fontWeight: "bold"
                  }}>
                  編集
                </button>
              ) : (
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={() => {
                      setEditing(false)
                      setNewUserName(userName)
                      setDisplayName(user?.display_name || "")
                      setBio(user?.bio || "")
                      setError("")
                    }}
                    style={{
                      background: "none", border: "1px solid #555",
                      color: "#888", borderRadius: "20px",
                      padding: "8px 16px", cursor: "pointer", fontWeight: "bold"
                    }}>
                    キャンセル
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    style={{
                      background: saving ? "#555" : "#1d9bf0",
                      border: "none", color: "#fff", borderRadius: "20px",
                      padding: "8px 16px", cursor: saving ? "not-allowed" : "pointer", fontWeight: "bold"
                    }}>
                    {saving ? "保存中..." : "保存"}
                  </button>
                </div>
              )
            ) : (
              <button
                onClick={handleFollow}
                style={{
                  background: isFollowing ? "none" : "#fff",
                  border: isFollowing ? "1px solid #555" : "none",
                  color: isFollowing ? "#fff" : "#000",
                  borderRadius: "20px", padding: "8px 20px",
                  cursor: "pointer", fontWeight: "bold", fontSize: "15px"
                }}>
                {isFollowing ? "フォロー中" : "フォローする"}
              </button>
            )}
          </div>

          {editing ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ color: "#888", fontSize: "13px", marginBottom: "4px", display: "block" }}>表示名</label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  style={{
                    width: "100%", background: "#111",
                    border: "1px solid #444", borderRadius: "8px",
                    padding: "10px", color: "#fff", fontSize: "15px",
                    outline: "none", boxSizing: "border-box" as const
                  }}
                />
              </div>
              <div>
                <label style={{ color: "#888", fontSize: "13px", marginBottom: "4px", display: "block" }}>
                  ユーザー名（英数字・アンダースコアのみ）
                </label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#888" }}>@</span>
                  <input
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    style={{
                      width: "100%", background: "#111",
                      border: "1px solid #444", borderRadius: "8px",
                      padding: "10px 10px 10px 28px",
                      color: "#fff", fontSize: "15px",
                      outline: "none", boxSizing: "border-box" as const
                    }}
                  />
                </div>
              </div>
              <div>
                <label style={{ color: "#888", fontSize: "13px", marginBottom: "4px", display: "block" }}>自己紹介</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  style={{
                    width: "100%", background: "#111",
                    border: "1px solid #444", borderRadius: "8px",
                    padding: "10px", color: "#fff", fontSize: "15px",
                    outline: "none", resize: "none", boxSizing: "border-box" as const
                  }}
                />
              </div>
              {error && <p style={{ color: "#f44", fontSize: "14px", margin: 0 }}>{error}</p>}
            </div>
          ) : (
            <div>
              <p style={{ margin: "0 0 4px", fontWeight: "bold", fontSize: "18px" }}>
                {user?.display_name || userName}
              </p>
              <p style={{ margin: "0 0 8px", color: "#888", fontSize: "14px" }}>@{userName}</p>
              {user?.bio && <p style={{ margin: "0 0 12px", fontSize: "15px" }}>{user.bio}</p>}

              {/* フォロー数 */}
              <div style={{ display: "flex", gap: "20px", marginBottom: "12px" }}>
                <span style={{ fontSize: "14px" }}>
                  <strong>{followingCount}</strong>
                  <span style={{ color: "#888", marginLeft: "4px" }}>フォロー中</span>
                </span>
                <span style={{ fontSize: "14px" }}>
                  <strong>{followersCount}</strong>
                  <span style={{ color: "#888", marginLeft: "4px" }}>フォロワー</span>
                </span>
              </div>

              <p style={{ margin: 0, color: "#888", fontSize: "13px" }}>
                登録日: {user ? formatDate(user.created_at) : ""}
              </p>
            </div>
          )}
        </div>

        {/* 投稿一覧 */}
        {posts.map((post) => (
          <div key={post.id} style={{ borderBottom: "1px solid #333", padding: "16px 20px", display: "flex", gap: "12px" }}>
            <div style={{
              width: "44px", height: "44px", borderRadius: "50%",
              background: avatarUrl ? "transparent" : "#1d9bf0",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: "bold", fontSize: "18px", flexShrink: 0, overflow: "hidden"
            }}>
              {avatarUrl
                ? <img src={avatarUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : userName[0]?.toUpperCase()
              }
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "4px" }}>
                <strong>{user?.display_name || userName}</strong>
                <span style={{ color: "#888", fontSize: "13px" }}>@{userName}</span>
                <span style={{ color: "#888", fontSize: "13px" }}>{formatDate(post.created_at)}</span>
              </div>
              <p style={{ margin: "0 0 12px", fontSize: "15px", lineHeight: "1.5" }}>{post.content}</p>
              <div style={{ display: "flex", gap: "16px" }}>
                <button
                  onClick={() => handleLike(post)}
                  style={{
                    background: "none", border: "none",
                    cursor: "pointer",
                    color: post.liked ? "#f91880" : "#888",
                    fontSize: "14px", display: "flex",
                    alignItems: "center", gap: "6px",
                    padding: "4px 8px", borderRadius: "20px"
                  }}>
                  {post.liked ? "❤️" : "🤍"} {post.likes}
                </button>
                {/* リプライボタン */}
                <button
                  onClick={() => setReplyingTo(post)}
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
                  {post.reply_count || 0}
                </button>
                {/* 自分の投稿だけ削除ボタン表示 */}
                {post.user_name === currentUser?.user_name && (
                  <button
                    onClick={() => handleDelete(post.id)}
                    style={{
                      marginLeft: "auto", background: "none",
                      border: "none", cursor: "pointer",
                      color: "#555", padding: "2px 6px",
                      borderRadius: "4px", fontSize: "13px"
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = "#f44"}
                    onMouseLeave={(e) => e.currentTarget.style.color = "#555"}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6M14 11v6" />
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 右サイドバー */}
      {!isMobile && <div style={{
        width: "320px", padding: "20px 16px",
        position: "sticky", top: 0, height: "100vh",
        overflowY: "auto", flexShrink: 0
      }}>
        <div style={{ background: "#111", borderRadius: "16px", padding: "16px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: "bold", margin: "0 0 8px" }}>プロフィール</h2>
          <p style={{ color: "#888", fontSize: "14px", margin: 0 }}>
            編集ボタンから表示名・自己紹介・ユーザー名を変更できます
          </p>
        </div>
        <p style={{ color: "#888", fontSize: "12px", margin: "0px" }}>
          Copyright © 2026
          <a href="https://origo-ochre.vercel.app/profile?user=8mykg" style={{ color: "#4da6ff", textDecoration: "underline" }}>
            tumayouzi_Dev.
          </a>
          All rights reserved.
        </p>
      </div>}
      {/* 下部ナビ（スマホのみ） */}
      {isMobile && (
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          background: "rgba(0,0,0,0.9)",
          backdropFilter: "blur(12px)",
          borderTop: "1px solid #333",
          display: "flex", justifyContent: "space-around",
          padding: "12px 0", zIndex: 100
        }}>
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={item.action}
              style={{
                background: "none", border: "none",
                color: activeTab === item.id ? "#fff" : "#888",
                cursor: "pointer", padding: "8px",
                display: "flex", flexDirection: "column",
                alignItems: "center"
              }}>
              {item.icon}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}