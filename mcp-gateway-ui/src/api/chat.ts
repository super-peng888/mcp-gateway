import axios from "axios"

export interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

const instance = axios.create({
  baseURL: "/api",
  timeout: 60000,
})

/** Sends one user message to the backend chat service (DeepSeek + gateway tool loop). */
export async function sendChat(
  message: string,
  history: ChatMessage[]
): Promise<string> {
  const res = await instance.post<{ reply: string }>("/chat", {
    message,
    history: history.slice(-20),
  })
  return res.data.reply
}
