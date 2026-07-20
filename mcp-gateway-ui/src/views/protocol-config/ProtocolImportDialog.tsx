import { useMemo, useState, type Key } from "react"
import { AlertCircle, FileJson, Loader2, Upload } from "lucide-react"
import { Table } from "antd"
import type { TableRowSelection } from "antd/es/table/interface"
import { Button, Input } from "antd"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { ApiGroup } from "@/api/registry"
import {
  buildDraftGroup,
  parseOpenApiDocument,
  sanitizeName,
  type ParsedImport,
  type ParsedOperation,
} from "./openapi-parser"
import { methodBadgeVariant } from "./protocol-config.data"

interface ProtocolImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (group: ApiGroup) => void
}

export function ProtocolImportDialog({
  open,
  onOpenChange,
  onImport,
}: ProtocolImportDialogProps) {
  const [parsed, setParsed] = useState<ParsedImport | null>(null)
  const [parsing, setParsing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [selectedKeys, setSelectedKeys] = useState<Key[]>([])
  const [filter, setFilter] = useState("")
  const [groupName, setGroupName] = useState("")

  const operations = useMemo(() => parsed?.operations ?? [], [parsed])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setParsing(true)
    setError(null)
    setSelectedKeys([])
    setFilter("")
    setGroupName("")
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const json = JSON.parse(String(reader.result))
        const doc = parseOpenApiDocument(json)
        setParsed(doc)
        setGroupName(sanitizeName(doc.docTitle || "imported"))
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to parse JSON file"
        )
        setParsed(null)
      } finally {
        setParsing(false)
      }
    }
    reader.onerror = () => {
      setError("Failed to read file")
      setParsing(false)
    }
    reader.readAsText(file)
  }

  const filteredOperations = useMemo(() => {
    if (!filter.trim()) return operations
    const term = filter.toLowerCase()
    return operations.filter(
      (op) =>
        op.path.toLowerCase().includes(term) ||
        op.summary.toLowerCase().includes(term) ||
        op.method.toLowerCase().includes(term) ||
        op.tags.join(" ").toLowerCase().includes(term)
    )
  }, [operations, filter])

  const rowSelection: TableRowSelection<ParsedOperation> = {
    selectedRowKeys: selectedKeys,
    onChange: (keys) => setSelectedKeys(keys),
    // Keep selections when paging / filtering so 跨页全选 works.
    preserveSelectedRowKeys: true,
  }

  const selectAllFiltered = () =>
    setSelectedKeys(filteredOperations.map((op) => op.key))

  const handleImport = () => {
    if (!parsed || selectedKeys.length === 0 || !groupName.trim()) return
    onImport(buildDraftGroup(parsed, selectedKeys.map(String), groupName))
    onOpenChange(false)
  }

  const hasOperations = operations.length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!flex max-h-[90vh] max-w-[calc(100%-2rem)] !flex-col !gap-0 overflow-hidden p-0 sm:max-w-[70vw]">
        <DialogHeader className="shrink-0 px-5 pt-3 pb-2">
          <div className="flex items-center gap-2">
            <FileJson className="size-5 text-primary" />
            <DialogTitle>Import from OpenAPI</DialogTitle>
          </div>
          <DialogDescription>
            {hasOperations && parsed
              ? `${parsed.docTitle || "OpenAPI document"} · ${operations.length} operation(s) · ${parsed.baseUrl}`
              : "Select a Swagger / OpenAPI JSON file to import endpoints"}
          </DialogDescription>
        </DialogHeader>

        <div className="shrink-0 border-y border-border bg-surface-container-low/40 px-5 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex h-9 cursor-pointer items-center gap-2 rounded-full bg-surface px-4 text-sm text-on-surface shadow-sm transition-colors hover:bg-surface-container-high">
              <Upload className="size-4" />
              <span className="max-w-[12rem] truncate">
                {fileName || "Choose JSON file"}
              </span>
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
            {hasOperations && (
              <>
                <div className="flex items-center gap-2">
                  <span className="shrink-0 text-[13px] font-medium text-on-surface">
                    分组名称
                  </span>
                  <Input
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="必填，将作为 MCP 工具名前缀"
                    status={groupName.trim() ? "" : "error"}
                    className="w-56"
                  />
                </div>
                <input
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Filter by path, summary, method or tag..."
                  className="h-9 min-w-[12rem] flex-1 rounded-full border border-outline-variant/50 bg-surface px-4 text-sm text-on-surface outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                />
                <div className="flex items-center gap-1">
                  <Button type="link" size="small" onClick={selectAllFiltered}>
                    全选 {filteredOperations.length} 条
                  </Button>
                  <Button
                    type="link"
                    size="small"
                    disabled={selectedKeys.length === 0}
                    onClick={() => setSelectedKeys([])}
                  >
                    清空
                  </Button>
                  <span className="ml-1 text-sm text-on-surface-variant">
                    {selectedKeys.length} / {operations.length} selected
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        <div
          className={cn(
            "min-h-0 overflow-auto px-5 py-3",
            hasOperations ? "flex-1" : "h-auto"
          )}
        >
          {parsing && (
            <div className="flex h-40 items-center justify-center gap-2 text-on-surface-variant">
              <Loader2 className="size-5 animate-spin" />
              Parsing file...
            </div>
          )}

          {error && !parsing && (
            <div className="flex h-40 flex-col items-center justify-center gap-2 text-error">
              <AlertCircle className="size-6" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {!parsing && !error && !hasOperations && (
            <div className="flex h-40 flex-col items-center justify-center gap-3 text-on-surface-variant">
              <FileJson className="size-10 opacity-40" />
              <span className="text-sm">
                No file selected. Choose a Swagger 2.0 / OpenAPI 3.x JSON file
                to start.
              </span>
            </div>
          )}

          {hasOperations && (
            <Table<ParsedOperation>
              rowKey="key"
              size="small"
              rowSelection={rowSelection}
              dataSource={filteredOperations}
              pagination={{
                pageSize: 10,
                size: "small",
                showSizeChanger: false,
              }}
              scroll={{ y: 320 }}
              columns={[
                {
                  title: "Method",
                  dataIndex: "method",
                  width: 100,
                  render: (m: string) => {
                    const variant =
                      methodBadgeVariant[m] || methodBadgeVariant.GET
                    return <span className={variant.className}>{m}</span>
                  },
                },
                {
                  title: "Path",
                  dataIndex: "path",
                  render: (v: string) => (
                    <span className="font-mono text-[12px] text-on-surface">
                      {v}
                    </span>
                  ),
                },
                {
                  title: "Summary",
                  dataIndex: "summary",
                  ellipsis: true,
                  render: (v: string) => (
                    <span className="text-[13px] text-on-surface">{v}</span>
                  ),
                },
                {
                  title: "Tags",
                  dataIndex: "tags",
                  width: 160,
                  render: (tags: string[]) => (
                    <div className="flex flex-wrap gap-1">
                      {tags.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex rounded-full border border-[#e3e7ef] bg-surface-container-low px-2 py-0.5 text-[11px] text-on-surface-variant"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  ),
                },
              ]}
            />
          )}
        </div>

        <DialogFooter className="!mx-0 !mb-0 shrink-0 items-center justify-end border-t border-border px-5 py-3">
          <Button onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            type="primary"
            disabled={
              selectedKeys.length === 0 || parsing || !groupName.trim()
            }
            onClick={handleImport}
          >
            Import{" "}
            {selectedKeys.length > 0 ? `(${selectedKeys.length})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
