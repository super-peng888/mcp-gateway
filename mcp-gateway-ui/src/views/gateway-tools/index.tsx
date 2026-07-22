import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { AlertCircle, Plus, Server, Upload, Wrench } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "antd"
import { DataTable } from "@/components/DataTable"
import { EmptyState } from "@/components/EmptyState"
import { PageContainer } from "@/components/PageContainer"
import { PageHeader } from "@/components/PageHeader"
import { StatChip } from "@/components/StatChip"
import { useTable } from "@/hooks/useTable"
import { deleteTool, updateTool } from "@/api/tools"
import type { ToolView } from "@/api/types"
import { fetchGatewayTools } from "./gateway-tools.api"
import {
  createColumns,
  createContextMenuItems,
  searchFormSchema,
} from "./gateway-tools.data"
import { ToolDialog } from "./ToolDialog"
import { ToolImportDialog } from "./ToolImportDialog"

export function GatewayTools() {
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<ToolView | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [stats, setStats] = useState({ tools: 0, servers: 0 })

  // columns 需要在 useTable 之前创建，而列内 Switch 又要触发 reload，
  // 这里用 ref 桥接，避免在 useTable 声明前引用 reload。
  const reloadRef = useRef<() => void>(() => {})

  // Stats come from the full filtered result; useTable's onAfterFetch only
  // receives the current page slice after client-side pagination.
  const fetchTools = useCallback(
    async (params: Parameters<typeof fetchGatewayTools>[0]) => {
      const tools = await fetchGatewayTools(params)
      setStats({
        tools: tools.length,
        servers: new Set(tools.map((t) => t.serverName)).size,
      })
      return tools
    },
    []
  )

  const handleToggleEnabled = useCallback(async (tool: ToolView) => {
    try {
      // PUT 全量提交完整工具对象
      await updateTool(tool.id, {
        id: tool.id,
        name: tool.name,
        method: tool.method,
        path: tool.path,
        description: tool.description,
        enabled: !tool.enabled,
        parameters: tool.parameters,
      })
      reloadRef.current()
    } catch {
      alert("更新失败，后端服务可能不可用")
    }
  }, [])

  const handleEdit = useCallback((tool: ToolView) => {
    setEditing(tool)
  }, [])

  const tableColumns = useMemo(
    () => createColumns({ onToggleEnabled: handleToggleEnabled }),
    [handleToggleEnabled]
  )

  const {
    registerTable,
    actions: { reload, setContextMenuItems },
    error,
  } = useTable<ToolView, { toolName: string; serverName: string }>({
    columns: tableColumns,
    rowKey: "id",
    fetcher: fetchTools,
    defaultSort: { field: "name", order: "ascend" },
    searchFormSchema,
    emptyText: (
      <EmptyState
        icon={<Wrench className="size-6" />}
        title="还没有 MCP 工具"
        description="手动新增工具，或从 OpenAPI 文档批量导入到目标 Server"
        action={
          <Button
            type="primary"
            size="small"
            icon={<Plus className="size-3.5" />}
            onClick={() => setCreateOpen(true)}
          >
            新增工具
          </Button>
        }
        tone="bg-violet-500/10 text-violet-600"
      />
    ),
  })

  useEffect(() => {
    reloadRef.current = reload
  }, [reload])

  const handleDelete = useCallback(
    async (tool: ToolView) => {
      if (
        !confirm(
          `确定删除工具 "${tool.name}" 吗？删除后 MCP 客户端将无法再调用它。`
        )
      )
        return
      try {
        await deleteTool(tool.id)
        reload()
      } catch {
        alert("删除失败，后端服务可能不可用")
      }
    },
    [reload]
  )

  const contextMenuItems = useMemo(
    () => createContextMenuItems({ handleEdit, handleDelete }),
    [handleEdit, handleDelete]
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
        description="已暴露为 MCP 工具的后端接口，AI 客户端可通过网关调用"
        extra={
          <>
            <StatChip
              icon={<Wrench className="size-4" />}
              value={stats.tools}
              label="MCP 工具"
              tone="bg-violet-500/10 text-violet-700"
            />
            <StatChip
              icon={<Server className="size-4" />}
              value={stats.servers}
              label="覆盖 Server"
              tone="bg-blue-500/10 text-blue-700"
            />
          </>
        }
      />

      <DataTable
        register={registerTable}
        slots={{
          leftToolBar: (
            <>
              <Button
                type="primary"
                size="small"
                icon={<Plus className="size-3.5" />}
                onClick={() => setCreateOpen(true)}
              >
                手动新增
              </Button>
              <Button
                size="small"
                icon={<Upload className="size-3.5" />}
                onClick={() => setImportOpen(true)}
              >
                从 OpenAPI 导入
              </Button>
            </>
          ),
        }}
      />

      <ToolDialog
        key={editing ? `edit-${editing.id}` : `new-${String(createOpen)}`}
        open={createOpen || editing !== null}
        tool={editing}
        onOpenChange={(open) => {
          if (!open) {
            setCreateOpen(false)
            setEditing(null)
          }
        }}
        onSuccess={reload}
      />
      <ToolImportDialog
        key={String(importOpen)}
        open={importOpen}
        onOpenChange={setImportOpen}
        onSuccess={reload}
      />
    </PageContainer>
  )
}
