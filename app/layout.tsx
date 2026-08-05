import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Origo",
  description: ".",
  icons: {
    icon: "/logo-icon.svg",
    apple: "/logo-icon.svg",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body style={{ margin: 0, padding: 0, background: "#000" }}>
        {children}
      </body>
    </html>
  )
}