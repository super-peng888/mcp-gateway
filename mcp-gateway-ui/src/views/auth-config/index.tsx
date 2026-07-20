import { useCallback, useMemo, useState } from "react"
import { AlertCircle, Search, Shield } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "antd"
import type { TableProps } from "antd"
import { DataTable } from "@/components/DataTable"
import { EmptyState } from "@/components/EmptyState"
import { PageContainer } from "@/components/PageContainer"
import { PageHeader } from "@/components/PageHeader"
import { useTable, type SearchField } from "@/hooks/useTable"
import { listGroups, type ApiGroup } from "@/api/registry"
import { GroupAuthDialog } from "./GroupAuthDialog"

type AuthConfigSearch = { name: string }

const authTypeBadge: Record<string, { label: string; className: string }> = {
  NONE: {
    label: "无认证",
    className: "bg-white/60 text-slate-500 border border-white/50",
  },
  BEARER: {
    label: "Bearer Token",
    className: "bg-blue-500/10 text-blue-700 border border-blue-500/20",
  },
  BASIC: {
    label: "Basic Auth",
    className: "bg-violet-500/10 text-violet-700 border border-violet-500/20",
  },
  API_KEY: {
    label: "API Key",
    className: "bg-amber-500/10 text-amber-700 border border-amber-500/20",
  },
}

function normalizeAuthType(value?: string | null): string {
  const t = (value ?? "").toUpperCase()
  return t in authTypeBadge ? t : "NONE"
}

const searchFormSchema: SearchField<AuthConfigSearch>[] = [
  {
    key: "name",
    label: "分组名",
    placeholder: "搜索分组名...",
    icon: <Search className="size-4" />,
  },
]

export function AuthConfig() {
  const [editingGroup, setEditingGroup] = useState<ApiGroup | null>(null)

  const fetchGroups = useCallback(
    async ({ search }: { search: AuthConfigSearch }) => {
      const res = await listGroups()
      const term = search.name.trim().toLowerCase()
      if (!term) return res.data
      return res.data.filter((g) => g.name.toLowerCase().includes(term))
    },
    []
  )

  const columns = useMemo<TableProps<ApiGroup>["columns"]>(
    () => [
      {
        title: "分组名",
        dataIndex: "name",
        key: "name",
        render: (v: string) => (
          <span className="font-semibold text-[#111827]">{v}</span>
        ),
      },
      {
        title: "Base URL",
        dataIndex: "baseUrl",
        key: "baseUrl",
        render: (v: string) => (
          <span className="font-mono text-[12px] text-[#6b7280]">{v}</span>
        ),
      },
      {
        title: "接口数",
        key: "endpoints",
        width: 100,
        render: (_, group) => (
          <span className="text-[12px] text-[#6b7280]">
            {group.endpoints.length} 个接口
          </span>
        ),
      },
      {
        title: "认证方式",
        key: "authType",
        width: 130,
        render: (_, group) => {
          const variant = authTypeBadge[normalizeAuthType(group.authType)]
          return (
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${variant.className}`}
            >
              {variant.label}
            </span>
          )
        },
      },
      {
        title: "操作",
        key: "actions",
        width: 80,
        align: "center",
        render: (_, group) => (
          <Button
            type="link"
            size="small"
            onClick={() => setEditingGroup(group)}
          >
            配置
          </Button>
        ),
      },
    ],
    []
  )

  const {
    registerTable,
    actions: { reload },
    error,
  } = useTable<ApiGroup, AuthConfigSearch>({
    columns,
    rowKey: (g) => g.id ?? g.name,
    fetcher: fetchGroups,
    searchFormSchema,
    emptyText: (
      <EmptyState
        icon={<Shield className="size-6" />}
        title="暂无接口分组"
        description="先在接口库导入 OpenAPI 文档"
      />
    ),
  })

  return (
    <PageContainer>
      {error && (
        <Alert className="rounded-2xl border border-red-500/20 bg-red-500/10 text-red-600 backdrop-blur-md">
          <AlertCircle className="size-5" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <PageHeader
        title="权限配置"
        description="为接口分组配置下游认证凭证，网关调用时自动携带，凭证不会暴露给 MCP 客户端"
      />

      <DataTable register={registerTable} />

      <GroupAuthDialog
        key={
          editingGroup ? String(editingGroup.id ?? editingGroup.name) : "closed"
        }
        group={editingGroup}
        onOpenChange={(open) => !open && setEditingGroup(null)}
        onSuccess={reload}
      />
    </PageContainer>
  )
}
