// components/Layout.tsx
"use client"
import { useState, useEffect, createContext, useContext } from "react"
import { supabase } from "../lib/supabase"
import { useRouter } from "next/navigation"
import Link from "next/link"
import React from "react"
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

export type Post = {
    id: string
    user_name: string
    display_name?: string | null
    content: string
    created_at: string
    avatar_url?: string | null
    image_url?: string | null
    reply_to?: string | null
    reply_count?: number
    likes?: number
    liked?: boolean
    bookmarked?: boolean // ★ 追加！
    reply_to_user?: string | null
}

export type User = {
    id: string
    user_name: string
    display_name: string
    bio?: string | null
    avatar_url?: string | null
    created_at: string
    role: string
}

type BarsProps = {
    children: React.ReactNode
    Tab: string
}

export type ReplyProps = {
    targetPost: {
        id: string
        user_name: string
        content: string
    } | null
    onClose: () => void
    onSuccess?: () => void
}

// トレンドデータの型
type Trend = {
    tag: string
    count: number
}

// アバター表示コンポーネント
export const Avatar = ({ url, name, size = 44 }: { url?: string | null; name: string; size?: number }) => (
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
        {url ? <img src={url} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : name[0]?.toUpperCase()}
    </div>
)

export default function Layout({ children, Tab }: { children: React.ReactNode; Tab?: string }) {
    const router = useRouter()
    const [searchQuery, setSearchQuery] = useState("")
    // 〜〜 コンポーネント内の処理 〜〜
    const [allPostsData, setAllPostsData] = useState<Post[]>([])
    const [trends, setTrends] = useState<Trend[]>([])
    const [activeIdx, setActiveIdx] = useState(0)

    // 検索実行（Enterキー）
    const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && searchQuery.trim()) {
            router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
        }
    }

    // ハッシュタグクリック
    const handleTagClick = (tag: string) => {
        router.push(`/search?q=${encodeURIComponent(tag)}`)
    }
    const [activeTab, setActiveTab] = useState(Tab)
    const [currentUser, setCurrentUser] = useState<User | null>(null) // ★ ここに移動！
    useEffect(() => {
        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) { window.location.href = "/auth"; return }

            const { data: userData } = await supabase
                .from("users").select("*").eq("id", session.user.id).single()

            if (!userData) {
                const userName = session.user.user_metadata?.user_name || session.user.email?.split("@")[0]
                await supabase.from("users").insert({
                    id: session.user.id, user_name: userName, display_name: userName,
                })
                setCurrentUser({
                    id: session.user.id, user_name: userName, display_name: userName,
                    bio: null, created_at: "1970-01-01T00:00:00.000Z", role: "user"
                })
            } else {
                setCurrentUser(userData)
            }
        }
        init()
    }, [])

    useEffect(() => {
        const fetchAllPosts = async () => {
            const { data, error } = await supabase
                .from("posts")
                .select("id, content") // タグ集計に必要なものだけ取得

            if (error) {
                console.error("投稿データの取得に失敗しました:", error)
                return
            }

            if (data) {
                setAllPostsData(data as Post[])
            }
        }

        fetchAllPosts()
    }, [])

    // ★ 4. トレンドの集計処理（エラー修正済み）
    useEffect(() => {
        if (!allPostsData || allPostsData.length === 0) return

        // ハッシュタグ検出用正規表現
        const hashtagRegex = /#[a-zA-Z0-9_\u4e00-\u9fa5\u3040-\u309f\u30a0-\u30ff]+/g
        const tagCounts: Record<string, number> = {} // Record型でインデックスエラーを回避

        // 全投稿の本文からハッシュタグを抽出＆カウント
        allPostsData.forEach((post: Post) => { // 型を明示
            if (!post.content) return
            const matches = post.content.match(hashtagRegex)
            if (matches) {
                // 1つの投稿で同じタグが複数あっても1回とカウント
                const uniqueTags = Array.from(new Set(matches))
                uniqueTags.forEach((tag) => {
                    tagCounts[tag] = (tagCounts[tag] || 0) + 1
                })
            }
        })

        // 件数が多い順にソートして上位4件を取得
        const sortedTrends: Trend[] = Object.entries(tagCounts)
            .map(([tag, count]) => ({ tag, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 4)

        setTrends(sortedTrends)
    }, [allPostsData])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        window.location.href = "/auth"
    }

    const navItems = [
        {
            id: "home",
            icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
            ),
            label: "ホーム",
            action: () => {
                setActiveTab("home")
                window.location.href = "/"
            },
        },
        {
            id: "rooms",
            icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 3v18"></path>
                    <path d="M19 21V3H9"></path>
                    <path d="M5 3l10 2v14L5 21z"></path>
                    <circle cx="12" cy="12" r="1"></circle>
                </svg>

            ),
            label: "部屋",
            action: () => {
                setActiveTab("rooms")
                window.location.href = "/rooms"
            },
            soon: false,
            beta: false
        },
        {
            id: "search",
            icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="10" cy="10" r="7.5"></circle>
                    <line x1="21" y1="21" x2="15.3" y2="15.3"></line>
                </svg>
            ),
            label: "検索",
            action: () => {
                setActiveTab("search"),
                    window.location.href = "/search"
            },
            soon: false,
            beta: false
        },
        {
            id: "notifications",
            icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
            ),
            label: "通知",
            action: () => {
                setActiveTab("notifications"),
                    window.location.href = "/notifications"
            },
            soon: false,
            beta: false
        },
        {
            id: "bookmarks",
            icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                </svg>
            ),
            label: "ブックマーク",
            action: () => {
                setActiveTab("bookmarks"),
                    window.location.href = "/bookmarks"
            },
            soon: false,
            beta: false
        },
        {
            id: "profile",
            icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                </svg>
            ),
            label: "プロフィール",
            action: () => {
                setActiveTab("profile")
                if (currentUser?.user_name) {
                    window.location.href = `/profile/${currentUser.user_name}`
                } else {
                    window.location.href = "/profile"
                }
            },
            soon: false,
            beta: false
        },
        {
            id: "settings",
            icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
            ),
            label: "設定",
            action: () => setActiveTab("settings"),
            soon: true,
            beta: false
        },
    ]
    const activeIndex = navItems.findIndex((item) => item.id === activeTab)
    const BUTTON_HEIGHT = 52 // ボタンの高さ40px + gap 8px など
    return (
        <div style={{ minHeight: "100vh", background: "#000", fontFamily: "sans-serif", color: "#fff", display: "flex", justifyContent: "space-between" }}>
            {/* 2. 左サイドバー（共通：PC） */}
            <div
                className="pc-only"
                style={{
                    width: "280px", padding: "20px 12px",
                    position: "sticky", top: 0, height: "100vh",
                    display: "flex", flexDirection: "column",
                    borderRight: "1px solid #333",
                    flexShrink: 0
                }}>
                {/* ロゴ */}
                <div style={{ padding: "0px 0px", marginBottom: "12px" }}>
                    <img src="/logo-compact.svg" alt="Origo" style={{ height: "60px", width: "auto" }} />
                </div>
                {/* ナビ */}
                <nav className="nav-tab-vertical-container" style={{ flex: 1, position: "relative", display: "flex", flexDirection: "column", gap: "0px", width: "250px" }}>
                    {/* ★ 上下に移動する白いバー */}
                    {activeIndex !== -1 && (
                        <div
                            className="nav-tab-indicator-vertical"
                            style={{
                                // インデックス × 高さ分だけ下にスライド！
                                transform: `translateY(${activeIndex * BUTTON_HEIGHT + 12}px)`,
                            }}
                        />
                    )}
                    {/* 2. 各タブボタン */}
                    {navItems.map((item) => {
                        const isActive = activeTab === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={item.action}
                                /* ★ アクティブな時だけ active-tab-item クラスを付与 */
                                className={`btn-bounce ${isActive ? "active-tab-item" : ""}`}
                                style={{
                                    width: "100%", display: "flex", alignItems: "center", gap: "16px",
                                    background: isActive ? "#111" : "none",
                                    border: "none", borderRadius: "12px",
                                    padding: "12px 16px", cursor: "pointer",
                                    color: isActive ? "#fff" : "#aaa",
                                    fontSize: "16px", marginBottom: "4px",
                                    textAlign: "left"
                                }}>
                                <span style={{ fontSize: "20px" }}>{item.icon}</span>
                                <span style={{ fontWeight: isActive ? "bold" : "normal" }}>
                                    {item.label}
                                </span>
                                {item.soon && (
                                    <span style={{
                                        marginLeft: "auto", fontSize: "10px",
                                        background: "#1d9bf020", color: "#1d9bf0",
                                        padding: "2px 8px", borderRadius: "10px",
                                        border: "1px solid #1d9bf040"
                                    }}>
                                        {item.beta ? "β版" : "開発中"}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                    <div style={{ padding: "16px", fontSize: "12px", color: "#666", display: "flex", gap: "12px" }}>
                        <Link href="/legal" style={{ color: "#666", textDecoration: "none" }}>法的情報</Link>
                    </div>
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
            </div>

            {/* 3. メインコンテンツ領域 */}
            <div style={{ flex: 1 }}>
                {children}
            </div>

            {/* 4. 右サイドバー（共通：PC） */}
            <div
                className="pc-only"
                style={{
                    width: "320px",
                    padding: "20px 16px",
                    position: "sticky",
                    top: 0,
                    height: "100vh",
                    overflowY: "auto",
                    flexShrink: 0,
                    borderLeft: "1px solid #333",
                }}
            >
                {/* 検索欄 */}
                <div style={{ position: "relative", marginBottom: "16px" }}>
                    <span
                        style={{
                            position: "absolute",
                            left: "14px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            fontSize: "16px",
                        }}
                    >
                        <img
                            src={"/search.svg"}
                            alt="search"
                            style={{ width: "16px", height: "16px" }}
                        />
                    </span>
                    <input
                        placeholder="検索"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={handleSearch}
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

                {/* トレンド */}
                <div style={{ background: "#111", borderRadius: "16px", padding: "16px", marginBottom: "16px" }}>
                    <h2 style={{ fontSize: "18px", fontWeight: "bold", margin: "0 0 16px" }}>トレンド</h2>

                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {trends.length === 0 ? (
                            <p style={{ margin: 0, fontSize: "13px", color: "#888" }}>トレンドはありません</p>
                        ) : (
                            trends.map((item, i) => (
                                <div
                                    key={item.tag}
                                    onClick={() => handleTagClick(item.tag)}
                                    style={{
                                        borderBottom: i < trends.length - 1 ? "1px solid #222" : "none",
                                        paddingBottom: i < trends.length - 1 ? "12px" : "0",
                                        cursor: "pointer",
                                    }}
                                >
                                    <p style={{ margin: "0 0 2px", fontSize: "13px", color: "#888" }}>日本のトレンド</p>
                                    <p style={{ margin: "0 0 2px", fontWeight: "bold", fontSize: "15px", color: "#fff" }}>
                                        {item.tag}
                                    </p>
                                    <p style={{ margin: 0, fontSize: "12px", color: "#666" }}>
                                        {item.count}件のポスト
                                    </p>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* おすすめユーザー */}
                <div style={{ background: "#111", borderRadius: "16px", padding: "16px", marginBottom: "16px" }}>
                    <h2 style={{ fontSize: "18px", fontWeight: "bold", margin: "0 0 16px" }}>おすすめユーザー</h2>
                    <p style={{ color: "#888", fontSize: "14px", margin: 0 }}>開発中！</p>
                </div>

                <p style={{ color: "#888", fontSize: "12px" }}>
                    Copyright © 2026{" "}
                    <a
                        href="https://x.com/fafogame5"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "#1d9bf0", textDecoration: "none" }}
                    >
                        tumayouzi_Dev
                    </a>
                    . All rights reserved.
                </p>
            </div>

            {/* 5. 下部バー（共通：スマホ） */}
            <div className="mobile-only" style={{
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
    )
}

// URL & #ハッシュタグリンク化コンポーネント
export const LinkedText = ({
    text,
    onLinkClick,
    onTagClick,
    query,
}: {
    text: string
    onLinkClick?: (url: string) => void
    onTagClick?: (tag: string) => void
    query?: string
}) => {
    const router = useRouter()
    // URL、ハッシュタグ、検索クエリの分割用正規表現
    const regex = /(https?:\/\/[^\s]+|#[a-zA-Z0-9_\u4e00-\u9fa5\u3040-\u309f\u30a0-\u30ff]+)/g
    const parts = text.split(regex)

    return (
        <span>
            {parts.map((part, i) => {
                if (/^https?:\/\//.test(part)) {
                    return (
                        <span
                            key={i}
                            onClick={(e) => {
                                e.stopPropagation()
                                if (onLinkClick) onLinkClick(part)
                                else window.open(part, "_blank")
                            }}
                            style={{ color: "#1d9bf0", cursor: "pointer", textDecoration: "underline" }}
                        >
                            {part}
                        </span>
                    )
                } else if (/^#/.test(part)) {
                    return (
                        <span
                            key={i}
                            onClick={(e) => {
                                e.stopPropagation()
                                if (onTagClick) onTagClick(part)
                                else router.push(`/search?q=${encodeURIComponent(part)}`)
                            }}
                            style={{ color: "#1d9bf0", cursor: "pointer" }}
                            onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
                            onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
                        >
                            {part}
                        </span>
                    )
                }

                // 検索ワードがある場合は太字（ハイライト）
                if (query && part.toLowerCase().includes(query.toLowerCase())) {
                    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
                    const subParts = part.split(new RegExp(`(${escapedQuery})`, "gi"))
                    return (
                        <span key={i}>
                            {subParts.map((sub, j) =>
                                sub.toLowerCase() === query.toLowerCase() ? (
                                    <strong key={j} style={{ color: "#1d9bf0", fontWeight: "bold" }}>
                                        {sub}
                                    </strong>
                                ) : (
                                    sub
                                )
                            )}
                        </span>
                    )
                }

                return part
            })}
        </span>
    )
}

// 日付フォーマット
export const formatDate = (str: string) => {
    const d = new Date(str)
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`
}

// ★ 共通ポストカードコンポーネント！
export function PostItem({
    post,
    currentUser,
    onLike,
    onReply,
    onBookmark,
    onDelete,
    onLinkClick,
    searchQuery,
}: {
    post: Post
    currentUser: User | null
    onLike: (post: Post) => void
    onReply: (post: Post) => void
    onBookmark?: (post: Post) => void | Promise<void> // ★ 追加！
    onDelete?: (postId: string) => void
    onLinkClick?: (url: string) => void
    searchQuery?: string
}) {
    const router = useRouter()

    return (
        <div
            className="glow-card"
            onClick={() => router.push(`/post/${post.id}`)}
            style={{
                cursor: "pointer",
                padding: "16px 20px",
                display: "flex",
                gap: "12px",
                alignItems: "flex-start", // ★ ここを追加！(アバターを一番上に固定)
                marginBottom: "3px", /* カード同士の間隔を開ける場合 */
            }}
        >
            <button
                onClick={(e) => {
                    e.stopPropagation()
                    router.push(`/profile/${post.user_name}`)
                }}
                style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
            >
                <Avatar url={post.avatar_url} name={post.user_name} />
            </button>

            <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "4px" }}>
                    <strong style={{ fontSize: "15px", color: "#fff" }}>{post.display_name}</strong>
                    <span style={{ color: "#888", fontSize: "13px" }}>@{post.user_name}</span>
                    <span style={{ color: "#888", fontSize: "13px" }}>{formatDate(post.created_at)}</span>
                </div>

                {/* 返信先表示 */}
                {post.reply_to_user && (
                    <div style={{ color: "#888", fontSize: "13px", marginBottom: "4px" }}>
                        返信先: <span style={{ color: "#1d9bf0" }}>@{post.reply_to_user}</span> さん
                    </div>
                )}

                {/* 本文 */}
                <p
                    style={{
                        margin: "0 0 8px",
                        fontSize: "15px",
                        lineHeight: "1",
                        wordBreak: "break-word",
                        whiteSpace: "pre-wrap",
                        color: "#fff",
                    }}
                >
                    <LinkedText text={post.content} onLinkClick={onLinkClick} query={searchQuery} />
                </p>
                {post.image_url && (
                    <img
                        src={post.image_url}
                        alt="添付画像"
                        style={{
                            maxWidth: "100%",
                            maxHeight: "350px",
                            borderRadius: "12px",
                            marginTop: "10px",
                            objectFit: "cover",
                            border: "1px solid #333"
                        }}
                    />
                )}
                {/* アクションボタン（いいね・リプライ・削除） */}
                <div style={{ display: "flex", gap: "16px" }}>
                    {/* いいねボタン */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            onLike(post)
                        }}
                        style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: post.liked ? "#f91880" : "#888",
                            fontSize: "14px",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "4px 8px",
                            borderRadius: "20px",
                        }}
                    >
                        <img
                            src={post.liked ? "/heart-filled.svg" : "/heart.svg"}
                            alt="like"
                            style={{ width: "16px", height: "16px" }}
                        />
                        <span>{post.likes || 0}</span>
                    </button>

                    {/* リプライボタン */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            onReply(post)
                        }}
                        style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "#888",
                            fontSize: "14px",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "4px 8px",
                            borderRadius: "20px",
                        }}
                    >
                        <img src="/comment.svg" alt="comment" style={{ width: "16px", height: "16px" }} />
                        <span>{post.reply_count || 0}</span>
                    </button>
                    {/* ★ ブックマークボタン */}
                    {onBookmark && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                onBookmark(post)
                            }}
                            style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                color: post.bookmarked ? "#1d9bf0" : "#888",
                                fontSize: "14px",
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                padding: "4px 8px",
                                borderRadius: "20px",
                            }}
                        >
                            {/* アイコンはSVGか文字で表現 */}
                            <img
                                src={post.bookmarked ? "/bookmark-filled.svg" : "/bookmark.svg"}
                                alt="bookmark"
                                style={{ width: "16px", height: "16px" }}
                            />
                            <span>{post.bookmarked ? 1 : 0}</span>
                        </button>
                    )}
                    {/* 自分の投稿なら削除ボタン */}
                    {post.user_name === currentUser?.user_name && onDelete && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                if (confirm("このポストを削除しますか？")) {
                                    onDelete(post.id)
                                }
                            }}
                            style={{
                                marginLeft: "auto",
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                color: "#555",
                                padding: "2px 6px",
                                borderRadius: "4px",
                                fontSize: "13px",
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = "#f44")}
                            onMouseLeave={(e) => (e.currentTarget.style.color = "#555")}
                        >
                            <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
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
                    )}
                </div>
            </div>
        </div>
    )
}

export function Reply({ targetPost, onClose, onSuccess }: ReplyProps) {
    const [replyInput, setReplyInput] = useState("")
    const [submitting, setSubmitting] = useState(false)

    if (!targetPost) return null

    const handleSendReply = async () => {
        if (!replyInput.trim() || submitting) return
        setSubmitting(true)

        // ★ ログイン中のユーザー情報を取得
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
            alert("ログインが必要です")
            setSubmitting(false)
            return
        }

        const { data: userData } = await supabase
            .from("users")
            .select("user_name")
            .eq("id", session.user.id)
            .single()

        if (!userData) {
            alert("ユーザー情報が見つかりません")
            setSubmitting(false)
            return
        }

        const { error } = await supabase.from("posts").insert({
            user_name: userData.user_name,
            content: replyInput.trim(),
            reply_to: targetPost.id,
        })

        if (error) {
            alert("返信に失敗しました: " + error.message)
        } else {
            await supabase
                .from("posts")
                .update({ reply_count: (targetPost as any).reply_count ? (targetPost as any).reply_count + 1 : 1 })
                .eq("id", targetPost.id)

            setReplyInput("")
            onClose()
            if (targetPost && targetPost.user_name !== userData.user_name) {
                await supabase.from("notifications").insert({
                    user_name: targetPost.user_name,     // 返信された人
                    actor_name: userData.user_name,  // 返信した人
                    type: "reply",
                    post_id: targetPost.id,
                })
            }
            if (onSuccess) onSuccess()
        }
        setSubmitting(false)
    }

    return (
        <div
            onClick={onClose}
            style={{
                position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                background: "rgba(91, 112, 131, 0.4)", display: "flex",
                justifyContent: "center", alignItems: "flex-start", paddingTop: "60px", zIndex: 1000
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: "#000", border: "1px solid #333", borderRadius: "16px",
                    width: "100%", maxWidth: "600px", padding: "20px", color: "#fff"
                }}
            >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
                    <button onClick={onClose} style={{ background: "none", border: "none", color: "#fff", fontSize: "18px", cursor: "pointer" }}>
                        ✕
                    </button>
                </div>

                <div style={{ borderLeft: "2px solid #333", paddingLeft: "12px", color: "#888", fontSize: "14px", marginBottom: "16px" }}>
                    <span style={{ color: "#fff", fontWeight: "bold" }}>@{targetPost.user_name}</span>
                    <p style={{ margin: "4px 0 0", color: "#aaa" }}>{targetPost.content}</p>
                </div>

                <textarea
                    placeholder="どう思う？"
                    value={replyInput}
                    onChange={(e) => setReplyInput(e.target.value)}
                    style={{
                        width: "100%", background: "#000", color: "#fff", border: "none",
                        outline: "none", resize: "none", minHeight: "120px", fontSize: "16px",
                        boxSizing: "border-box"
                    }}
                />

                <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "12px", marginTop: "12px" }}>

                    {/* 残り文字数表示 (300文字を超えたら赤字にする) */}
                    <span style={{
                        fontSize: "13px",
                        color: replyInput.length > 300 ? "#f00" : "#888"
                    }}>
                        {300 - replyInput.length}
                    </span>

                    <button
                        onClick={handleSendReply}
                        disabled={submitting || !replyInput.trim() || replyInput.length > 300}
                        style={{
                            background: !replyInput.trim() || replyInput.length > 300 ? "#555" : "#1d9bf0",
                            color: "#fff",
                            border: "none",
                            padding: "8px 20px",
                            borderRadius: "20px",
                            fontWeight: "bold",
                            cursor: !replyInput.trim() || replyInput.length > 300 ? "not-allowed" : "pointer"
                        }}
                    >
                        {submitting ? "送信中..." : "返信"}
                    </button>
                </div>
            </div>
        </div>
    )
}

export const sendReply = async ({
    currentUser,
    targetPostId,
    replyInput
}: {
    currentUser: { user_name: string } | null
    targetPostId: string
    replyInput: string
}) => {
    if (!currentUser || !replyInput.trim()) return false

    const { error } = await supabase.from("posts").insert({
        user_name: currentUser.user_name,
        content: replyInput.trim(),
        reply_to: targetPostId,
    })

    if (error) {
        alert("返信に失敗しました: " + error.message)
        return false
    }

    return true
}