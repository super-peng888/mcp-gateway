import { useState } from "react"
import axios from "axios"
import { Server } from "lucide-react"
import { Button, Input, Modal, Select, Space, Switch } from "antd"
import { createServer, updateServer } from "@/api/servers"
import type { AuthType, McpServer, TransportType } from "@/api/types"
import { sanitizeNameInput } from "@/lib/mcp"

interface ServerDialogProps {
  open: boolean
  /** null 表示新建；传入 server 表示编辑 */
  server: McpServer | null
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

const transportOptions = [
  { value: "STREAMABLE_HTTP", label: "Streamable HTTP（推荐）" },
  { value: "SSE", label: "SSE（旧版，兼容老客户端）" },
]

const authTypeOptions = [
  { value: "NONE", label: "无认证" },
  { value: "BEARER", label: "Bearer Token" },
  { value: "BASIC", label: "Basic Auth" },
  { value: "API_KEY", label: "API Key" },
]

function normalizeAuthType(value?: string | null): AuthType {
  const t = (value ?? "").toUpperCase()
  return authTypeOptions.some((o) => o.value === t) ? (t as AuthType) : "NONE"
}

export function ServerDialog({
  open,
  server,
  onOpenChange,
  onSuccess,
}: ServerDialogProps) {
  const isEdit = server?.id != null

  const [name, setName] = useState(server?.name ?? "")
  const [description, setDescription] = useState(server?.description ?? "")
  const [transport, setTransport] = useState<TransportType>(
    server?.transport ?? "STREAMABLE_HTTP"
  )
  const [baseUrl, setBaseUrl] = useState(server?.baseUrl ?? "")
  const [enabled, setEnabled] = useState(server?.enabled ?? true)
  const [authType, setAuthType] = useState<AuthType>(() =>
    normalizeAuthType(server?.authType)
  )
  const [authToken, setAuthToken] = useState(server?.authToken ?? "")
  const [authUsername, setAuthUsername] = useState(server?.authUsername ?? "")
  const [authPassword, setAuthPassword] = useState(server?.authPassword ?? "")
  const [authHeaderName, setAuthHeaderName] = useState(
    server?.authHeaderName ?? ""
  )
  const [authHeaderValue, setAuthHeaderValue] = useState(
    server?.authHeaderValue ?? ""
  )
  const [submitting, setSubmitting] = useState(false)

  const handleSave = async () => {
    if (!name.trim()) {
      alert("请填写 Server 名称")
      return
    }
    if (!baseUrl.trim()) {
      alert("请填写 Base URL")
      return
    }
    const payload: McpServer = {
      name: name.trim(),
      description,
      transport,
      baseUrl: baseUrl.trim(),
      enabled,
      authType,
      authToken: authType === "BEARER" ? authToken : "",
      authUsername: authType === "BASIC" ? authUsername : "",
      authPassword: authType === "BASIC" ? authPassword : "",
      authHeaderName: authType === "API_KEY" ? authHeaderName : "",
      authHeaderValue: authType === "API_KEY" ? authHeaderValue : "",
    }
    setSubmitting(true)
    try {
      if (isEdit && server?.id != null) {
        await updateServer(server.id, { ...payload, id: server.id })
      } else {
        await createServer(payload)
      }
      onSuccess()
      onOpenChange(false)
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        alert(`名称 "${payload.name}" 已存在，请更换`)
      } else if (axios.isAxiosError(err) && err.response?.status === 400) {
        alert("名称不合法：仅允许字母、数字、下划线、连字符（1-64 位）")
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
          <Server className="size-5 text-primary" />
          <span>{isEdit ? "编辑 MCP Server" : "新建 MCP Server"}</span>
        </Space>
      }
      width={560}
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
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-on-surface">
            名称 <span className="text-error">*</span>
          </span>
          <Input
            value={name}
            onChange={(e) => setName(sanitizeNameInput(e.target.value))}
            placeholder="如 weather-service"
          />
          <p className="text-[12px] text-on-surface-variant">
            仅允许字母、数字、下划线、连字符，将作为 MCP 端点路径的一部分
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-on-surface">描述</span>
          <Input.TextArea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="该 Server 聚合的下游接口说明"
            rows={2}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-on-surface">
            协议类型
          </span>
          <Select
            value={transport}
            options={transportOptions}
            onChange={(v) => setTransport(v)}
            className="w-full"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-on-surface">
            Base URL <span className="text-error">*</span>
          </span>
          <Input
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="如 https://api.example.com"
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[13px] font-medium text-on-surface">
            启用该 Server
          </span>
          <Switch checked={enabled} onChange={setEnabled} />
        </div>

        <div className="border-t border-outline-variant/40 pt-3">
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-on-surface">
              认证方式
            </span>
            <Select
              value={authType}
              options={authTypeOptions}
              onChange={(v) => setAuthType(v)}
              className="w-full"
            />
          </div>

          {authType === "BEARER" && (
            <div className="mt-3 flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-on-surface">
                Token
              </span>
              <Input.Password
                value={authToken}
                onChange={(e) => setAuthToken(e.target.value)}
                placeholder="粘贴 Token"
              />
            </div>
          )}

          {authType === "BASIC" && (
            <div className="mt-3 flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <span className="text-[13px] font-medium text-on-surface">
                  用户名
                </span>
                <Input
                  value={authUsername}
                  onChange={(e) => setAuthUsername(e.target.value)}
                  placeholder="用户名"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[13px] font-medium text-on-surface">
                  密码
                </span>
                <Input.Password
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="密码"
                />
              </div>
            </div>
          )}

          {authType === "API_KEY" && (
            <div className="mt-3 flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <span className="text-[13px] font-medium text-on-surface">
                  Header 名称
                </span>
                <Input
                  value={authHeaderName}
                  onChange={(e) => setAuthHeaderName(e.target.value)}
                  placeholder="如 X-Api-Key"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[13px] font-medium text-on-surface">
                  Header 值
                </span>
                <Input.Password
                  value={authHeaderValue}
                  onChange={(e) => setAuthHeaderValue(e.target.value)}
                  placeholder="粘贴密钥"
                />
              </div>
            </div>
          )}

          {authType !== "NONE" && (
            <p className="mt-3 text-[12px] text-on-surface-variant">
              凭证仅保存在网关本地，调用下游接口时自动注入请求头，不会出现在
              MCP 工具定义中
            </p>
          )}
        </div>
      </div>
    </Modal>
  )
}
