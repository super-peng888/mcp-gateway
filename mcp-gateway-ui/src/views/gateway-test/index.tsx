import { useEffect, useMemo, useRef, useState } from "react"
import {
  Bubble,
  Conversations,
  Prompts,
  Sender,
  Welcome,
} from "@ant-design/x"
import { XMarkdown } from "@ant-design/x-markdown"
import { Avatar, Button } from "antd"
import {
  Bot,
  Braces,
  ListChecks,
  Plus,
  User,
  Wrench,
  Zap,
} from "lucide-react"
import { sendChat, type ChatMessage } from "@/api/chat"
import { PageContainer } from "@/components/PageContainer"
import { PageHeader } from "@/components/PageHeader"

interface DisplayMessage extends ChatMessage {
  pending?: boolean
}

interface Thread {
  key: string
  label: string
  messages: DisplayMessage[]
}

const PROMPTS = [
  {
    key: "list",
    icon: <ListChecks className="size-4" />,
    label: "当前有哪些 MCP 工具？",
    description: "列出网关中所有已配置的工具及说明",
  },
  {
    key: "call",
    icon: <Zap className="size-4" />,
    label: "帮我调用一个工具试试",
    description: "由 AI 选择一个工具并真实调用，验证完整链路",
  },
  {
    key: "params",
    icon: <Braces className="size-4" />,
    label: "某个工具的参数怎么填？",
    description: "查看工具的入参结构与必填项",
  },
]

const aiAvatar = (
  <Avatar
    icon={<Bot className="size-4" />}
    style={{ background: "rgba(124, 58, 237, 0.1)", color: "#7c3aed", border: "1px solid rgba(255,255,255,0.5)" }}
  />
)
const userAvatar = (
  <Avatar
    icon={<User className="size-4" />}
    style={{ background: "rgba(37, 99, 235, 0.1)", color: "#2563eb", border: "1px solid rgba(255,255,255,0.5)" }}
  />
)

let threadSeq = 0
const newThreadKey = () => `thread-${Date.now()}-${++threadSeq}`

export function GatewayTest() {
  const [threads, setThreads] = useState<Thread[]>([])
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const activeThread = threads.find((t) => t.key === activeKey) ?? null
  const messages = useMemo(
    () => activeThread?.messages ?? [],
    [activeThread]
  )

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  const createThread = () => {
    const thread: Thread = { key: newThreadKey(), label: "新的对话", messages: [] }
    setThreads((prev) => [thread, ...prev])
    setActiveKey(thread.key)
    return thread.key
  }

  const patchThread = (key: string, patch: (t: Thread) => Thread) => {
    setThreads((prev) => prev.map((t) => (t.key === key ? patch(t) : t)))
  }

  const send = async (text: string) => {
    const content = text.trim()
    if (!content || sending) return
    const key = activeKey ?? createThread()
    const history = (threads.find((t) => t.key === key)?.messages ?? []).map(
      ({ role, content }) => ({ role, content })
    )

    patchThread(key, (t) => ({
      ...t,
      label: t.messages.length === 0 ? content.slice(0, 24) : t.label,
      messages: [
        ...t.messages,
        { role: "user", content },
        { role: "assistant", content: "", pending: true },
      ],
    }))
    setInput("")
    setSending(true)
    try {
      const reply = await sendChat(content, history)
      patchThread(key, (t) => ({
        ...t,
        messages: [
          ...t.messages.slice(0, -1),
          { role: "assistant", content: reply },
        ],
      }))
    } catch (err) {
      const text = err instanceof Error ? err.message : String(err)
      patchThread(key, (t) => ({
        ...t,
        messages: [
          ...t.messages.slice(0, -1),
          { role: "assistant", content: `调用失败：${text}` },
        ],
      }))
    } finally {
      setSending(false)
    }
  }

  const conversationItems = useMemo(
    () => threads.map((t) => ({ key: t.key, label: t.label })),
    [threads]
  )

  const bubbleItems: React.ComponentProps<typeof Bubble.List>["items"] =
    messages.map((m, idx) =>
      m.role === "user"
        ? {
            key: idx,
            role: "user" as const,
            content: m.content,
            placement: "end" as const,
            avatar: userAvatar,
          }
        : {
            key: idx,
            role: "ai" as const,
            content: m.pending ? "" : <XMarkdown content={m.content} />,
            loading: m.pending,
            placement: "start" as const,
            avatar: aiAvatar,
          }
    )

  return (
    <PageContainer>
      <PageHeader
        title="网关测试"
        description="与 AI 对话，验证 MCP 工具从对话到 REST 调用的完整链路"
      />
      <div className="flex min-h-0 flex-1 overflow-hidden rounded-2xl border border-white/50 bg-white/60 shadow-[0_8px_32px_rgba(16,24,40,0.08)] backdrop-blur-xl">
        {/* Conversations sidebar */}
        <div className="flex w-60 shrink-0 flex-col border-r border-white/40 bg-white/40 backdrop-blur-md">
          <div className="flex items-center justify-between px-4 pt-4 pb-3">
            <span className="text-sm font-bold text-slate-900">
              网关测试
            </span>
            <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-semibold text-violet-600 ring-1 ring-white/50">
              deepseek-v4-flash
            </span>
          </div>
          <div className="px-3 pb-3">
            <Button
              block
              type="primary"
              icon={<Plus className="size-3.5" />}
              onClick={createThread}
            >
              新的对话
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
            <Conversations
              items={conversationItems}
              activeKey={activeKey ?? undefined}
              onActiveChange={(key) => setActiveKey(key)}
            />
          </div>
        </div>

        {/* Chat area */}
        <div className="flex min-w-0 flex-1 flex-col">
          {messages.length === 0 ? (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-8 overflow-y-auto px-8">
              <Welcome
                variant="borderless"
                icon={
                  <span className="flex size-14 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-600 ring-1 ring-white/50 backdrop-blur-sm">
                    <Bot className="size-7" />
                  </span>
                }
                title="开始测试你的 MCP 网关"
                description="询问当前可用的 MCP 工具，或让 AI 直接调用一个工具，验证从对话到 REST 调用的完整链路"
              />
              <Prompts
                title={
                  <span className="flex items-center gap-1.5">
                    <Wrench className="size-4" />
                    试试这些问题
                  </span>
                }
                items={PROMPTS}
                wrap
                onItemClick={({ data }) => send(String(data.label ?? ""))}
              />
            </div>
          ) : (
            <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
              <Bubble.List items={bubbleItems} />
            </div>
          )}

          <div className="shrink-0 px-4 pt-1 pb-4">
            <Sender
              value={input}
              onChange={setInput}
              onSubmit={send}
              loading={sending}
              placeholder="询问有哪些工具，或让 AI 调用一个工具…（Enter 发送，Shift+Enter 换行）"
              autoSize={{ minRows: 1, maxRows: 4 }}
            />
          </div>
        </div>
      </div>
    </PageContainer>
  )
}
