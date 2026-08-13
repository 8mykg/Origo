"use client"

import { useState, useEffect } from "react"
import { supabase } from "../lib/supabase" // TLと同じクライアントを参照！
import Link from "next/link"
import Layout from "../components/Layout"
import CreateRoomModal from "../components/rooms/CreateRoomModal"

interface Room {
    id: string
    name: string
    description: string
    created_at: string
}

export default function RoomsPage() {
    const [rooms, setRooms] = useState<Room[]>([])
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [loading, setLoading] = useState(true)

    const fetchRooms = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from("rooms")
            .select("*")
            .order("created_at", { ascending: false })

        if (!error && data) {
            setRooms(data)
        }
        setLoading(false)
    }

    useEffect(() => {
        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                window.location.href = "/auth"
                return
            }
            fetchRooms()
        }
        init()
    }, [])

    return (
        <Layout Tab="rooms">
            <div style={{ width: "100%", color: "#fff", boxSizing: "border-box" }}>

                {/* 1. ヘッダー（上部固定 ＆ 線は端から端まで、中身は余白あり） */}
                <div style={{
                    position: "sticky", top: 0,
                    background: "rgba(0,0,0,0.8)",
                    backdropFilter: "blur(12px)",
                    borderBottom: "1px solid #333",
                    padding: "16px",
                    zIndex: 10,
                    display: "flex", justifyContent: "space-between", alignItems: "center"
                }}>
                    <div>
                        <h1 style={{ fontSize: "20px", margin: "0 0 2px 0", fontWeight: "bold" }}>コミュニティ部屋</h1>
                        <p style={{ color: "#888", fontSize: "13px", margin: 0 }}>気になる部屋に参加して会話してみよう</p>
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        style={{
                            padding: "8px 16px", borderRadius: "20px", border: "none",
                            backgroundColor: "#1d9bf0", color: "#fff", fontWeight: "bold",
                            cursor: "pointer", fontSize: "14px"
                        }}
                    >
                        ＋ 部屋を作成
                    </button>
                </div>

                {/* 2. メインコンテンツエリア（部屋カード一覧） */}
                <div style={{ padding: "16px", boxSizing: "border-box" }}>
                    {loading ? (
                        <p style={{ color: "#888", textAlign: "center", marginTop: "40px" }}>部屋を読み込み中...</p>
                    ) : rooms.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "60px 0", color: "#666" }}>
                            <p style={{ fontSize: "18px", marginBottom: "12px" }}>まだ部屋がありません 📭</p>
                            <p style={{ fontSize: "14px" }}>最初の部屋を作成してコミュニティを盛り上げよう！</p>
                        </div>
                    ) : (
                        <div style={{
                            display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                            gap: "16px"
                        }}>
                            {rooms.map((room) => (
                                <Link
                                    key={room.id}
                                    href={`/rooms/${room.id}`}
                                    style={{ textDecoration: "none", color: "inherit" }}
                                >
                                    <div style={{
                                        backgroundColor: "#161616", border: "1px solid #262626", borderRadius: "16px",
                                        padding: "20px", height: "100%", display: "flex", flexDirection: "column",
                                        justifyContent: "space-between", transition: "border-color 0.2s, transform 0.2s",
                                        boxSizing: "border-box"
                                    }}>
                                        <div>
                                            <h3 style={{ fontSize: "18px", margin: "0 0 8px 0", color: "#fff" }}>
                                                {room.name}
                                            </h3>
                                            <p style={{
                                                fontSize: "13px", color: "#aaa", margin: 0,
                                                display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical",
                                                overflow: "hidden"
                                            }}>
                                                {room.description || "説明はありません"}
                                            </p>
                                        </div>
                                        <div style={{ marginTop: "16px", fontSize: "11px", color: "#555" }}>
                                            {new Date(room.created_at).toLocaleDateString("ja-JP")} 作成
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                {/* モーダル */}
                <CreateRoomModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onCreated={fetchRooms}
                />

            </div>
        </Layout>
    )
}