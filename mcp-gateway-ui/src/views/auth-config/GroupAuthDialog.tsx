import { useState } from "react"
import { Shield } from "lucide-react"
import { Button, Input, Modal, Select, Space } from "antd"
import { updateGroupAuth, type ApiGroup } from "@/api/registry"

interface GroupAuthDialogProps {
  group: ApiGroup | null
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

const authTypeOptions = [
  { value: "NONE", label: "无认证" },
  { value: "BEARER", label: "Bearer Token" },
  { value: "BASIC", label: "Basic Auth" },
  { value: "API_KEY", label: "API Key" },
]

function normalizeAuthType(value?: string | null): string {
  const t = (value ?? "").toUpperCase()
  return authTypeOptions.some((o) => o.value === t) ? t : "NONE"
}

export function GroupAuthDialog({
  group,
  onOpenChange,
  onSuccess,
}: GroupAuthDialogProps) {
  const open = group !== null

  const [authType, setAuthType] = useState(() =>
    normalizeAuthType(group?.authType)
  )
  const [authToken, setAuthToken] = useState(group?.authToken ?? "")
  const [authUsername, setAuthUsername] = useState(group?.authUsername ?? "")
  const [authPassword, setAuthPassword] = useState(group?.authPassword ?? "")
  const [authHeaderName, setAuthHeaderName] = useState(
    group?.authHeaderName ?? ""
  )
  const [authHeaderValue, setAuthHeaderValue] = useState(
    group?.authHeaderValue ?? ""
  )
  const [submitting, setSubmitting] = useState(false)

  const handleSave = async () => {
    if (group?.id == null) return
    setSubmitting(true)
    try {
      await updateGroupAuth(group.id, {
        authType,
        authToken: authType === "BEARER" ? authToken : "",
        authUsername: authType === "BASIC" ? authUsername : "",
        authPassword: authType === "BASIC" ? authPassword : "",
        authHeaderName: authType === "API_KEY" ? authHeaderName : "",
        authHeaderValue: authType === "API_KEY" ? authHeaderValue : "",
      })
      onSuccess()
      onOpenChange(false)
    } catch {
      alert("保存失败，后端服务可能不可用")
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
          <Shield className="size-5 text-primary" />
          <span>配置认证凭证</span>
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
        <div className="flex flex-col gap-1">
          <span className="text-[13px] font-medium text-on-surface">分组</span>
          <div className="rounded-md bg-surface-container px-3 py-2 text-sm">
            <div className="font-medium text-on-surface">{group?.name}</div>
            <div className="font-mono text-xs text-on-surface-variant">
              {group?.baseUrl}
            </div>
          </div>
        </div>

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
          <div className="flex flex-col gap-1.5">
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
          <>
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
          </>
        )}

        {authType === "API_KEY" && (
          <>
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
          </>
        )}

        <p className="text-[12px] text-on-surface-variant">
          凭证仅保存在网关本地，调用下游接口时自动注入请求头，不会出现在 MCP
          工具定义中
        </p>
      </div>
    </Modal>
  )
}
