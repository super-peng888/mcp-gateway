import { useEffect, useState } from "react"
import axios from "axios"
import { Plus, Trash2, Wrench } from "lucide-react"
import {
  Button,
  Checkbox,
  Input,
  Modal,
  Select,
  Space,
  Switch,
  Table,
} from "antd"
import type { TableProps } from "antd"
import { listServers } from "@/api/servers"
import { createTool, updateTool } from "@/api/tools"
import type {
  GatewayTool,
  McpServer,
  ParamDataType,
  ParamIn,
  ToolParameter,
  ToolView,
} from "@/api/types"
import { sanitizeNameInput } from "@/lib/mcp"

interface ToolDialogProps {
  open: boolean
  /** null 表示新建；传入 tool 表示编辑 */
  tool: ToolView | null
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

const methodOptions = ["GET", "POST", "PUT", "DELETE", "PATCH"].map((m) => ({
  value: m,
  label: m,
}))

const paramInOptions = [
  { value: "path", label: "path" },
  { value: "query", label: "query" },
  { value: "header", label: "header" },
  { value: "body", label: "body" },
]

const paramDataTypeOptions = [
  { value: "string", label: "string" },
  { value: "integer", label: "integer" },
  { value: "number", label: "number" },
  { value: "boolean", label: "boolean" },
]

function emptyParameter(): ToolParameter {
  return {
    name: "",
    in: "query",
    dataType: "string",
    required: false,
    description: "",
    defaultValue: "",
  }
}

export function ToolDialog({
  open,
  tool,
  onOpenChange,
  onSuccess,
}: ToolDialogProps) {
  const isEdit = tool != null

  const [servers, setServers] = useState<McpServer[]>([])
  const [serversError, setServersError] = useState(false)
  const [serverId, setServerId] = useState<number | undefined>(undefined)
  const [name, setName] = useState(tool?.name ?? "")
  const [description, setDescription] = useState(tool?.description ?? "")
  const [method, setMethod] = useState(tool?.method ?? "GET")
  const [path, setPath] = useState(tool?.path ?? "")
  const [enabled, setEnabled] = useState(tool?.enabled ?? true)
  const [parameters, setParameters] = useState<ToolParameter[]>(
    tool?.parameters.map((p) => ({ ...p })) ?? []
  )
  const [submitting, setSubmitting] = useState(false)

  // 新建模式需要选择目标 Server
  useEffect(() => {
    if (!open || isEdit) return
    let cancelled = false
    listServers()
      .then((res) => {
        if (!cancelled) setServers(res.data)
      })
      .catch(() => {
        if (!cancelled) setServersError(true)
      })
    return () => {
      cancelled = true
    }
  }, [open, isEdit])

  const updateParameter = (index: number, patch: Partial<ToolParameter>) => {
    setParameters((prev) =>
      prev.map((p, i) => (i === index ? { ...p, ...patch } : p))
    )
  }

  const removeParameter = (index: number) => {
    setParameters((prev) => prev.filter((_, i) => i !== index))
  }

  const parameterColumns: TableProps<ToolParameter>["columns"] = [
    {
      title: "Name",
      dataIndex: "name",
      render: (_: unknown, __, index) => (
        <Input
          size="small"
          value={parameters[index]?.name}
          onChange={(e) => updateParameter(index, { name: e.target.value })}
          placeholder="参数名"
        />
      ),
    },
    {
      title: "In",
      dataIndex: "in",
      width: 100,
      render: (_: unknown, __, index) => (
        <Select
          size="small"
          value={parameters[index]?.in}
          options={paramInOptions}
          onChange={(v) => updateParameter(index, { in: v as ParamIn })}
          className="w-full"
        />
      ),
    },
    {
      title: "Type",
      dataIndex: "dataType",
      width: 110,
      render: (_: unknown, __, index) => (
        <Select
          size="small"
          value={parameters[index]?.dataType ?? "string"}
          options={paramDataTypeOptions}
          onChange={(v) =>
            updateParameter(index, { dataType: v as ParamDataType })
          }
          className="w-full"
        />
      ),
    },
    {
      title: "Required",
      dataIndex: "required",
      width: 80,
      align: "center",
      render: (_: unknown, __, index) => (
        <Checkbox
          checked={parameters[index]?.required ?? false}
          onChange={(e) =>
            updateParameter(index, { required: e.target.checked })
          }
        />
      ),
    },
    {
      title: "Description",
      dataIndex: "description",
      render: (_: unknown, __, index) => (
        <Input
          size="small"
          value={parameters[index]?.description}
          onChange={(e) =>
            updateParameter(index, { description: e.target.value })
          }
          placeholder="参数说明"
        />
      ),
    },
    {
      title: "Default",
      dataIndex: "defaultValue",
      width: 120,
      render: (_: unknown, __, index) => (
        <Input
          size="small"
          value={parameters[index]?.defaultValue}
          onChange={(e) =>
            updateParameter(index, { defaultValue: e.target.value })
          }
        />
      ),
    },
    {
      title: "",
      key: "actions",
      width: 48,
      align: "center",
      render: (_: unknown, __, index) => (
        <Button
          type="text"
          size="small"
          danger
          icon={<Trash2 className="size-3.5" />}
          onClick={() => removeParameter(index)}
        />
      ),
    },
  ]

  const handleSave = async () => {
    if (!isEdit && serverId == null) {
      alert("请选择目标 Server")
      return
    }
    if (!name.trim()) {
      alert("请填写工具名称")
      return
    }
    if (!path.trim()) {
      alert("请填写 Path")
      return
    }
    const payload: GatewayTool = {
      name: name.trim(),
      method,
      path: path.trim(),
      description,
      enabled,
      // 丢弃未填写名称的参数行
      parameters: parameters.filter((p) => p.name.trim()),
    }
    setSubmitting(true)
    try {
      if (isEdit) {
        await updateTool(tool.id, { ...payload, id: tool.id })
      } else if (serverId != null) {
        await createTool(serverId, payload)
      }
      onSuccess()
      onOpenChange(false)
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        alert(`工具名 "${payload.name}" 在该 Server 下已存在，请更换`)
      } else if (axios.isAxiosError(err) && err.response?.status === 400) {
        alert("提交内容不合法：请检查工具名格式与参数配置")
      } else {
        alert("保存失败，后端服务可能不可用")
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onCancel={() => onOpenChange(false)}
      onOk={handleSave}
      confirmLoading={submitting}
      title={
        <Space>
          <Wrench className="size-5 text-primary" />
          <span>{isEdit ? "编辑工具" : "新增工具"}</span>
        </Space>
      }
      width={860}
      footer={
        <Space>
          <Button onClick={() => onOpenChange(false)}>取消</Button>
          <Button type="primary" loading={submitting} onClick={handleSave}>
            保存
          </Button>
        </Space>
      }
    >
      <div className="flex flex-col gap-4 pt-2">
        <div className="flex gap-3">
          <div className="flex w-1/2 flex-col gap-1.5">
            <span className="text-[13px] font-medium text-on-surface">
              Server <span className="text-error">*</span>
            </span>
            {isEdit ? (
              <Input value={tool.serverName} disabled />
            ) : (
              <Select
                value={serverId}
                options={servers
                  .filter((s) => s.id != null)
                  .map((s) => ({ value: s.id as number, label: s.name }))}
                onChange={(v) => setServerId(v)}
                placeholder={
                  serversError ? "Server 列表加载失败" : "选择目标 Server"
                }
                status={serversError ? "error" : ""}
                className="w-full"
              />
            )}
          </div>
          <div className="flex w-1/2 flex-col gap-1.5">
            <span className="text-[13px] font-medium text-on-surface">
              工具名称 <span className="text-error">*</span>
            </span>
            <Input
              value={name}
              onChange={(e) => setName(sanitizeNameInput(e.target.value))}
              placeholder="如 get_user_by_id"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-on-surface">描述</span>
          <Input.TextArea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="工具用途说明，将展示给 MCP 客户端"
            rows={2}
          />
        </div>

        <div className="flex gap-3">
          <div className="flex w-40 flex-col gap-1.5">
            <span className="text-[13px] font-medium text-on-surface">
              Method
            </span>
            <Select
              value={method}
              options={methodOptions}
              onChange={(v) => setMethod(v)}
              className="w-full"
            />
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <span className="text-[13px] font-medium text-on-surface">
              Path <span className="text-error">*</span>
            </span>
            <Input
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder="/users/{id}"
            />
            <p className="text-[12px] text-on-surface-variant">
              path 参数用 {"{name}"} 占位，如 /users/{"{id}"}
            </p>
          </div>
          <div className="flex w-24 flex-col gap-1.5">
            <span className="text-[13px] font-medium text-on-surface">
              启用
            </span>
            <Switch checked={enabled} onChange={setEnabled} />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium text-on-surface">
              参数
            </span>
            <Button
              size="small"
              icon={<Plus className="size-3.5" />}
              onClick={() =>
                setParameters((prev) => [...prev, emptyParameter()])
              }
            >
              添加参数
            </Button>
          </div>
          <Table<ToolParameter>
            rowKey={(_, index) => String(index ?? 0)}
            size="small"
            columns={parameterColumns}
            dataSource={parameters}
            pagination={false}
            scroll={{ y: 240 }}
            locale={{ emptyText: "暂无参数，点击右上角「添加参数」创建" }}
          />
        </div>
      </div>
    </Modal>
  )
}
