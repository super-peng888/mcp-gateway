import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { AlertCircle, Plus, Server, Trash2, Wrench } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "antd"
import { DataTable } from "@/components/DataTable"
import { EmptyState } from "@/components/EmptyState"
import { PageContainer } from "@/components/PageContainer"
import { PageHeader } from "@/components/PageHeader"
import { StatChip } from "@/components/StatChip"
import { useTable } from "@/hooks/useTable"
import { deleteServer, updateServer } from "@/api/servers"
import type { McpServer } from "@/api/types"
import { buildMcpEndpointUrl, copyText } from "@/lib/mcp"
import { fetchMcpServers } from "./mcp-servers.api"
import {
  createColumns,
  createContextMenuItems,
  searchFormSchema,
} from "./mcp-servers.data"
import { ServerDialog } from "./ServerDialog"

export function McpServers() {
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<McpServer | null>(null)
  const [stats, setStats] = useState({ servers: 0, tools: 0 })

  // columns 需要在 useTable 之前创建，而列内 Switch 又要触发 reload，
  // 这里用 ref 桥接，避免在 useTable 声明前引用 reload。
  const reloadRef = useRef<() => void>(() => {})

  // Stats come from the full filtered result; useTable's onAfterFetch only
  // receives the current page slice after client-side pagination.
  const fetchServers = useCallback(
    async (params: Parameters<typeof fetchMcpServers>[0]) => {
      const servers = await fetchMcpServers(params)
      setStats({
        servers: servers.length,
        tools: servers.reduce((acc, s) => acc + (s.tools?.length ?? 0), 0),
      })
      return servers
    },
    []
  )

  const handleToggleEnabled = useCallback(async (server: McpServer) => {
    if (server.id == null) return
    try {
      // PUT 为全量覆盖且不含 tools：剥离 tools 后提交完整 Server 字段
      const { tools: _tools, ...body } = server
      await updateServer(server.id, {
        ...body,
        enabled: !(server.enabled ?? true),
      })
      reloadRef.current()
    } catch {
      alert("更新失败，后端服务可能不可用")
    }
  }, [])

  const tableColumns = useMemo(
    () => createColumns({ onToggleEnabled: handleToggleEnabled }),
    [handleToggleEnabled]
  )

  const {
    registerTable,
    actions: { reload, setContextMenuItems, clearSelection },
    error,
    selectedRowKeys,
  } = useTable<McpServer, { name: string; baseUrl: string }>({
    columns: tableColumns,
    rowKey: (s) => s.id ?? s.name,
    fetcher: fetchServers,
    defaultSort: { field: "name", order: "ascend" },
    searchFormSchema,
    scroll: { y: "100%" },
    emptyText: (
      <EmptyState
        icon={<Server className="size-6" />}
        title="还没有 MCP Server"
        description="创建一个 MCP Server，聚合下游 REST 接口并暴露为 MCP 端点"
        action={
          <Button
            type="primary"
            size="small"
            icon={<Plus className="size-3.5" />}
            onClick={() => setCreateOpen(true)}
          >
            New Server
          </Button>
        }
      />
    ),
  })

  useEffect(() => {
    reloadRef.current = reload
  }, [reload])

  const handleEdit = useCallback((server: McpServer) => {
    setEditing(server)
  }, [])

  const handleCopyEndpoint = useCallback(async (server: McpServer) => {
    const url = buildMcpEndpointUrl(server)
    const ok = await copyText(url)
    if (!ok) alert(`复制失败，请手动复制：${url}`)
  }, [])

  const handleDelete = useCallback(
    async (server: McpServer) => {
      if (server.id == null) return
      const toolCount = server.tools?.length ?? 0
      if (
        !confirm(
          `确定删除 Server "${server.name}" 吗？其下 ${toolCount} 个工具将被一并删除。`
        )
      )
        return
      try {
        await deleteServer(server.id)
        reload()
      } catch {
        alert("删除失败，后端服务可能不可用")
      }
    },
    [reload]
  )

  const handleBatchDelete = useCallback(
    async (selectedKeys: React.Key[]) => {
      if (selectedKeys.length === 0) return
      if (
        !confirm(
          `确定删除选中的 ${selectedKeys.length} 个 Server 吗？其下工具将被一并删除。`
        )
      )
        return
      try {
        await Promise.all(selectedKeys.map((id) => deleteServer(Number(id))))
        clearSelection()
        reload()
      } catch {
        alert("批量删除失败，后端服务可能不可用")
      }
    },
    [clearSelection, reload]
  )

  const contextMenuItems = useMemo(
    () =>
      createContextMenuItems({
        handleEdit,
        handleCopyEndpoint,
        handleDelete,
      }),
    [handleEdit, handleCopyEndpoint, handleDelete]
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
        title="MCP 服务"
        description="管理 MCP Server：每个 Server 聚合一组下游 REST 接口，并以独立端点对外提供 MCP 服务"
        extra={
          <>
            <StatChip
              icon={<Server className="size-4" />}
              value={stats.servers}
              label="MCP 服务"
              tone="bg-blue-500/10 text-blue-700"
            />
            <StatChip
              icon={<Wrench className="size-4" />}
              value={stats.tools}
              label="工具总数"
              tone="bg-violet-500/10 text-violet-700"
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
                New Server
              </Button>
              <Button
                type="primary"
                danger
                size="small"
                icon={<Trash2 className="size-3.5" />}
                disabled={selectedRowKeys.length === 0}
                onClick={() => handleBatchDelete(selectedRowKeys)}
              >
                批量删除
              </Button>
            </>
          ),
        }}
      />

      <ServerDialog
        key={editing ? `edit-${editing.id}` : `new-${String(createOpen)}`}
        open={createOpen || editing !== null}
        server={editing}
        onOpenChange={(open) => {
          if (!open) {
            setCreateOpen(false)
            setEditing(null)
          }
        }}
        onSuccess={reload}
      />
    </PageContainer>
  )
}
