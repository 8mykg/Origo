import type { Metadata, Viewport } from "next"
import "./globals.css"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        {/* iPhoneホーム画面追加時のアイコン指定 */}
        <link rel="apple-touch-icon" href="../public/logo-icon-192.png" />
      </head>
      <body>{children}</body>
    </html>
  )
}

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export const metadata: Metadata = {
  title: "Origo",
  description: "Origo Social Network",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico?v=3" },
      { url: "/logo-icon-192.png?v=3", type: "image/png", sizes: "192x192" }
    ],
    shortcut: "/favicon.ico?v=3",
    apple: "/logo-icon-180.png?v=3", // iPhone用
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Origo",
  },
}