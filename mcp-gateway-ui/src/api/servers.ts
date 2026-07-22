import { http } from "./http"
import type { McpServer } from "./types"

export type { AuthType, McpServer, TransportType } from "./types"

export function listServers() {
  return http.get<McpServer[]>("/servers")
}

export function getServer(id: number) {
  return http.get<McpServer>(`/servers/${id}`)
}

export function createServer(server: McpServer) {
  return http.post<McpServer>("/servers", server)
}

export function updateServer(id: number, server: McpServer) {
  return http.put<McpServer>(`/servers/${id}`, server)
}

export function deleteServer(id: number) {
  return http.delete<void>(`/servers/${id}`)
}
