"use client"

import { useState, useEffect, use } from "react"
import { supabase } from "../../lib/supabase"
import { useRouter } from "next/navigation"
import { FullScreenLoading } from "../../components/CSSTransformation"
import { sendDeviceNotification } from "../../lib/notification"
import Layout, { Reply, PostItem, Post, User } from "../../components/Layout"
// ----------------------------------------------------
// 型定義（君の定義をそのまま適用！）
// ----------------------------------------------------
type follows = {
    follower_name: string
    following_name: string
    created_at: string
}

// ----------------------------------------------------
// アバターコンポーネント (簡易版)
// ----------------------------------------------------
const AvatarUpload = ({
    currentAvatar,
    userName,
}: {
    isOwnProfile: boolean
    userId: string
    currentAvatar?: string
    userName: string
    onUploadComplete: (url: string) => void
}) => {
    return (
        <div style={{
            width: "72px", height: "72px", borderRadius: "50%",
            background: currentAvatar ? "transparent" : "#1d9bf0",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: "bold", fontSize: "28px", color: "#fff",
            overflow: "hidden", position: "relative"
        }}>
            {currentAvatar ? (
                <img src={currentAvatar} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
                userName[0]?.toUpperCase()
            )}
        </div>
    )
}

// ----------------------------------------------------
// メインコンポーネント
// ----------------------------------------------------
export default function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
    const { username: userNameParam } = use(params)
    const [currentUser, setCurrentUser] = useState<User | null>(null) // ログイン中の自分
    const [profileUser, setProfileUser] = useState<User | null>(null)  // 表示中のプロフの主
    const [posts, setPosts] = useState<Post[]>([])
    const router = useRouter()
    const [replyingTo, setReplyingTo] = useState<any | null>(null)
    const [loading, setLoading] = useState(true)
    const [editing, setEditing] = useState(false)
    const [displayName, setDisplayName] = useState("")
    const [newUserName, setNewUserName] = useState("")
    const [bio, setBio] = useState("")
    const [avatarUrl, setAvatarUrl] = useState("")
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState("")
    const [isFollowing, setIsFollowing] = useState(false)
    const [followersCount, setFollowersCount] = useState(0)
    const [followingCount, setFollowingCount] = useState(0)
    const [targetUrl, setTargetUrl] = useState<string | null>(null)
    const userName = userNameParam || ""
    const isOwnProfile = currentUser?.user_name === userName

    // 1. 初期データロード
    useEffect(() => {
        const init = async () => {
            setLoading(true)

            // ログインセッション確認
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) { window.location.href = "/auth"; return }

            // ① 自分のデータ取得
            const { data: myData } = await supabase
                .from("users").select("*").eq("id", session.user.id).single<User>()

            if (myData) {
                setCurrentUser(myData)
            }

            // ② 表示対象ユーザーのデータ取得
            const { data: targetData } = await supabase
                .from("users").select("*").eq("user_name", userName).single<User>()

            if (targetData) {
                setProfileUser(targetData)
                setDisplayName(targetData.display_name || "")
                setNewUserName(targetData.user_name)
                setBio(targetData.bio || "")
                setAvatarUrl(targetData.avatar_url || "")

                if (myData) {
                    checkFollowStatus(myData.user_name, targetData.user_name)
                }
                fetchFollowCounts(targetData.user_name)

                // ★ myData（自分）と targetData（対象者）の取得が完了してからポストを取得！
                await fetchPosts(targetData, myData?.user_name)
            }

            setLoading(false)
        }
        init()
    }, [userName])

    // 2. 投稿一覧取得
    // ★ 第1引数を targetUser: User | null に変更！
    const fetchPosts = async (targetUser: User | null, myUserName?: string) => {
        if (!targetUser) return

        // ① ターゲットユーザーの投稿を取得
        const { data: postsData } = await supabase
            .from("posts")
            .select("*")
            .eq("user_name", targetUser.user_name) // targetUser から user_name を取得
            .order("created_at", { ascending: false })

        // ② 返信先（親ポスト）のユーザー名を調べるため、全投稿を一緒に取得
        const { data: allPostsData } = await supabase.from("posts").select("*")
        const { data: likesData } = await supabase.from("likes").select("*")
        const { data: bookmarksData } = await supabase.from("bookmarks").select("*")

        if (postsData) {
            const merged: Post[] = postsData.map((post: any) => {
                let replyToUser = null
                if (post.reply_to) {
                    const parentPost = allPostsData?.find((p) => p.id === post.reply_to)
                    if (parentPost) {
                        replyToUser = parentPost.user_name
                    }
                }

                return {
                    ...post,
                    // ★ State ではなく引数の targetUser から直接取得！これで確実に表示される！
                    display_name: targetUser.display_name || post.user_name,
                    avatar_url: targetUser.avatar_url || undefined,
                    likes: likesData?.filter((l: { post_id: string; user_name: string }) => l.post_id === post.id).length || 0,
                    liked: likesData?.some((l: { post_id: string; user_name: string }) => l.post_id === post.id && l.user_name === myUserName),
                    bookmarked: bookmarksData?.some((b: { post_id: string; user_name: string }) => b.post_id === post.id && b.user_name === myUserName),
                    reply_to_user: replyToUser,
                }
            })
            setPosts(merged)
        }
    }

    const LinkedText = ({ text, onLinkClick }: { text: string; onLinkClick: (url: string) => void }) => {
        const urlRegex = /(https?:\/\/[^\s]+)/g
        const parts = text.split(urlRegex)

        return (
            <span>
                {parts.map((part, i) =>
                    urlRegex.test(part) ? (
                        <span
                            key={i}
                            onClick={(e) => {
                                e.stopPropagation()
                                onLinkClick(part)
                            }}
                            style={{ color: "#1d9bf0", cursor: "pointer", textDecoration: "underline" }}
                            onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
                        >
                            {part}
                        </span>
                    ) : (
                        part
                    )
                )}
            </span>
        )
    }

    // 3. フォロー数の取得（follows 型を活用）
    const fetchFollowCounts = async (targetUserName: string) => {
        const { data: followers } = await supabase.from("follows").select("*").eq("following_name", targetUserName)
        const { data: following } = await supabase.from("follows").select("*").eq("follower_name", targetUserName)

        const followerList: follows[] = followers || []
        const followingList: follows[] = following || []

        setFollowersCount(followerList.length)
        setFollowingCount(followingList.length)
    }

    // 4. フォロー状態のチェック
    const checkFollowStatus = async (myUserName: string, targetUserName: string) => {
        const { data } = await supabase
            .from("follows")
            .select("*")
            .eq("follower_name", myUserName)
            .eq("following_name", targetUserName)

        setIsFollowing((data?.length || 0) > 0)
    }

    // 5. プロフィール保存
    const handleSave = async () => {
        if (!currentUser) return
        setSaving(true)
        setError("")

        const { error: updateError } = await supabase
            .from("users")
            .update({
                display_name: displayName,
                user_name: newUserName,
                bio: bio,
                avatar_url: avatarUrl,
            })
            .eq("id", currentUser.id)

        if (updateError) {
            setError("保存に失敗しました: " + updateError.message)
            setSaving(false)
            return
        }

        setSaving(false)
        setEditing(false)

        if (newUserName !== userName) {
            window.location.href = `/profile/${newUserName}`
        } else {
            window.location.reload()
        }
    }

    // 6. フォロー / 解除処理
    const handleFollow = async () => {
        if (!currentUser || !profileUser) return
        if (isFollowing) {
            await supabase.from("follows").delete().eq("follower_name", currentUser.user_name).eq("following_name", profileUser.user_name)
            setIsFollowing(false)
            setFollowersCount((prev) => prev - 1)
        } else {
            await supabase.from("follows").insert({
                follower_name: currentUser.user_name,
                following_name: profileUser.user_name
            })
            setIsFollowing(true)
            setFollowersCount((prev) => prev + 1)
            // ① DBに通知保存
            await supabase.from("notifications").insert({
                user_name: profileUser.user_name,
                actor_name: currentUser.user_name,
                type: "follow",
                post_id: null,
            })

            // ② 実デバイス通知を飛ばす（相手の端末で許可されていれば届きます）
            sendDeviceNotification("新しいフォロー！", {
                body: `@${currentUser.user_name} さんがあなたをフォローしました`,
            })
        }
    }

    // 7. いいね処理
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
        fetchPosts(profileUser, currentUser?.user_name)
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
        fetchPosts(profileUser, currentUser?.user_name)
    }

    // 8. 投稿削除
    const handleDelete = async (postId: string) => {
        await supabase.from("likes").delete().eq("post_id", postId)
        const { error } = await supabase.from("posts").delete().eq("id", postId)
        if (error) {
            alert("削除できませんでした: " + error.message)
            return
        }
        fetchPosts(profileUser, currentUser?.user_name)
    }

    const formatDate = (str: string) => {
        if (!str) return ""
        const d = new Date(str)
        return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`
    }

    if (loading) return (
        <>
            <FullScreenLoading />
        </>
    )

    return (
        <Layout
            Tab="profile"
        >
            <div style={{ paddingBottom: "80px" }}>
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
                        <h1 style={{ margin: 0, fontSize: "18px" }}>{profileUser?.display_name || userName}</h1>
                        <p style={{ margin: 0, fontSize: "13px", color: "#888" }}>{posts.length}件の投稿</p>
                    </div>
                </div>

                {/* プロフィールカード */}
                <div style={{ padding: "20px", borderBottom: "1px solid #333" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                        <AvatarUpload
                            isOwnProfile={isOwnProfile}
                            userId={profileUser?.id || ""}
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
                                            setDisplayName(profileUser?.display_name || "")
                                            setBio(profileUser?.bio || "")
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
                                        outline: "none", boxSizing: "border-box"
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
                                            outline: "none", boxSizing: "border-box"
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
                                        outline: "none", resize: "none", boxSizing: "border-box"
                                    }}
                                />
                            </div>
                            {error && <p style={{ color: "#f44", fontSize: "14px", margin: 0 }}>{error}</p>}
                        </div>
                    ) : (
                        <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <span style={{ fontWeight: "bold", fontSize: "16px", color: "#fff" }}>
                                    {profileUser?.display_name}
                                </span>
                                {/* ★ 運営者タグ / ADMINバッジ */}
                                {profileUser?.role === "admin" && (
                                    <span
                                        className="badge-shine" /* ★ ここに追加！ */
                                        style={{
                                            background: "linear-gradient(135deg, #1d9bf0, #7928ca)",
                                            color: "#fff",
                                            fontSize: "11px",
                                            fontWeight: "bold",
                                            padding: "2px 8px",
                                            borderRadius: "12px",
                                            letterSpacing: "0.5px",
                                            boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
                                            display: "inline-block", /* アニメーション位置維持のため */
                                        }}
                                    >
                                        公式運営
                                    </span>
                                )}
                            </div>
                            <span style={{ color: "#666", fontSize: "14px" }}>@{profileUser?.user_name}</span>
                            {profileUser?.bio && <p style={{ margin: "0 0 12px", fontSize: "15px" }}>{profileUser.bio}</p>}

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
                                登録日: {profileUser ? formatDate(profileUser.created_at) : ""}
                            </p>
                        </div>
                    )}
                </div>
                {/* 投稿一覧 */}
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
            <Reply
                targetPost={replyingTo}
                onClose={() => setReplyingTo(null)}
            />
        </Layout>
    )
}