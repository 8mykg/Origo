// 1. ブラウザに通知許可をリクエストする関数
export const requestNotificationPermission = async () => {
  if (!("Notification" in window)) {
    console.log("このブラウザは通知に対応していません。")
    return false
  }

  if (Notification.permission === "granted") {
    return true
  }

  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission()
    return permission === "granted"
  }

  return false
}

// 2. 実デバイスに通知を発行する関数
export const sendDeviceNotification = (title: string, options?: NotificationOptions) => {
  if (!("Notification" in window)) return

  if (Notification.permission === "granted") {
    new Notification(title, {
      icon: "/icon.png", // 通知に表示したいアイコンのパス（publicフォルダ内）
      badge: "/icon.png",
      ...options,
    })
  }
}