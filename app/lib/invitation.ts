const SECRET_SALT = "Origo_Super_Secret_Salt_Key_2026"

export const getDailyInvitationCode = async (date = new Date()): Promise<string> => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const dateStr = `${year}-${month}-${day}_${SECRET_SALT}`

  const encoder = new TextEncoder()
  const data = encoder.encode(dateStr)

  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")

  return hashHex.slice(0, 10).toUpperCase()
}

export const verifyInvitationCode = async (inputCode: string): Promise<boolean> => {
  if (!inputCode) return false
  const cleanInput = inputCode.trim().toUpperCase()

  const todayCode = await getDailyInvitationCode(new Date())
  if (cleanInput === todayCode) return true

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayCode = await getDailyInvitationCode(yesterday)
  if (cleanInput === yesterdayCode) return true

  return false
}