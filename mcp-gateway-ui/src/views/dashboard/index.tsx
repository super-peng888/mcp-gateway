import { useEffect, useState } from "react"
import { NavLink, useNavigate } from "react-router-dom"
import {
  Activity,
  ArrowRight,
  Radio,
  Server,
  Wrench,
} from "lucide-react"
import { Button } from "antd"
import { listServers } from "@/api/servers"
import { listTools } from "@/api/tools"
import type { McpServer, ToolView } from "@/api/types"
import { CopyButton } from "@/components/CopyButton"
import { EmptyState } from "@/components/EmptyState"
import { PageContainer } from "@/components/PageContainer"
import { PageHeader } from "@/components/PageHeader"
import { buildMcpEndpointUrl, transportLabel } from "@/lib/mcp"

interface StatDef {
  label: string
  value: string | number
  icon: typeof Server
  tone: string
}

export function Dashboard() {
  const navigate = useNavigate()
  const [servers, setServers] = useState<McpServer[]>([])
  const [tools, setTools] = useState<ToolView[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    Promise.all([listServers(), listTools()])
      .then(([s, t]) => {
        if (cancelled) return
        setServers(s.data)
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

  const stats: StatDef[] = [
    { label: "MCP 服务", value: servers.length, icon: Server, tone: "bg-blue-500/10 text-blue-600" },
    {
      label: "启用服务",
      value: servers.filter((s) => s.enabled !== false).length,
      icon: Radio,
      tone: "bg-emerald-500/10 text-emerald-600",
    },
    { label: "工具总数", value: tools.length, icon: Wrench, tone: "bg-violet-500/10 text-violet-600" },
    { label: "协议", value: "SSE / HTTP", icon: Activity, tone: "bg-amber-500/10 text-amber-600" },
  ]

  return (
    <PageContainer>
      <PageHeader
        title="工作台"
        description="查看 MCP 服务、工具状态与网关接入信息"
      />

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="glass glass-hover flex items-center justify-between rounded-2xl p-5"
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
        {/* Servers overview */}
        <div className="glass flex flex-col rounded-2xl lg:col-span-2">
          <div className="flex items-center justify-between border-b border-white/40 px-5 py-4">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-slate-900">
                MCP 服务概览
              </h3>
              <span className="rounded-full bg-white/60 px-2 py-0.5 text-xs font-semibold text-slate-500 ring-1 ring-white/50">
                {servers.length}
              </span>
            </div>
            <NavLink
              to="/mcp-servers"
              className="flex items-center gap-1 text-sm font-semibold text-blue-600 transition-opacity hover:opacity-75"
            >
              查看全部 <ArrowRight className="size-3.5" />
            </NavLink>
          </div>

          <div className="flex-1">
            {servers.length === 0 && !loading ? (
              <EmptyState
                icon={<Server className="size-6" />}
                title="暂无 MCP 服务"
                description="创建 MCP Server 后，其端点与工具将展示在这里"
                action={
                  <Button type="primary" onClick={() => navigate("/mcp-servers")}>
                    前往 MCP 服务
                  </Button>
                }
              />
            ) : (
              servers.map((s, idx) => (
                <button
                  key={s.id ?? s.name}
                  onClick={() => navigate("/mcp-servers")}
                  className={`flex w-full items-center justify-between gap-4 px-5 py-3.5 text-left transition-colors hover:bg-white/40 ${
                    idx > 0 ? "border-t border-white/40" : ""
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 ring-1 ring-white/50">
                      <Server className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {s.name}
                        </p>
                        <span className="shrink-0 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-600 ring-1 ring-white/50">
                          {transportLabel[s.transport]}
                        </span>
                      </div>
                      <p className="truncate font-mono text-xs text-slate-500">
                        {s.baseUrl}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="rounded-full bg-white/60 px-2 py-0.5 text-xs font-semibold text-slate-500 ring-1 ring-white/50">
                      {s.tools?.length ?? 0} 工具
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-white/50 ${
                        s.enabled !== false
                          ? "bg-emerald-500/10 text-emerald-600"
                          : "bg-white/60 text-slate-500"
                      }`}
                    >
                      {s.enabled !== false ? "启用" : "停用"}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          {/* MCP connection info */}
          <div className="glass rounded-2xl p-5">
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

            {servers.length === 0 && !loading ? (
              <EmptyState
                icon={<Radio className="size-6" />}
                title="暂无 MCP 端点"
                description="创建 MCP Server 后，这里会列出各服务的接入地址"
                tone="bg-emerald-500/10 text-emerald-600"
                action={
                  <Button
                    type="primary"
                    size="small"
                    onClick={() => navigate("/mcp-servers")}
                  >
                    去创建
                  </Button>
                }
              />
            ) : (
              <div className="mt-4 flex flex-col gap-3">
                {servers.map((s) => {
                  const url = buildMcpEndpointUrl(s)
                  return (
                    <div key={s.id ?? s.name}>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-medium text-slate-500">
                          {s.name}
                        </p>
                        <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-600 ring-1 ring-white/50">
                          {transportLabel[s.transport]}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 rounded-lg border border-white/50 bg-white/50 px-3 py-2 backdrop-blur-sm">
                        <span className="flex-1 truncate font-mono text-xs text-slate-900">
                          {url}
                        </span>
                        <CopyButton text={url} title="复制接入地址" />
                      </div>
                    </div>
                  )
                })}
                <p className="text-xs leading-relaxed text-slate-500">
                  在 MCP 客户端（如 Claude Desktop、Cherry
                  Studio）中以对应地址接入，即可调用该服务下的工具。
                </p>
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div className="glass rounded-2xl p-5">
            <h3 className="text-base font-semibold text-slate-900">快捷操作</h3>
            <div className="mt-3 flex flex-col gap-1">
              {[
                {
                  to: "/mcp-servers",
                  icon: Server,
                  tone: "bg-blue-500/10 text-blue-600",
                  label: "新建 MCP 服务",
                  desc: "聚合下游 REST 接口",
                },
                {
                  to: "/gateway-tools",
                  icon: Wrench,
                  tone: "bg-violet-500/10 text-violet-600",
                  label: "配置 MCP 工具",
                  desc: "手动新增或 OpenAPI 导入",
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
