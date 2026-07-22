import type { TableProps } from "antd"
import { Pencil, Search, Server, Trash2 } from "lucide-react"
import { Switch } from "antd"
import type { SearchField } from "@/hooks/useTable"
import type { ContextMenuItemConfig } from "@/components/DataTable"
import type { ToolView } from "@/api/types"

export type GatewayToolSearch = {
  toolName: string
  serverName: string
}

export const methodBadgeVariant: Record<string, { className: string }> = {
  GET: {
    className:
      "inline-flex items-center rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-blue-600 ring-1 ring-white/50 backdrop-blur-sm",
  },
  POST: {
    className:
      "inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-emerald-600 ring-1 ring-white/50 backdrop-blur-sm",
  },
  PUT: {
    className:
      "inline-flex items-center rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-amber-600 ring-1 ring-white/50 backdrop-blur-sm",
  },
  DELETE: {
    className:
      "inline-flex items-center rounded-full border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-red-600 ring-1 ring-white/50 backdrop-blur-sm",
  },
  PATCH: {
    className:
      "inline-flex items-center rounded-full border border-violet-500/20 bg-violet-500/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-violet-600 ring-1 ring-white/50 backdrop-blur-sm",
  },
}

export const searchFormSchema: SearchField<GatewayToolSearch>[] = [
  {
    key: "toolName",
    label: "Tool Name",
    placeholder: "Tool Name...",
    icon: <Search className="size-4" />,
  },
  {
    key: "serverName",
    label: "Server",
    placeholder: "Server...",
    icon: <Server className="size-4" />,
  },
]

export interface GatewayToolsColumnHandlers {
  onToggleEnabled: (tool: ToolView) => void
}

export function createColumns({
  onToggleEnabled,
}: GatewayToolsColumnHandlers): TableProps<ToolView>["columns"] {
  return [
    {
      title: "Tool Name",
      dataIndex: "name",
      key: "name",
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (v: string) => (
        <span className="font-mono text-xs text-primary">{v}</span>
      ),
    },
    {
      title: "Server",
      dataIndex: "serverName",
      key: "serverName",
      sorter: (a, b) => a.serverName.localeCompare(b.serverName),
      render: (v: string) => (
        <span className="text-on-surface-variant">{v}</span>
      ),
    },
    {
      title: "Method",
      dataIndex: "method",
      key: "method",
      width: 100,
      render: (v: string) => {
        const variant = methodBadgeVariant[v] || methodBadgeVariant.GET
        return (
          <span
            className={`text-[11px] font-bold uppercase tracking-wide ${variant.className}`}
          >
            {v}
          </span>
        )
      },
    },
    {
      title: "Path",
      dataIndex: "path",
      key: "path",
      render: (v: string) => (
        <span className="font-mono text-xs text-on-surface-variant">{v}</span>
      ),
    },
    {
      title: "Enabled",
      dataIndex: "enabled",
      key: "enabled",
      width: 90,
      align: "center",
      render: (v: boolean, tool) => (
        <Switch
          size="small"
          checked={v}
          onChange={() => onToggleEnabled(tool)}
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

export interface GatewayToolsMenuHandlers {
  handleEdit: (tool: ToolView) => void
  handleDelete: (tool: ToolView) => void
}

export function createContextMenuItems({
  handleEdit,
  handleDelete,
}: GatewayToolsMenuHandlers): (
  record: ToolView
) => ContextMenuItemConfig<ToolView>[] {
  return (record) => [
    {
      key: "edit",
      label: "Edit",
      icon: <Pencil className="size-4" />,
      onClick: () => handleEdit(record),
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
