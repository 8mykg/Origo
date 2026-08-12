import type { Metadata, Viewport } from "next"
import "./globals.css"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        {/* iPhoneホーム画面追加時のアイコン指定 */}
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body>{children}</body>
    </html>
  )
}

  // Viewport の設定（テーマカラーや拡大禁止など）
  export const viewport: Viewport = {
    themeColor: "#000000",
    width: "device-width",
    initialScale: 1,
    maximumScale: 1, // スマホアプリ感を出すためにダブルタップ拡大などを防ぐ
    userScalable: false,
  }

  // PWA用のメタデータ
  export const metadata: Metadata = {
    title: "Origo",
    description: "Origo Social Network",
    manifest: "/manifest.json",
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: "Origo",
    },
  }