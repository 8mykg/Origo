"use client"
import { useState, useCallback } from "react"
import Cropper from "react-easy-crop"
import { getCroppedImg } from "../lib/cropImage"
import { supabase } from "../lib/supabase"

type Props = {
  isOwnProfile: boolean
  userId: string
  currentAvatar: string | null
  userName: string
  onUploadComplete: (url: string) => void
}

export default function AvatarUpload({isOwnProfile, userId, currentAvatar, userName, onUploadComplete }: Props) {
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError("")
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      setError("10MB以下の画像を選んでください")
      return
    }

    if (!file.type.startsWith("image/")) {
      setError("画像ファイルを選んでください")
      return
    }

    const reader = new FileReader()
    reader.onload = () => setImageSrc(reader.result as string)
    reader.readAsDataURL(file)
  }

  const onCropComplete = useCallback((_: any, croppedPixels: any) => {
    setCroppedAreaPixels(croppedPixels)
  }, [])

  const handleUpload = async () => {
    if (!imageSrc || !croppedAreaPixels) return
    setUploading(true)
    setError("")

    try {
      const blob = await getCroppedImg(imageSrc, croppedAreaPixels)

      // BlobをFileに変換
      const file = new File([blob], "avatar.jpg", { type: "image/jpeg" })
      const filePath = `${userId}/avatar.jpg`

      // 一旦削除してから再アップロード（エラーは無視）
      await supabase.storage.from("avatars").remove([filePath]).catch(() => { })

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { contentType: "image/jpeg" })

      if (uploadError) {
        console.error("Upload error:", uploadError)
        throw uploadError
      }

      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath)
      const url = `${data.publicUrl}?t=${Date.now()}`

      await supabase.from("users").update({ avatar_url: url }).eq("id", userId)

      onUploadComplete(url)
      setImageSrc(null)
    } catch (e) {
      console.error("Error:", e)
      setError("アップロードに失敗しました")
    }
    setUploading(false)
  }

  return (
    <div>
      {/* アバター表示 */}
      <div style={{ position: "relative", width: "72px", height: "72px" }}>
        {currentAvatar ? (
          <img
            src={currentAvatar}
            alt="avatar"
            style={{ width: "72px", height: "72px", borderRadius: "50%", objectFit: "cover" }}
          />
        ) : (
          <div style={{
            width: "72px", height: "72px", borderRadius: "50%",
            background: "#1d9bf0",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "28px", fontWeight: "bold", color: "#fff"
          }}>
            {userName[0]?.toUpperCase()}
          </div>
        )}
        {/* カメラアイコン */}
        {isOwnProfile && (
          <label style={{
            position: "absolute", bottom: 0, right: 0,
            background: "#1d9bf0", borderRadius: "50%",
            width: "24px", height: "24px",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", fontSize: "14px"
          }}>
            📷
            <input
              type="file"
              accept="image/*"
              onChange={onFileChange}
              style={{ display: "none" }}
            />
          </label>)
        }
      </div>

      {error && <p style={{ color: "#f44", fontSize: "13px", marginTop: "8px" }}>{error}</p>}

      {/* クロッパーモーダル */}
      {
        imageSrc && (
          <div style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)",
            zIndex: 1000, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: "20px"
          }}>
            <p style={{ color: "#fff", fontWeight: "bold", fontSize: "16px", margin: 0 }}>
              アイコンの範囲を選択
            </p>

            {/* クロップエリア */}
            <div style={{ position: "relative", width: "320px", height: "320px", borderRadius: "12px", overflow: "hidden" }}>
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>

            {/* ズームスライダー */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", width: "320px" }}>
              <span style={{ color: "#888", fontSize: "13px" }}>縮小</span>
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                style={{ flex: 1 }}
              />
              <span style={{ color: "#888", fontSize: "13px" }}>拡大</span>
            </div>

            {/* ボタン */}
            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={() => setImageSrc(null)}
                style={{
                  background: "none", border: "1px solid #555",
                  color: "#fff", borderRadius: "24px",
                  padding: "10px 24px", cursor: "pointer",
                  fontSize: "15px", fontWeight: "bold"
                }}>
                キャンセル
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading}
                style={{
                  background: uploading ? "#555" : "#1d9bf0",
                  border: "none", color: "#fff",
                  borderRadius: "24px", padding: "10px 24px",
                  cursor: uploading ? "not-allowed" : "pointer",
                  fontSize: "15px", fontWeight: "bold"
                }}>
                {uploading ? "アップロード中..." : "これで決定！"}
              </button>
            </div>
          </div>
        )
      }
    </div >
  )
}