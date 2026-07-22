import type {
  GatewayTool,
  ParamDataType,
  ParamIn,
  ToolParameter,
} from "@/api/types"

export interface ParsedOperation {
  key: string // `${METHOD}:${path}`
  method: string
  path: string
  summary: string
  tags: string[]
  tool: GatewayTool
}

export interface ParsedImport {
  baseUrl: string
  docTitle: string
  docDescription: string
  operations: ParsedOperation[]
}

const HTTP_METHODS = ["get", "post", "put", "delete", "patch"] as const

interface OpenApiSchema {
  type?: string
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
  type?: string // Swagger 2.0 非 body 参数的类型字段
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

/** 工具名清洗：非法字符替换为下划线，去掉首尾下划线，截断到 64 字符 */
export function sanitizeName(raw: string): string {
  const cleaned = raw
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64)
  return cleaned || "unnamed"
}

function toDefaultString(value: unknown): string {
  if (value === undefined || value === null) return ""
  if (typeof value === "object") return JSON.stringify(value)
  return String(value)
}

/** dataType 推断：仅识别 integer/number/boolean，其余（array/object/缺失）一律 string */
function inferDataType(type: string | undefined): ParamDataType {
  switch (type) {
    case "integer":
    case "number":
    case "boolean":
      return type
    default:
      return "string"
  }
}

function mapParameter(param: OpenApiParameter): ToolParameter | null {
  let location: ParamIn
  switch (param.in) {
    case "path":
    case "query":
    case "header":
      location = param.in
      break
    case "formData":
      location = "body"
      break
    default:
      // body 由 expandBodyParameter 处理；"cookie" 等位置后端不支持
      return null
  }
  return {
    name: param.name || "",
    in: location,
    dataType: inferDataType(param.schema?.type ?? param.type),
    required: Boolean(param.required),
    description: param.description || "",
    defaultValue: toDefaultString(param.schema?.default ?? param.default ?? ""),
  }
}

/** 展开 object schema 的 properties 为一组 in='body' 参数 */
function expandObjectProperties(
  schema: OpenApiSchema,
  fallbackRequired: boolean
): ToolParameter[] {
  const requiredList = schema.required || []
  return Object.entries(schema.properties ?? {}).map(([name, prop]) => ({
    name,
    in: "body",
    dataType: inferDataType(prop?.type),
    // schema.required 数组为准；文档未声明时回退到参数级 required
    required: requiredList.length > 0 ? requiredList.includes(name) : fallbackRequired,
    description: prop?.description || "",
    defaultValue: toDefaultString(prop?.default),
  }))
}

/** Swagger 2.0 的 in='body' 参数：schema.properties 展开为 body 参数 */
function expandBodyParameter(param: OpenApiParameter): ToolParameter[] {
  if (!param.schema?.properties) {
    // 无 object schema 时退化为单个 body 参数
    return [
      {
        name: param.name || "body",
        in: "body",
        dataType: inferDataType(param.schema?.type),
        required: Boolean(param.required),
        description: param.description || "",
        defaultValue: toDefaultString(param.default ?? param.schema?.default),
      },
    ]
  }
  return expandObjectProperties(param.schema, Boolean(param.required))
}

/** OAS3 requestBody（application/json，schema.type=object）：properties 展开为 body 参数 */
function mapRequestBody(
  requestBody: OpenApiRequestBody | undefined
): ToolParameter[] {
  const schema = requestBody?.content?.["application/json"]?.schema
  if (!schema?.properties) return []
  return expandObjectProperties(schema, Boolean(requestBody?.required))
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

function buildOperation(
  path: string,
  method: string,
  operation: OpenApiOperation,
  pathItem: OpenApiPathItem,
  isV3: boolean
): ParsedOperation {
  const parameters: ToolParameter[] = []
  for (const param of mergeParameters(pathItem.parameters, operation.parameters)) {
    if (param.in === "body") {
      parameters.push(...expandBodyParameter(param))
    } else {
      const mapped = mapParameter(param)
      if (mapped) parameters.push(mapped)
    }
  }
  if (isV3) {
    parameters.push(...mapRequestBody(operation.requestBody))
  }
  // 工具名：优先 operationId，缺失时用 method+path（如 get_users_by_id）
  const rawName = operation.operationId || `${method.toLowerCase()}_${path}`
  return {
    key: `${method.toUpperCase()}:${path}`,
    method: method.toUpperCase(),
    path,
    summary: operation.summary || "",
    tags: operation.tags || [],
    tool: {
      name: sanitizeName(rawName),
      method: method.toUpperCase(),
      path,
      description: operation.summary || operation.operationId || "",
      enabled: true,
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

  // baseUrl 解析保留在此（导入流程不再使用，server 由用户先选好）
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

/** 按勾选的 operation 构建待批量创建的 GatewayTool[] */
export function buildTools(
  parsed: ParsedImport,
  selectedKeys: string[]
): GatewayTool[] {
  const selected = new Set(selectedKeys)
  return parsed.operations
    .filter((op) => selected.has(op.key))
    .map((op) => ({
      ...op.tool,
      parameters: op.tool.parameters.map((p) => ({ ...p })),
    }))
}
