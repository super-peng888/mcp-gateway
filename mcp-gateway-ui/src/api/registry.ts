import axios from "axios"

export interface ApiParameter {
  name: string
  type: string
  required: boolean
  description: string
  defaultValue: string
}

export interface ApiEndpoint {
  id?: number
  name: string
  method: string
  path: string
  description: string
  parameters: ApiParameter[]
  enabled?: boolean
}

export interface ApiGroup {
  id?: number
  name: string
  baseUrl: string
  description: string
  endpoints: ApiEndpoint[]
  timeout?: number
  authType?: string
  authToken?: string
  authUsername?: string
  authPassword?: string
  authHeaderName?: string
  authHeaderValue?: string
}

const instance = axios.create({
  baseURL: "/api",
  timeout: 10000,
})

export function listGroups() {
  return instance.get<ApiGroup[]>("/registry")
}

export function getGroup(id: number) {
  return instance.get<ApiGroup>(`/registry/${id}`)
}

export function createGroup(group: ApiGroup) {
  return instance.post<ApiGroup>("/registry", group)
}

export function updateGroup(id: number, group: ApiGroup) {
  return instance.put<ApiGroup>(`/registry/${id}`, group)
}

export function deleteGroup(id: number) {
  return instance.delete(`/registry/${id}`)
}

export interface GroupAuthConfig {
  authType: string
  authToken?: string
  authUsername?: string
  authPassword?: string
  authHeaderName?: string
  authHeaderValue?: string
}

export function updateGroupAuth(id: number, auth: GroupAuthConfig) {
  return instance.put(`/registry/${id}/auth`, auth)
}

export interface ToolView {
  endpointId: number
  toolName: string
  endpointName: string
  method: string
  path: string
  description: string
  groupId: number
  groupName: string
  baseUrl: string
}

export function listTools() {
  return instance.get<ToolView[]>("/tools")
}

export function enableTool(endpointId: number) {
  return instance.post(`/tools/${endpointId}`)
}

export function disableTool(endpointId: number) {
  return instance.delete(`/tools/${endpointId}`)
}
