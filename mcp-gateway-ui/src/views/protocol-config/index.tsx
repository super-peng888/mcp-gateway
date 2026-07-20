import { useCallback, useEffect, useMemo, useState } from "react"
import { AlertCircle, Braces, Library, Trash2, Upload } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "antd"
import { DataTable } from "@/components/DataTable"
import { EmptyState } from "@/components/EmptyState"
import { PageContainer } from "@/components/PageContainer"
import { PageHeader } from "@/components/PageHeader"
import { StatChip } from "@/components/StatChip"
import { useTable } from "@/hooks/useTable"
import { createGroup, deleteGroup, type ApiGroup } from "@/api/registry"
import { fetchProtocolGroups } from "./protocol-config.api"
import {
  columns,
  createContextMenuItems,
  searchFormSchema,
} from "./protocol-config.data"
import { ProtocolImportDialog } from "./ProtocolImportDialog"
import { GroupDetailDialog } from "./GroupDetailDialog"

export function ProtocolConfig() {
  const [importOpen, setImportOpen] = useState(false)
  const [detailGroup, setDetailGroup] = useState<ApiGroup | null>(null)
  const [stats, setStats] = useState({ groups: 0, endpoints: 0 })

  // Stats come from the full filtered result; useTable's onAfterFetch only
  // receives the current page slice after client-side pagination.
  const fetchGroups = useCallback(
    async (params: Parameters<typeof fetchProtocolGroups>[0]) => {
      const groups = await fetchProtocolGroups(params)
      setStats({
        groups: groups.length,
        endpoints: groups.reduce((acc, g) => acc + g.endpoints.length, 0),
      })
      return groups
    },
    []
  )

  const {
    registerTable,
    actions: { reload, setContextMenuItems, clearSelection },
    error,
    selectedRowKeys,
  } = useTable<ApiGroup, { id: string; url: string; description: string }>({
    columns,
    rowKey: (g) => g.id ?? g.name,
    fetcher: fetchGroups,
    defaultSort: { field: "name", order: "ascend" },
    searchFormSchema,
    scroll: { y: "100%" },
    onRow: (group) => ({
      onClick: () => setDetailGroup(group),
      style: { cursor: "pointer" },
    }),
    emptyText: (
      <EmptyState
        icon={<Library className="size-6" />}
        title="接口库为空"
        description="导入 OpenAPI / Swagger JSON 文档，开始构建你的接口库"
        action={
          <Button
            type="primary"
            size="small"
            icon={<Upload className="size-3.5" />}
            onClick={() => setImportOpen(true)}
          >
            导入接口文档
          </Button>
        }
      />
    ),
  })

  const handleDelete = useCallback(
    async (id?: number) => {
      if (!id) return
      if (!confirm("Are you sure you want to delete this API group?")) return
      try {
        await deleteGroup(id)
        reload()
      } catch {
        alert("Delete failed. The backend may be unavailable.")
      }
    },
    [reload]
  )

  const handleBatchDelete = useCallback(
    async (selectedKeys: React.Key[]) => {
      if (selectedKeys.length === 0) return
      if (
        !confirm(
          `Are you sure you want to delete ${selectedKeys.length} selected API group(s)?`
        )
      )
        return
      try {
        await Promise.all(selectedKeys.map((id) => deleteGroup(Number(id))))
        clearSelection()
        reload()
      } catch {
        alert("Batch delete failed. The backend may be unavailable.")
      }
    },
    [clearSelection, reload]
  )

  const openImport = useCallback(() => {
    setImportOpen(true)
  }, [])

  const handleImport = useCallback(
    async (draft: ApiGroup) => {
      try {
        await createGroup(draft)
        reload()
      } catch {
        alert("Import failed. The backend may be unavailable.")
      }
    },
    [reload]
  )

  const contextMenuItems = useMemo(
    () =>
      createContextMenuItems({
        handleDelete,
        handleImport: openImport,
        reload,
      }),
    [handleDelete, openImport, reload]
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
        title="接口库"
        description="导入并管理 REST 接口文档，选择接口暴露为 MCP 工具"
        extra={
          <>
            <StatChip
              icon={<Library className="size-4" />}
              value={stats.groups}
              label="接口分组"
              tone="bg-blue-500/10 text-blue-700"
            />
            <StatChip
              icon={<Braces className="size-4" />}
              value={stats.endpoints}
              label="接口总数"
              tone="bg-emerald-500/10 text-emerald-700"
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
                danger
                size="small"
                icon={<Trash2 className="size-3.5" />}
                disabled={selectedRowKeys.length === 0}
                onClick={() => handleBatchDelete(selectedRowKeys)}
              >
                批量删除
              </Button>
              <Button
                size="small"
                icon={<Upload className="size-3.5" />}
                onClick={openImport}
              >
                导入
              </Button>
            </>
          ),
        }}
      />
      <ProtocolImportDialog
        key={String(importOpen)}
        open={importOpen}
        onOpenChange={setImportOpen}
        onImport={handleImport}
      />
      <GroupDetailDialog
        group={detailGroup}
        onOpenChange={(open) => !open && setDetailGroup(null)}
      />
    </PageContainer>
  )
}
