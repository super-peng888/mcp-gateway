import { http } from "./http"
import type { GatewayTool, ToolView } from "./types"

export type {
  GatewayTool,
  ParamDataType,
  ParamIn,
  ToolParameter,
  ToolView,
} from "./types"

export function listTools() {
  return http.get<ToolView[]>("/tools")
}

export function listServerTools(serverId: number) {
  return http.get<GatewayTool[]>(`/servers/${serverId}/tools`)
}

export function createTool(serverId: number, tool: GatewayTool) {
  return http.post<GatewayTool>(`/servers/${serverId}/tools`, tool)
}

export function createToolsBatch(serverId: number, tools: GatewayTool[]) {
  return http.post<GatewayTool[]>(`/servers/${serverId}/tools/batch`, tools)
}

export function updateTool(id: number, tool: GatewayTool) {
  return http.put<GatewayTool>(`/tools/${id}`, tool)
}

export function deleteTool(id: number) {
  return http.delete<void>(`/tools/${id}`)
}

export function invokeTool(id: number, args: Record<string, unknown>) {
  return http.post<string>(`/tools/${id}/invoke`, args)
}
