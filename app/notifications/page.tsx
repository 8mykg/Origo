"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../lib/supabase"
import { FullScreenLoading } from "../components/CSSTransformation"
import Layout, { User } from "../components/Layout"
import { requestNotificationPermission } from "../lib/notification"

type NotificationItem = {
    id: string
    created_at: string
    user_name: string
    actor_name: string
    type: "like" | "reply"
    post_id: string
    read: boolean
}

export default function NotificationsPage() {
    const router = useRouter()
    const [currentUser, setCurrentUser] = useState<User | null>(null)
    const [notifications, setNotifications] = useState<NotificationItem[]>([])
    const [loading, setLoading] = useState(true)
    const [hasPermission, setHasPermission] = useState(false)

    // 1. ユーザーセッション＆通知許可状態の初期化
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
            }

            // 通知許可のチェック
            if ("Notification" in window) {
                setHasPermission(Notification.permission === "granted")
            }
        }
        init()
    }, [])

    // 2. 通知データの取得
    useEffect(() => {
        if (!currentUser) return

        const fetchNotifications = async () => {
            setLoading(true)
            const { data, error } = await supabase
                .from("notifications")
                .select("*")
                .eq("user_name", currentUser.user_name)
                .order("created_at", { ascending: false })

            if (data) {
                setNotifications(data)
            }
            setLoading(false)
        }

        fetchNotifications()
    }, [currentUser])

    // 通知許可ボタンを押した時
    const handleEnableNotification = async () => {
        const granted = await requestNotificationPermission()
        setHasPermission(granted)
        if (granted) {
            alert("デバイス通知が有効になりました！")
        } else {
            alert("通知が拒否されたか、設定されていません。")
        }
    }

    // 通知をクリックしたら該当ポストへジャンプ
    const handleNotificationClick = (postId: string) => {
        router.push(`/post/${postId}`)
    }

    return (
        <Layout Tab="notifications">
            {/* ヘッダー */}
            <div
                style={{
                    padding: "16px",
                    borderBottom: "1px solid #333",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    position: "sticky",
                    top: 0,
                    background: "rgba(0,0,0,0.8)",
                    backdropFilter: "blur(12px)",
                    zIndex: 10,
                }}
            >
                <h1 style={{ fontSize: "20px", fontWeight: "bold", margin: 0 }}>通知</h1>
                {!hasPermission && (
                    <button
                        onClick={handleEnableNotification}
                        style={{
                            background: "#1d9bf0",
                            color: "#fff",
                            border: "none",
                            padding: "6px 12px",
                            borderRadius: "20px",
                            fontWeight: "bold",
                            fontSize: "13px",
                            cursor: "pointer",
                        }}
                    >
                        デバイス通知をONにする
                    </button>
                )}
            </div>

            {/* 通知一覧 */}
            {loading ? (
                <FullScreenLoading />
            ) : notifications.length === 0 ? (
                <div style={{ padding: "40px 20px", color: "#888", textAlign: "center" }}>
                    まだ通知はありません
                </div>
            ) : (
                <div>
                    {notifications.map((item) => (
                        <div
                            key={item.id}
                            onClick={() => handleNotificationClick(item.post_id)}
                            style={{
                                padding: "16px",
                                borderBottom: "1px solid #222",
                                display: "flex",
                                alignItems: "flex-start",
                                gap: "12px",
                                cursor: "pointer",
                                transition: "background 0.2s",
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "#080808")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                            {/* アイコン */}
                            <span style={{ fontSize: "22px", marginTop: "2px" }}>
                                <img src={item.type ? "/heart-filled.svg" : "/comment.svg"} style={{ width: "22px", height: "22px" }} />
                            </span>

                            {/* 内容 */}
                            <div style={{ flex: 1 }}>
                                <p style={{ margin: "0 0 4px", fontSize: "15px", color: "#fff", lineHeight: "1.4" }}>
                                    <strong style={{ color: "#fff" }}>@{item.actor_name}</strong> さんがあなたのポストに
                                    {item.type === "like" ? "「いいね」しました" : "返信しました"}
                                </p>
                                <span style={{ fontSize: "13px", color: "#666" }}>
                                    {new Date(item.created_at).toLocaleString()}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
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
        </Layout>
    )
}