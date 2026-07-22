import type { McpServer, TransportType } from "@/api/types"

/** 后端网关地址常量（沿用旧 dashboard 的硬编码方式） */
export const MCP_GATEWAY_HOST = "http://localhost:8082"

/** 按 transport 拼接 MCP 端点 URL（前端展示/复制用） */
export function buildMcpEndpointUrl(
  server: Pick<McpServer, "name" | "transport">
): string {
  return server.transport === "SSE"
    ? `${MCP_GATEWAY_HOST}/mcp/${server.name}/sse`
    : `${MCP_GATEWAY_HOST}/mcp/${server.name}/mcp`
}

export const transportLabel: Record<TransportType, string> = {
  SSE: "SSE",
  STREAMABLE_HTTP: "Streamable HTTP",
}

/** 名称输入清洗：仅保留 [a-zA-Z0-9_-]，最长 64 字符 */
export function sanitizeNameInput(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64)
}

/** 复制文本到剪贴板；clipboard API 不可用时降级到 execCommand */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const el = document.createElement("textarea")
      el.value = text
      el.style.position = "fixed"
      el.style.opacity = "0"
      document.body.appendChild(el)
      el.select()
      document.execCommand("copy")
      document.body.removeChild(el)
      return true
    } catch {
      return false
    }
  }
}
