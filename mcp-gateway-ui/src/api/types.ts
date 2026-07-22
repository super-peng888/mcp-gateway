export type TransportType = "SSE" | "STREAMABLE_HTTP"
export type ParamIn = "path" | "query" | "header" | "body"
export type ParamDataType = "string" | "integer" | "number" | "boolean"
export type AuthType = "NONE" | "BEARER" | "BASIC" | "API_KEY"

export interface ToolParameter {
  name: string
  in: ParamIn
  dataType: ParamDataType
  required: boolean
  description?: string
  defaultValue?: string
}

export interface GatewayTool {
  id?: number
  name: string
  method: string
  path: string
  description?: string
  enabled?: boolean
  parameters: ToolParameter[]
}

export interface McpServer {
  id?: number
  name: string
  description?: string
  transport: TransportType
  enabled?: boolean
  baseUrl: string
  authType?: AuthType
  authToken?: string
  authUsername?: string
  authPassword?: string
  authHeaderName?: string
  authHeaderValue?: string
  tools?: GatewayTool[]
}

export interface ToolView {
  id: number
  serverId: number
  serverName: string
  serverTransport: TransportType
  serverEnabled: boolean
  name: string
  description?: string
  method: string
  path: string
  enabled: boolean
  parameters: ToolParameter[]
}
