import { useState } from "react"
import { Check, Copy } from "lucide-react"
import { copyText } from "@/lib/mcp"

interface CopyButtonProps {
  text: string
  title?: string
}

export function CopyButton({ text, title = "复制" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    const ok = await copyText(text)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } else {
      alert(`复制失败，请手动复制：${text}`)
    }
  }

  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        void handleCopy()
      }}
      title={title}
      className="flex size-6 shrink-0 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-white/60 hover:text-slate-900"
    >
      {copied ? (
        <Check className="size-3.5 text-emerald-600" />
      ) : (
        <Copy className="size-3.5" />
      )}
    </button>
  )
}
