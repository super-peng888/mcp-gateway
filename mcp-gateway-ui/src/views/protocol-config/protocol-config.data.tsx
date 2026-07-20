import type { TableProps } from "antd"
import { Fingerprint, Link, Search, RefreshCw, Trash2, Upload } from "lucide-react"
import type { SearchField } from "@/hooks/useTable"
import type { ContextMenuItemConfig } from "@/components/DataTable"
import type { ApiGroup } from "@/api/registry"

export type ProtocolConfigSearch = {
  id: string
  url: string
  description: string
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

const defaultTimeoutMs: Record<string, number> = {
  GET: 3000,
  POST: 5000,
  PUT: 8000,
  DELETE: 2000,
  PATCH: 5000,
}

function formatTimeout(group: ApiGroup): string {
  if (group.timeout && group.timeout > 0) return `${group.timeout}ms`
  const methods = Array.from(new Set(group.endpoints.map((e) => e.method)))
  const max = methods.reduce(
    (acc, m) => Math.max(acc, defaultTimeoutMs[m] || 3000),
    3000
  )
  return `${max}ms`
}

export const searchFormSchema: SearchField<ProtocolConfigSearch>[] = [
  {
    key: "id",
    label: "Protocol ID",
    placeholder: "Protocol ID",
    icon: <Fingerprint className="size-5" />,
  },
  {
    key: "url",
    label: "Request URL",
    placeholder: "Request URL",
    icon: <Link className="size-5" />,
  },
  {
    key: "description",
    label: "Description",
    placeholder: "Description",
    icon: <Search className="size-5" />,
  },
]

export interface ProtocolConfigHandlers {
  handleDelete: (id?: number) => void
  handleImport: () => void
  reload: () => void
}

export const columns: TableProps<ApiGroup>["columns"] = [
  {
    title: "Protocol ID",
    dataIndex: "name",
    key: "name",
    sorter: (a, b) => a.name.localeCompare(b.name),
    render: (v: string) => (
      <span className="text-[12px] font-bold text-slate-900">{v}</span>
    ),
  },
  {
    title: "Request URL",
    dataIndex: "baseUrl",
    key: "baseUrl",
    sorter: (a, b) => a.baseUrl.localeCompare(b.baseUrl),
    render: (v: string) => (
      <span className="font-mono text-[12px] text-slate-500">{v}</span>
    ),
  },
  {
    title: "Method",
    key: "methods",
    render: (_, group) => {
      const methods = Array.from(new Set(group.endpoints.map((e) => e.method)))
      const m = methods[0] || "GET"
      const variant = methodBadgeVariant[m] || methodBadgeVariant.GET
      return (
        <span className={`text-[11px] font-bold uppercase tracking-wide ${variant.className}`}>
          {m}
        </span>
      )
    },
  },
  {
    title: "Timeout",
    key: "timeout",
    render: (_, group) => (
      <span className="text-[12px] text-slate-500">{formatTimeout(group)}</span>
    ),
  },
]

export function createContextMenuItems({
  handleDelete,
  handleImport,
  reload,
}: ProtocolConfigHandlers): (record: ApiGroup) => ContextMenuItemConfig<ApiGroup>[] {
  return (record) => [
    {
      key: "refresh",
      label: "Refresh Data",
      icon: <RefreshCw className="size-4" />,
      onClick: () => reload(),
    },
    {
      key: "import",
      label: "Import Protocol",
      icon: <Upload className="size-4" />,
      onClick: () => handleImport(),
    },
    { key: "separator-1", separator: true },
    {
      key: "delete",
      label: "Delete Group",
      icon: <Trash2 className="size-4" />,
      onClick: () => handleDelete(record.id),
    },
  ]
}
