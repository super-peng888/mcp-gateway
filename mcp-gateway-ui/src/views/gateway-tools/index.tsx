import { useCallback, useEffect, useMemo, useState } from "react"
import { AlertCircle, Library, Plus, Wrench } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "antd"
import { DataTable } from "@/components/DataTable"
import { EmptyState } from "@/components/EmptyState"
import { PageContainer } from "@/components/PageContainer"
import { PageHeader } from "@/components/PageHeader"
import { StatChip } from "@/components/StatChip"
import { useTable } from "@/hooks/useTable"
import { disableTool } from "@/api/registry"
import { fetchGatewayTools } from "./gateway-tools.api"
import {
  columns,
  createContextMenuItems,
  searchFormSchema,
  type GatewayTool,
} from "./gateway-tools.data"
import { AddToolDialog } from "./AddToolDialog"

export function GatewayTools() {
  const [addOpen, setAddOpen] = useState(false)
  const [stats, setStats] = useState({ tools: 0, groups: 0 })

  // Stats come from the full filtered result; useTable's onAfterFetch only
  // receives the current page slice after client-side pagination.
  const fetchTools = useCallback(
    async (params: Parameters<typeof fetchGatewayTools>[0]) => {
      const tools = await fetchGatewayTools(params)
      setStats({
        tools: tools.length,
        groups: new Set(tools.map((t) => t.groupName)).size,
      })
      return tools
    },
    []
  )

  const {
    registerTable,
    actions: { reload, setContextMenuItems },
    error,
  } = useTable<GatewayTool, { toolName: string; groupName: string }>({
    columns,
    rowKey: "id",
    fetcher: fetchTools,
    defaultSort: { field: "toolName", order: "ascend" },
    searchFormSchema,
    emptyText: (
      <EmptyState
        icon={<Wrench className="size-6" />}
        title="还没有 MCP 工具"
        description="从接口库中选择接口，将其暴露为可被 AI 调用的 MCP 工具"
        action={
          <Button
            type="primary"
            size="small"
            icon={<Plus className="size-3.5" />}
            onClick={() => setAddOpen(true)}
          >
            新增工具
          </Button>
        }
        tone="bg-violet-500/10 text-violet-600"
      />
    ),
  })

  const handleRemove = useCallback(
    async (tool: GatewayTool) => {
      if (
        !confirm(
          `确定移除工具 "${tool.toolName}" 吗？移除后 MCP 客户端将无法再调用它。`
        )
      )
        return
      try {
        await disableTool(tool.id)
        reload()
      } catch {
        alert("Remove failed. The backend may be unavailable.")
      }
    },
    [reload]
  )

  const contextMenuItems = useMemo(
    () => createContextMenuItems({ handleRemove, reload }),
    [handleRemove, reload]
  )

  useEffect(() => {
    setContextMenuItems(contextMenuItems)
  }, [setContextMenuItems, contextMenuItems])

  return (
    <PageContainer>
      {error && (
        <Alert className="rounded-2xl border border-red-500/20 bg-red-500/10 text-red-600 backdrop-blur-md">
          <AlertCircle className="size-5" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <PageHeader
        title="MCP 工具"
        description="已暴露为 MCP 工具的接口，AI 客户端可通过网关调用"
        extra={
          <>
            <StatChip
              icon={<Wrench className="size-4" />}
              value={stats.tools}
              label="MCP 工具"
              tone="bg-violet-500/10 text-violet-700"
            />
            <StatChip
              icon={<Library className="size-4" />}
              value={stats.groups}
              label="覆盖分组"
              tone="bg-blue-500/10 text-blue-700"
            />
          </>
        }
      />

      <DataTable
        register={registerTable}
        slots={{
          leftToolBar: (
            <Button
              type="primary"
              size="small"
              icon={<Plus className="size-3.5" />}
              onClick={() => setAddOpen(true)}
            >
              新增
            </Button>
          ),
        }}
      />

      <AddToolDialog
        key={String(addOpen)}
        open={addOpen}
        onOpenChange={setAddOpen}
        onSuccess={reload}
      />
    </PageContainer>
  )
}
