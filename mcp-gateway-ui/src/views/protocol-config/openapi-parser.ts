import type { ApiEndpoint, ApiGroup, ApiParameter } from "@/api/registry"

export interface ParsedOperation {
  key: string // `${METHOD}:${path}`
  method: string
  path: string
  summary: string
  tags: string[]
  endpoint: ApiEndpoint
}

export interface ParsedImport {
  baseUrl: string
  docTitle: string
  docDescription: string
  operations: ParsedOperation[]
}

const HTTP_METHODS = ["get", "post", "put", "delete", "patch"] as const

interface OpenApiSchema {
  description?: string
  default?: unknown
  required?: string[]
  properties?: Record<string, OpenApiSchema>
}

interface OpenApiParameter {
  name?: string
  in?: string
  required?: boolean
  description?: string
  default?: unknown
  schema?: OpenApiSchema
}

interface OpenApiRequestBody {
  required?: boolean
  content?: Record<string, { schema?: OpenApiSchema }>
}

interface OpenApiOperation {
  tags?: string[]
  summary?: string
  description?: string
  operationId?: string
  parameters?: OpenApiParameter[]
  requestBody?: OpenApiRequestBody
}

interface OpenApiPathItem {
  parameters?: OpenApiParameter[]
  [key: string]: unknown
}

interface OpenApiDocument {
  swagger?: string
  openapi?: string
  host?: string
  basePath?: string
  schemes?: string[]
  servers?: { url?: string }[]
  info?: { title?: string; description?: string }
  paths?: Record<string, OpenApiPathItem>
}

export function sanitizeName(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, "_").replace(/^_+|_+$/g, "")
  return cleaned || "unnamed"
}

function toDefaultString(value: unknown): string {
  if (value === undefined || value === null) return ""
  if (typeof value === "object") return JSON.stringify(value)
  return String(value)
}

function mapParameter(param: OpenApiParameter): ApiParameter | null {
  let type: string
  switch (param.in) {
    case "path":
    case "query":
    case "header":
    case "body":
      type = param.in
      break
    case "formData":
      type = "body"
      break
    default:
      // "cookie" and unknown locations are not supported by the backend
      return null
  }
  return {
    name: param.name || "",
    type,
    required: Boolean(param.required),
    description: param.description || "",
    defaultValue: toDefaultString(param.schema?.default ?? param.default ?? ""),
  }
}

function mergeParameters(
  pathLevel: OpenApiParameter[] | undefined,
  operationLevel: OpenApiParameter[] | undefined
): OpenApiParameter[] {
  const merged = new Map<string, OpenApiParameter>()
  for (const param of pathLevel || []) {
    merged.set(`${param.name}:${param.in}`, param)
  }
  for (const param of operationLevel || []) {
    merged.set(`${param.name}:${param.in}`, param)
  }
  return Array.from(merged.values())
}

function mapRequestBody(requestBody: OpenApiRequestBody | undefined): ApiParameter[] {
  const schema = requestBody?.content?.["application/json"]?.schema
  if (!schema?.properties) return []
  const requiredList =
    requestBody?.required === false ? [] : schema.required || []
  return Object.entries(schema.properties).map(([name, prop]) => ({
    name,
    type: "body",
    required: requiredList.includes(name),
    description: prop?.description || "",
    defaultValue: toDefaultString(prop?.default),
  }))
}

function buildOperation(
  path: string,
  method: string,
  operation: OpenApiOperation,
  pathItem: OpenApiPathItem,
  isV3: boolean
): ParsedOperation {
  const parameters = mergeParameters(pathItem.parameters, operation.parameters)
    .map(mapParameter)
    .filter((p): p is ApiParameter => p !== null)
  if (isV3) {
    parameters.push(...mapRequestBody(operation.requestBody))
  }
  const rawName = operation.operationId || `${method.toLowerCase()}_${path}`
  return {
    key: `${method.toUpperCase()}:${path}`,
    method: method.toUpperCase(),
    path,
    summary: operation.summary || "",
    tags: operation.tags || [],
    endpoint: {
      name: sanitizeName(rawName),
      method: method.toUpperCase(),
      path,
      description: operation.summary || operation.description || "",
      parameters,
    },
  }
}

export function parseOpenApiDocument(json: unknown): ParsedImport {
  const doc = json as OpenApiDocument
  const isV2 = doc?.swagger === "2.0"
  const isV3 =
    typeof doc?.openapi === "string" && doc.openapi.startsWith("3.")
  if (!isV2 && !isV3) {
    throw new Error("Unsupported document: expected Swagger 2.0 or OpenAPI 3.x")
  }
  if (!doc.paths || typeof doc.paths !== "object") {
    throw new Error("Invalid OpenAPI document: missing paths")
  }

  const baseUrl = isV2
    ? `${doc.schemes?.[0] || "http"}://${doc.host || "localhost"}${doc.basePath || ""}`
    : doc.servers?.[0]?.url || "http://localhost"

  const operations: ParsedOperation[] = []
  for (const [path, pathItem] of Object.entries(doc.paths)) {
    if (!pathItem || typeof pathItem !== "object") continue
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method]
      if (!operation || typeof operation !== "object") continue
      operations.push(
        buildOperation(path, method, operation as OpenApiOperation, pathItem, isV3)
      )
    }
  }

  return {
    baseUrl,
    docTitle: doc.info?.title || "",
    docDescription: doc.info?.description || "",
    operations,
  }
}

export function buildDraftGroup(
  parsed: ParsedImport,
  selectedKeys: string[],
  groupName?: string
): ApiGroup {
  const selected = new Set(selectedKeys)
  const customName = groupName ? sanitizeName(groupName) : ""
  return {
    name:
      customName && customName !== "unnamed"
        ? customName
        : sanitizeName(parsed.docTitle || "imported"),
    baseUrl: parsed.baseUrl,
    description:
      parsed.docDescription || `Imported from ${parsed.docTitle || "OpenAPI"}`,
    endpoints: parsed.operations
      .filter((op) => selected.has(op.key))
      .map((op) => ({
        ...op.endpoint,
        parameters: op.endpoint.parameters.map((p) => ({ ...p })),
      })),
  }
}
