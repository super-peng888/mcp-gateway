import type { TableProps } from "antd"
import { Search, Wrench, RefreshCw, Trash2 } from "lucide-react"
import type { SearchField } from "@/hooks/useTable"
import type { ContextMenuItemConfig } from "@/components/DataTable"
import { methodBadgeVariant } from "../protocol-config/protocol-config.data"
import type { fetchGatewayTools } from "./gateway-tools.api"

export interface GatewayTool {
  id: number
  toolName: string
  endpointName: string
  method: string
  path: string
  description: string
  groupName: string
  baseUrl: string
}

export type GatewayToolSearch = Parameters<
  typeof fetchGatewayTools
>[0]["search"]

export const searchFormSchema: SearchField<GatewayToolSearch>[] = [
  {
    key: "toolName",
    label: "Tool Name",
    placeholder: "Tool Name...",
    icon: <Search className="size-4" />,
  },
  {
    key: "groupName",
    label: "Group",
    placeholder: "Group...",
    icon: <Wrench className="size-4" />,
  },
]

export interface GatewayToolsHandlers {
  handleRemove: (tool: GatewayTool) => void
  reload: () => void
}

export const columns: TableProps<GatewayTool>["columns"] = [
  {
    title: "Tool Name",
    dataIndex: "toolName",
    key: "toolName",
    sorter: (a, b) => a.toolName.localeCompare(b.toolName),
    render: (v: string) => (
      <span className="font-mono text-xs text-primary">{v}</span>
    ),
  },
  {
    title: "Group",
    dataIndex: "groupName",
    key: "groupName",
    sorter: (a, b) => a.groupName.localeCompare(b.groupName),
    render: (v: string) => <span className="text-on-surface-variant">{v}</span>,
  },
  {
    title: "Method",
    dataIndex: "method",
    key: "method",
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
    title: "Description",
    dataIndex: "description",
    key: "description",
    ellipsis: true,
    render: (v: string) => (
      <span className="text-on-surface-variant" title={v}>
        {v}
      </span>
    ),
  },
]

export function createContextMenuItems({
  handleRemove,
  reload,
}: GatewayToolsHandlers): (
  record: GatewayTool
) => ContextMenuItemConfig<GatewayTool>[] {
  return (record) => [
    {
      key: "refresh",
      label: "Refresh Data",
      icon: <RefreshCw className="size-4" />,
      onClick: () => reload(),
    },
    { key: "separator-1", separator: true },
    {
      key: "remove",
      label: "Remove Tool",
      icon: <Trash2 className="size-4" />,
      onClick: () => handleRemove(record),
    },
  ]
}
