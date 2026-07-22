import type { TableProps } from "antd"
import { Copy, Link, Pencil, Search, Trash2 } from "lucide-react"
import type { SearchField } from "@/hooks/useTable"
import type { ContextMenuItemConfig } from "@/components/DataTable"
import { CopyButton } from "@/components/CopyButton"
import type { McpServer, TransportType } from "@/api/types"
import { buildMcpEndpointUrl, transportLabel } from "@/lib/mcp"
import { Switch } from "antd"

export type McpServerSearch = {
  name: string
  baseUrl: string
}

export const searchFormSchema: SearchField<McpServerSearch>[] = [
  {
    key: "name",
    label: "Name",
    placeholder: "Name...",
    icon: <Search className="size-4" />,
  },
  {
    key: "baseUrl",
    label: "Base URL",
    placeholder: "Base URL...",
    icon: <Link className="size-4" />,
  },
]

const transportBadgeVariant: Record<TransportType, string> = {
  STREAMABLE_HTTP:
    "inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold tracking-wide text-emerald-600 ring-1 ring-white/50 backdrop-blur-sm",
  SSE: "inline-flex items-center rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-[11px] font-bold tracking-wide text-blue-600 ring-1 ring-white/50 backdrop-blur-sm",
}

export interface McpServersColumnHandlers {
  onToggleEnabled: (server: McpServer) => void
}

export function createColumns({
  onToggleEnabled,
}: McpServersColumnHandlers): TableProps<McpServer>["columns"] {
  return [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (v: string) => (
        <span className="text-[12px] font-bold text-slate-900">{v}</span>
      ),
    },
    {
      title: "协议类型",
      dataIndex: "transport",
      key: "transport",
      width: 150,
      render: (v: TransportType) => (
        <span className={transportBadgeVariant[v]}>{transportLabel[v]}</span>
      ),
    },
    {
      title: "Endpoint URL",
      key: "endpoint",
      render: (_, server) => {
        const url = buildMcpEndpointUrl(server)
        return (
          <div className="flex items-center gap-1.5">
            <span
              className="max-w-[300px] truncate font-mono text-[12px] text-slate-500"
              title={url}
            >
              {url}
            </span>
            <CopyButton text={url} title="复制端点地址" />
          </div>
        )
      },
    },
    {
      title: "Base URL",
      dataIndex: "baseUrl",
      key: "baseUrl",
      render: (v: string) => (
        <span className="font-mono text-[12px] text-slate-500">{v}</span>
      ),
    },
    {
      title: "工具数",
      key: "tools",
      width: 90,
      align: "center",
      render: (_, server) => (
        <span className="text-[12px] text-slate-500">
          {server.tools?.length ?? 0}
        </span>
      ),
    },
    {
      title: "启用",
      dataIndex: "enabled",
      key: "enabled",
      width: 80,
      align: "center",
      render: (v: boolean | undefined, server) => (
        <Switch
          size="small"
          checked={v ?? true}
          onChange={() => onToggleEnabled(server)}
        />
      ),
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
      render: (v: string | undefined) => (
        <span className="text-on-surface-variant" title={v}>
          {v}
        </span>
      ),
    },
  ]
}

export interface McpServersMenuHandlers {
  handleEdit: (server: McpServer) => void
  handleCopyEndpoint: (server: McpServer) => void
  handleDelete: (server: McpServer) => void
}

export function createContextMenuItems({
  handleEdit,
  handleCopyEndpoint,
  handleDelete,
}: McpServersMenuHandlers): (
  record: McpServer
) => ContextMenuItemConfig<McpServer>[] {
  return (record) => [
    {
      key: "edit",
      label: "Edit",
      icon: <Pencil className="size-4" />,
      onClick: () => handleEdit(record),
    },
    {
      key: "copy-endpoint",
      label: "Copy Endpoint URL",
      icon: <Copy className="size-4" />,
      onClick: () => handleCopyEndpoint(record),
    },
    { key: "separator-1", separator: true },
    {
      key: "delete",
      label: "Delete",
      icon: <Trash2 className="size-4" />,
      onClick: () => handleDelete(record),
    },
  ]
}
