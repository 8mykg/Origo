// components/Layout.tsx
"use client"
import { useState, useEffect } from "react"
import { supabase } from "../lib/supabase"
import { useRouter } from "next/navigation"
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

export default function Layout({ children, Tab }: { children: React.ReactNode; Tab?: string }) {
    const router = useRouter()
    const [searchQuery, setSearchQuery] = useState("")

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

    const isMobile = useIsMobile()

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
                setCurrentUser({ id: session.user.id, user_name: userName, display_name: userName })
            } else {
                setCurrentUser(userData)
            }
        }
        init()
    }, [])

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
            id: "settings",
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
            maintenance: false
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
            action: () => setActiveTab("notifications"),
            soon: true,
            maintenance: false
        },
        {
            id: "bookmarks",
            icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                </svg>
            ),
            label: "ブックマーク",
            action: () => setActiveTab("bookmarks"),
            soon: true,
            maintenance: false
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
            maintenance: false
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
            maintenance: false
        },
    ]

    return (
        <div style={{ minHeight: "100vh", background: "#000", fontFamily: "sans-serif", color: "#fff", display: "flex", justifyContent: "space-between" }}>
            {/* 2. 左サイドバー（共通：PC） */}
            {!isMobile && (<div style={{
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
                <nav style={{ flex: 1 }}>
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={item.action}
                            style={{
                                width: "100%", display: "flex", alignItems: "center", gap: "16px",
                                background: activeTab === item.id ? "#111" : "none",
                                border: "none", borderRadius: "12px",
                                padding: "12px 16px", cursor: "pointer",
                                color: activeTab === item.id ? "#fff" : "#aaa",
                                fontSize: "16px", marginBottom: "4px",
                                textAlign: "left"
                            }}>
                            <span style={{ fontSize: "20px" }}>{item.icon}</span>
                            <span style={{ fontWeight: activeTab === item.id ? "bold" : "normal" }}>
                                {item.label}
                            </span>
                            {item.soon && (
                                <span style={{
                                    marginLeft: "auto", fontSize: "10px",
                                    background: "#1d9bf020", color: "#1d9bf0",
                                    padding: "2px 8px", borderRadius: "10px",
                                    border: "1px solid #1d9bf040"
                                }}>
                                    {item.maintenance ? "メンテ中" : "開発中"}
                                </span>
                            )}
                        </button>
                    ))}

                    {/* 投稿ボタン */}
                    <button
                        onClick={() => setActiveTab("home")}
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
            </div>)}

            {/* 3. メインコンテンツ領域 */}
            <div style={{ flex: 1, borderRight: isMobile ? "none" : "1px solid #333", borderLeft: isMobile ? "none" : "1px solid #333", paddingBottom: isMobile ? "80px" : "0" }}>
                {children}
            </div>

            {/* 4. 右サイドバー（共通：PC） */}
            {!isMobile && (
                <div
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
                            {["#Origo", "#SNS開発", "#Next_js", "#Supabase"].map((tag, i) => (
                                <div
                                    key={i}
                                    onClick={() => handleTagClick(tag)}
                                    style={{
                                        borderBottom: i < 3 ? "1px solid #222" : "none",
                                        paddingBottom: i < 3 ? "12px" : "0",
                                        cursor: "pointer",
                                    }}
                                >
                                    <p style={{ margin: "0 0 2px", fontSize: "13px", color: "#888" }}>トレンド</p>
                                    <p style={{ margin: 0, fontWeight: "bold", fontSize: "15px", color: "#fff" }}>{tag}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* おすすめユーザー */}
                    <div style={{ background: "#111", borderRadius: "16px", padding: "16px", marginBottom: "16px" }}>
                        <h2 style={{ fontSize: "18px", fontWeight: "bold", margin: "0 0 16px" }}>おすすめユーザー</h2>
                        <p style={{ color: "#888", fontSize: "14px", margin: 0 }}>フォロー機能は開発中！</p>
                    </div>

                    <p style={{ color: "#888888", fontSize: "12px", margin: "0px" }}>
                        Copyright © 2026{" "}
                        <a
                            href="https://origo-ochre.vercel.app/profile?user=8mykg"
                            style={{ color: "#4da6ff", textDecoration: "underline" }}
                        >
                            tumayouzi_Dev.
                        </a>{" "}
                        All rights reserved.
                    </p>
                </div>
            )}

            {/* 5. 下部バー（共通：スマホ） */}
            {isMobile && (<div style={{
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