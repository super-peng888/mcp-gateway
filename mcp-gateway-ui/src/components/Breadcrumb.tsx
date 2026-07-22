import { useLocation, useNavigate } from "react-router-dom"
import { ChevronRight } from "lucide-react"

interface Crumb {
  label: string
  path: string
}

const routeCrumbs: Record<string, Crumb[]> = {
  "/dashboard": [{ label: "工作台", path: "/dashboard" }],
  "/gateway-tools": [
    { label: "网关配置", path: "/gateway-tools" },
    { label: "MCP 工具", path: "/gateway-tools" },
  ],
  "/mcp-servers": [
    { label: "网关配置", path: "/gateway-tools" },
    { label: "MCP 服务", path: "/mcp-servers" },
  ],
  "/gateway-test": [{ label: "网关测试", path: "/gateway-test" }],
}

function resolveCrumbs(pathname: string): Crumb[] {
  if (routeCrumbs[pathname]) return routeCrumbs[pathname]
  return []
}

export function Breadcrumb() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const crumbs = resolveCrumbs(pathname)

  return (
    <nav className="glass-bar flex items-center gap-1.5 border-b border-white/40 px-6 py-2 text-sm">
      {crumbs.map((crumb, idx) => (
        <span key={crumb.path + idx} className="flex items-center gap-1.5">
          {idx > 0 && <ChevronRight className="size-3.5 text-slate-400" />}
          {idx === crumbs.length - 1 ? (
            <span className="font-semibold text-slate-900">{crumb.label}</span>
          ) : (
            <button
              onClick={() => navigate(crumb.path)}
              className="text-slate-500 transition-colors hover:text-slate-900"
            >
              {crumb.label}
            </button>
          )}
        </span>
      ))}
    </nav>
  )
}
