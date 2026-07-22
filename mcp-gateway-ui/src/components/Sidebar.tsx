import { NavLink, useLocation } from "react-router-dom"
import {
  LayoutGrid,
  Server,
  Wrench,
  FlaskConical,
  Globe,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface NavItem {
  label: string
  path: string
  icon: React.ReactNode
}

const navItems: NavItem[] = [
  { label: "工作台", path: "/dashboard", icon: <LayoutGrid className="size-[18px]" /> },
  { label: "MCP 服务", path: "/mcp-servers", icon: <Server className="size-[18px]" /> },
  { label: "MCP 工具", path: "/gateway-tools", icon: <Wrench className="size-[18px]" /> },
  { label: "网关测试", path: "/gateway-test", icon: <FlaskConical className="size-[18px]" /> },
]

export function Sidebar() {
  const { pathname } = useLocation()

  return (
    <aside
      className="glass-bar fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-white/40 px-3 py-5"
      style={{ width: "var(--sidebar-width)" }}
    >
      {/* Brand */}
      <div className="flex items-center gap-3 px-2 pb-5">
        <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-[0_8px_24px_rgba(37,99,235,0.35)] ring-1 ring-white/30">
          <Globe className="size-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-[15px] font-bold leading-tight tracking-tight text-slate-900">
            MCP 网关
          </span>
          <span className="text-[10px] font-semibold tracking-[0.08em] text-slate-500">
            REST → MCP GATEWAY
          </span>
        </div>
      </div>

      <div className="mx-2 border-b border-white/50" />

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto pt-4 sidebar-hidden-scrollbar">
        {navItems.map((item) => {
          const isActive = pathname === item.path
          return (
            <NavLink
              key={item.label}
              to={item.path}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition-all duration-200",
                isActive
                  ? "bg-blue-500/10 text-blue-600 shadow-[inset_3px_0_0_#2563eb,0_4px_16px_rgba(37,99,235,0.12)] ring-1 ring-blue-500/20"
                  : "text-slate-500 hover:bg-white/50 hover:text-slate-900",
              )}
            >
              {item.icon}
              {item.label}
            </NavLink>
          )
        })}
      </nav>

      {/* MCP server status */}
      <div className="mx-2 rounded-xl bg-white/50 p-3 shadow-[0_4px_12px_-6px_rgba(16,24,40,0.08)] ring-1 ring-white/50">
        <div className="flex items-center gap-2">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
          </span>
          <span className="text-[12px] font-semibold text-slate-900">
            MCP Server
          </span>
        </div>
        <p className="mt-1.5 truncate font-mono text-[10px] leading-relaxed text-slate-500">
          {":8082/mcp/{name}"}
        </p>
      </div>
    </aside>
  )
}
