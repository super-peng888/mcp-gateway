import { useState, useEffect } from "react"
import { Maximize, Minimize, User } from "lucide-react"

export function TopBar() {
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const handler = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener("fullscreenchange", handler)
    return () => document.removeEventListener("fullscreenchange", handler)
  }, [])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
    } else {
      document.exitFullscreen().catch(() => {})
    }
  }

  return (
    <header
      className="sticky top-0 z-40 flex w-full items-center justify-end gap-3 border-b border-white/40 bg-white/50 px-6 backdrop-blur-2xl"
      style={{ height: "var(--topbar-height)" }}
    >
      {/* Right actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={toggleFullscreen}
          className="flex size-8 items-center justify-center rounded-lg text-slate-500 transition-all hover:bg-white/60 hover:text-slate-900 hover:shadow-sm"
          title="切换全屏"
        >
          {isFullscreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
        </button>

        <div className="mx-1 h-6 w-px bg-white/50" />

        <div className="flex items-center gap-2.5 rounded-full bg-white/50 py-1 pl-1 pr-3 backdrop-blur-md ring-1 ring-white/50">
          <div className="flex size-7 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-md">
            <User className="size-3.5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[13px] font-semibold leading-tight text-slate-900">
              管理员
            </span>
            <span className="text-[11px] leading-tight text-slate-500">
              admin@mcp.dev
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}
