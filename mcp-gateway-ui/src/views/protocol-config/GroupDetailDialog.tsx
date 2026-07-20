import { Layers } from "lucide-react"
import { Table } from "antd"
import type { TableProps } from "antd"
import { Button } from "antd"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { ApiEndpoint, ApiGroup, ApiParameter } from "@/api/registry"
import { methodBadgeVariant } from "./protocol-config.data"

interface GroupDetailDialogProps {
  group: ApiGroup | null
  onOpenChange: (open: boolean) => void
}

const endpointColumns: TableProps<ApiEndpoint>["columns"] = [
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
    title: "Description",
    dataIndex: "description",
    ellipsis: true,
    render: (v: string) => (
      <span className="text-sm text-on-surface-variant">{v}</span>
    ),
  },
  {
    title: "Params",
    key: "params",
    width: 80,
    align: "center",
    render: (_, endpoint) => (
      <span className="text-sm text-on-surface-variant">
        {endpoint.parameters.length}
      </span>
    ),
  },
]

const parameterColumns: TableProps<ApiParameter>["columns"] = [
  {
    title: "Name",
    dataIndex: "name",
    render: (v: string) => (
      <span className="font-mono text-xs text-on-surface">{v}</span>
    ),
  },
  {
    title: "In",
    dataIndex: "type",
    width: 90,
    render: (v: string) => (
      <span className="inline-flex rounded-md bg-surface-container-high px-2 py-0.5 text-xs font-semibold text-on-surface">
        {v}
      </span>
    ),
  },
  {
    title: "Required",
    dataIndex: "required",
    width: 100,
    render: (v: boolean) =>
      v ? (
        <span className="text-xs font-semibold text-error">Yes</span>
      ) : (
        <span className="text-xs text-on-surface-variant">No</span>
      ),
  },
  {
    title: "Description",
    dataIndex: "description",
    ellipsis: true,
    render: (v: string) => (
      <span className="text-xs text-on-surface-variant">{v}</span>
    ),
  },
  {
    title: "Default",
    dataIndex: "defaultValue",
    width: 140,
    render: (v: string) => (
      <span className="font-mono text-xs text-on-surface-variant">
        {v || "—"}
      </span>
    ),
  },
]

export function GroupDetailDialog({
  group,
  onOpenChange,
}: GroupDetailDialogProps) {
  return (
    <Dialog open={group !== null} onOpenChange={onOpenChange}>
      <DialogContent className="!flex max-h-[90vh] max-w-[calc(100%-2rem)] !flex-col !gap-0 overflow-hidden p-0 sm:max-w-[70vw]">
        <DialogHeader className="shrink-0 px-5 pt-3 pb-2">
          <div className="flex items-center gap-2">
            <Layers className="size-5 text-primary" />
            <DialogTitle>{group?.name}</DialogTitle>
          </div>
          <DialogDescription className="flex flex-col gap-1">
            <span className="font-mono text-xs">{group?.baseUrl}</span>
            {group?.description && <span>{group.description}</span>}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-auto px-5 py-3">
          <Table<ApiEndpoint>
            rowKey={(endpoint) => String(endpoint.id ?? endpoint.name)}
            size="small"
            columns={endpointColumns}
            dataSource={group?.endpoints ?? []}
            pagination={{
              pageSize: 10,
              size: "small",
              showSizeChanger: false,
            }}
            expandable={{
              expandedRowRender: (endpoint) =>
                endpoint.parameters.length > 0 ? (
                  <Table<ApiParameter>
                    rowKey={(param) => `${param.type}:${param.name}`}
                    size="small"
                    columns={parameterColumns}
                    dataSource={endpoint.parameters}
                    pagination={false}
                  />
                ) : (
                  <div className="py-2 text-sm text-on-surface-variant">
                    No parameters
                  </div>
                ),
            }}
          />
        </div>

        <DialogFooter className="!mx-0 !mb-0 shrink-0 items-center justify-end border-t border-border px-5 py-3">
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
