import { useEffect, useMemo, useState } from "react"
import { NavLink, useNavigate } from "react-router-dom"
import {
  Activity,
  ArrowRight,
  Braces,
  Check,
  Copy,
  Library,
  Radio,
  Upload,
  Wrench,
} from "lucide-react"
import { Button } from "antd"
import { listGroups, listTools, type ApiGroup, type ToolView } from "@/api/registry"
import { EmptyState } from "@/components/EmptyState"
import { PageContainer } from "@/components/PageContainer"
import { PageHeader } from "@/components/PageHeader"

const MCP_SSE_URL = "http://localhost:8082/mcp/sse"

interface StatDef {
  label: string
  value: string | number
  icon: typeof Library
  tone: string
}

export function Dashboard() {
  const navigate = useNavigate()
  const [groups, setGroups] = useState<ApiGroup[]>([])
  const [tools, setTools] = useState<ToolView[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let cancelled = false
    Promise.all([listGroups(), listTools()])
      .then(([g, t]) => {
        if (cancelled) return
        setGroups(g.data)
        setTools(t.data)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const endpointCount = useMemo(
    () => groups.reduce((acc, g) => acc + g.endpoints.length, 0),
    [groups]
  )
  const toolCountByGroup = useMemo(() => {
    const map = new Map<string, number>()
    tools.forEach((t) => map.set(t.groupName, (map.get(t.groupName) ?? 0) + 1))
    return map
  }, [tools])

  const stats: StatDef[] = [
    { label: "接口分组", value: groups.length, icon: Library, tone: "bg-blue-500/10 text-blue-600" },
    { label: "接口总数", value: endpointCount, icon: Braces, tone: "bg-emerald-500/10 text-emerald-600" },
    { label: "MCP 工具", value: tools.length, icon: Wrench, tone: "bg-violet-500/10 text-violet-600" },
    { label: "协议", value: "MCP / SSE", icon: Radio, tone: "bg-amber-500/10 text-amber-600" },
  ]

  const copySseUrl = async () => {
    try {
      await navigator.clipboard.writeText(MCP_SSE_URL)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <PageContainer>
      <PageHeader
        title="工作台"
        description="查看接口分组、MCP 工具状态与网关接入信息"
      />

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="flex items-center justify-between rounded-2xl border border-white/50 bg-white/60 p-5 shadow-[0_8px_32px_rgba(16,24,40,0.08)] backdrop-blur-xl transition-all hover:shadow-[0_12px_40px_rgba(16,24,40,0.12)] hover:-translate-y-0.5"
          >
            <div>
              <p className="text-sm font-medium text-slate-500">{s.label}</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {loading ? "—" : s.value}
              </p>
            </div>
            <div
              className={`flex size-12 items-center justify-center rounded-xl ${s.tone} ring-1 ring-white/50`}
            >
              <s.icon className="size-5" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Groups overview */}
        <div className="flex flex-col rounded-2xl border border-white/50 bg-white/60 shadow-[0_8px_32px_rgba(16,24,40,0.08)] backdrop-blur-xl lg:col-span-2">
          <div className="flex items-center justify-between border-b border-white/40 px-5 py-4">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-slate-900">
                接口分组概览
              </h3>
              <span className="rounded-full bg-white/60 px-2 py-0.5 text-xs font-semibold text-slate-500 ring-1 ring-white/50">
                {groups.length}
              </span>
            </div>
            <NavLink
              to="/protocol-config"
              className="flex items-center gap-1 text-sm font-semibold text-blue-600 transition-opacity hover:opacity-75"
            >
              查看全部 <ArrowRight className="size-3.5" />
            </NavLink>
          </div>

          <div className="flex-1">
            {groups.length === 0 && !loading ? (
              <EmptyState
                icon={<Library className="size-6" />}
                title="暂无接口分组"
                description="导入 OpenAPI 文档后，接口分组将展示在这里"
                action={
                  <Button type="primary" onClick={() => navigate("/protocol-config")}>
                    前往接口库
                  </Button>
                }
              />
            ) : (
              groups.map((g, idx) => {
                const toolCount = toolCountByGroup.get(g.name) ?? 0
                return (
                  <button
                    key={g.id ?? g.name}
                    onClick={() => navigate("/protocol-config")}
                    className={`flex w-full items-center justify-between gap-4 px-5 py-3.5 text-left transition-colors hover:bg-white/40 ${
                      idx > 0 ? "border-t border-white/40" : ""
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 ring-1 ring-white/50">
                        <Library className="size-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {g.name}
                        </p>
                        <p className="truncate font-mono text-xs text-slate-500">
                          {g.baseUrl}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="rounded-full bg-white/60 px-2 py-0.5 text-xs font-semibold text-slate-500 ring-1 ring-white/50">
                        {g.endpoints.length} 接口
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-white/50 ${
                          toolCount > 0
                            ? "bg-violet-500/10 text-violet-600"
                            : "bg-white/60 text-slate-500"
                        }`}
                      >
                        {toolCount} 工具
                      </span>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          {/* MCP connection info */}
          <div className="rounded-2xl border border-white/50 bg-white/60 p-5 shadow-[0_8px_32px_rgba(16,24,40,0.08)] backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 ring-1 ring-white/50">
                  <Radio className="size-4" />
                </span>
                <h3 className="text-base font-semibold text-slate-900">
                  MCP 接入信息
                </h3>
              </div>
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-600 ring-1 ring-white/50">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                运行中
              </span>
            </div>

            <div className="mt-4 flex flex-col gap-3">
              <div>
                <p className="text-xs font-medium text-slate-500">SSE 端点</p>
                <div className="mt-1 flex items-center gap-2 rounded-lg border border-white/50 bg-white/50 px-3 py-2 backdrop-blur-sm">
                  <span className="flex-1 truncate font-mono text-xs text-slate-900">
                    {MCP_SSE_URL}
                  </span>
                  <button
                    onClick={copySseUrl}
                    title="复制 SSE 地址"
                    className="flex size-6 shrink-0 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-white/60 hover:text-slate-900"
                  >
                    {copied ? (
                      <Check className="size-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                  </button>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">消息端点</p>
                <p className="mt-1 rounded-lg border border-white/50 bg-white/50 px-3 py-2 font-mono text-xs text-slate-900 backdrop-blur-sm">
                  /mcp/messages?sessionId=…
                </p>
              </div>
              <p className="text-xs leading-relaxed text-slate-500">
                在 MCP 客户端（如 Claude Desktop、Cherry Studio）中以上述 SSE
                地址接入，即可调用已配置的工具。
              </p>
            </div>
          </div>

          {/* Quick actions */}
          <div className="rounded-2xl border border-white/50 bg-white/60 p-5 shadow-[0_8px_32px_rgba(16,24,40,0.08)] backdrop-blur-xl">
            <h3 className="text-base font-semibold text-slate-900">快捷操作</h3>
            <div className="mt-3 flex flex-col gap-1">
              {[
                {
                  to: "/protocol-config",
                  icon: Upload,
                  tone: "bg-blue-500/10 text-blue-600",
                  label: "导入接口文档",
                  desc: "OpenAPI / Swagger JSON",
                },
                {
                  to: "/gateway-tools",
                  icon: Wrench,
                  tone: "bg-violet-500/10 text-violet-600",
                  label: "配置 MCP 工具",
                  desc: "选择接口暴露为工具",
                },
                {
                  to: "/gateway-test",
                  icon: Activity,
                  tone: "bg-amber-500/10 text-amber-600",
                  label: "网关测试",
                  desc: "验证工具调用链路",
                },
              ].map((a) => (
                <NavLink
                  key={a.label}
                  to={a.to}
                  className="group flex items-center gap-3 rounded-xl px-2 py-2.5 transition-all hover:bg-white/50"
                >
                  <span
                    className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${a.tone} ring-1 ring-white/50`}
                  >
                    <a.icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-900">
                      {a.label}
                    </span>
                    <span className="block truncate text-xs text-slate-500">
                      {a.desc}
                    </span>
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5" />
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  )
}
