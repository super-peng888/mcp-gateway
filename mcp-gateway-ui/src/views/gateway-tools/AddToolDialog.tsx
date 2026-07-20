import { useEffect, useMemo, useState, type Key } from "react"
import { AlertCircle, Loader2, Wrench } from "lucide-react"
import { Button, Table } from "antd"
import type { TableProps } from "antd"
import type { TableRowSelection } from "antd/es/table/interface"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { enableTool, listGroups } from "@/api/registry"
import { methodBadgeVariant } from "../protocol-config/protocol-config.data"

interface EndpointRow {
  key: string
  endpointId: number
  groupName: string
  baseUrl: string
  method: string
  path: string
  name: string
  description: string
  enabled: boolean
}

interface AddToolDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

const columns: TableProps<EndpointRow>["columns"] = [
  {
    title: "Method",
    dataIndex: "method",
    width: 90,
    render: (m: string) => {
      const variant = methodBadgeVariant[m] || methodBadgeVariant.GET
      return (
        <span
          className={`text-[11px] font-bold uppercase tracking-wide ${variant.className}`}
        >
          {m}
        </span>
      )
    },
  },
  {
    title: "Path",
    dataIndex: "path",
    render: (v: string) => (
      <span className="font-mono text-sm text-on-surface">{v}</span>
    ),
  },
  {
    title: "Name",
    dataIndex: "name",
    render: (v: string) => <span className="text-sm text-on-surface">{v}</span>,
  },
  {
    title: "Group",
    dataIndex: "groupName",
    width: 140,
    render: (v: string) => (
      <span className="text-sm text-on-surface-variant">{v}</span>
    ),
  },
  {
    title: "Description",
    dataIndex: "description",
    ellipsis: true,
    render: (v: string) => (
      <span className="text-sm text-on-surface-variant">{v}</span>
    ),
  },
  {
    title: "Status",
    key: "status",
    width: 90,
    align: "center",
    render: (_, row) =>
      row.enabled ? (
        <span className="inline-flex rounded-full border border-outline-variant/50 bg-surface px-2 py-0.5 text-[11px] text-on-surface-variant">
          已启用
        </span>
      ) : null,
  },
]

export function AddToolDialog({
  open,
  onOpenChange,
  onSuccess,
}: AddToolDialogProps) {
  const [rows, setRows] = useState<EndpointRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState("")
  const [selectedKeys, setSelectedKeys] = useState<Key[]>([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    listGroups()
      .then((res) => {
        if (cancelled) return
        setRows(
          res.data.flatMap((group) =>
            group.endpoints.map((endpoint) => ({
              key: String(endpoint.id),
              endpointId: endpoint.id ?? 0,
              groupName: group.name,
              baseUrl: group.baseUrl,
              method: endpoint.method,
              path: endpoint.path,
              name: endpoint.name,
              description: endpoint.description,
              enabled: endpoint.enabled ?? false,
            }))
          )
        )
      })
      .catch(() => {
        if (!cancelled) setError("The backend may be unavailable.")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open])

  const filteredRows = useMemo(() => {
    if (!filter.trim()) return rows
    const term = filter.toLowerCase()
    return rows.filter(
      (row) =>
        row.path.toLowerCase().includes(term) ||
        row.name.toLowerCase().includes(term) ||
        row.groupName.toLowerCase().includes(term) ||
        row.method.toLowerCase().includes(term)
    )
  }, [rows, filter])

  const selected =
    selectedKeys.length > 0
      ? rows.find((row) => row.key === String(selectedKeys[0]))
      : undefined

  const rowSelection: TableRowSelection<EndpointRow> = {
    type: "radio",
    selectedRowKeys: selectedKeys,
    onChange: (keys) => setSelectedKeys(keys),
    getCheckboxProps: (row) => ({ disabled: row.enabled }),
  }

  const handleAdd = async () => {
    if (!selected) return
    setSubmitting(true)
    try {
      await enableTool(selected.endpointId)
      onSuccess()
      onOpenChange(false)
    } catch {
      alert("Add failed. The backend may be unavailable.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!flex max-h-[90vh] max-w-[calc(100%-2rem)] !flex-col !gap-0 overflow-hidden p-0 sm:max-w-[70vw]">
        <DialogHeader className="shrink-0 px-5 pt-3 pb-2">
          <div className="flex items-center gap-2">
            <Wrench className="size-5 text-primary" />
            <DialogTitle>Add MCP Tool</DialogTitle>
          </div>
          <DialogDescription>
            Select one interface to expose as an MCP tool.
          </DialogDescription>
        </DialogHeader>

        {!loading && !error && rows.length > 0 && (
          <div className="shrink-0 border-y border-border bg-surface-container-low/40 px-5 py-3">
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter by path, name, group or method..."
              className="h-9 w-full rounded-full border border-outline-variant/50 bg-surface px-4 text-sm text-on-surface outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
            />
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-auto px-5 py-3">
          {loading && (
            <div className="flex h-40 items-center justify-center gap-2 text-on-surface-variant">
              <Loader2 className="size-5 animate-spin" />
              Loading interfaces...
            </div>
          )}

          {error && !loading && (
            <div className="flex h-40 flex-col items-center justify-center gap-2 text-error">
              <AlertCircle className="size-6" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {!loading && !error && (
            <Table<EndpointRow>
              rowKey="key"
              size="small"
              rowSelection={rowSelection}
              rowClassName={(row) => (row.enabled ? "opacity-40" : "")}
              dataSource={filteredRows}
              columns={columns}
              pagination={{
                pageSize: 10,
                size: "small",
                showSizeChanger: false,
              }}
              scroll={{ y: 320 }}
              locale={{
                emptyText:
                  rows.length === 0
                    ? "No interfaces found. Import an OpenAPI document in Protocol Config first."
                    : "No interfaces match the filter.",
              }}
            />
          )}
        </div>

        <DialogFooter className="!mx-0 !mb-0 shrink-0 items-center justify-end border-t border-border px-5 py-3">
          <Button onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            type="primary"
            disabled={!selected || submitting}
            onClick={handleAdd}
          >
            {submitting ? "Adding..." : "Add Tool"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
