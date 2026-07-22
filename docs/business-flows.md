# MCP Gateway 业务流程与代码导读

> 面向后续阅读/维护代码的人。先讲清每条业务流程"发生了什么"，再指出"代码在哪里"。
> 文件路径均相对仓库根目录；后端包根为 `com.aura.mcp.gateway`。

---

## 1. 系统一句话

把下游 REST API 配置成 MCP 工具：管理员在 UI 上配置 **MCP Server**（选传输协议）和 **Tool**（OpenAPI 导入或手动新增），网关为每个启用的 Server 挂载一个标准 MCP 端点，Agent 连接后通过 JSON-RPC 发现并调用工具，网关把调用翻译成 HTTP 请求打到下游 API。

```
管理端(React UI) ──REST──▶ /api/servers, /api/tools ──▶ PostgreSQL (配置持久化)
                                                        │ GatewayConfigChangedEvent
                                                        ▼
                                              McpServerManager (动态挂载/同步)
Agent ──MCP(JSON-RPC)──▶ /mcp/{serverName}/mcp  (Streamable HTTP)
                        /mcp/{serverName}/sse   (旧版 HTTP+SSE)
                                                        │ tools/call
                                                        ▼
                                GatewayToolInvoker ──▶ RestApiExecutor ──▶ 下游 REST API
```

协议层（SSE/Streamable HTTP、session、JSON-RPC 分发）全部由官方 MCP Java SDK 0.18.x 承担，应用代码不碰协议细节，只做三件事：**配置存储、动态挂载、调用翻译**。

---

## 2. 核心概念与数据模型

| 概念 | 表 | 说明 |
|---|---|---|
| McpServer | `mcp_server` | 一个对外暴露的 MCP 服务。`name` 唯一（同时是 URL 路径段），`transport` 决定协议（`SSE` / `STREAMABLE_HTTP`），`baseUrl` + `auth*` 是下游 REST 的根地址和鉴权 |
| GatewayTool | `gateway_tool` | 一个 MCP 工具 = 下游一个 REST endpoint（method + path）。`name` 在 server 内唯一，直接作为 MCP tool name |
| ToolParameter | `gateway_tool_parameter` | 工具参数。`in` = 参数位置（path/query/header/body），`dataType` = 数据类型（string/integer/number/boolean），同时用于 inputSchema 生成和调用前类型转换 |

关键关系：`McpServer 1:N GatewayTool`（cascade ALL + orphanRemoval），参数是 `@ElementCollection`（无独立 id，随工具整体替换）。

实体代码：`mcp-gateway-server/src/main/java/com/aura/mcp/gateway/entity/`

---

## 3. 业务流程

### 3.1 配置 MCP Server（新建/编辑/启停/删除）

**UI 侧**：`mcp-gateway-ui/src/views/mcp-servers/`
- `ServerDialog.tsx`：表单。name 输入即时清洗（`lib/mcp.ts: sanitizeNameInput`）；协议类型下拉（默认 STREAMABLE_HTTP）；鉴权区按 authType 条件渲染字段
- 表格行内 Switch 切换 enabled；`lib/mcp.ts: buildMcpEndpointUrl` 生成展示/复制的端点 URL

**后端链路**：
```
POST/PUT /api/servers        McpServerController
  → McpServerService.create/update        # 校验 name 正则 ^[a-zA-Z0-9_-]{1,64}$（400）、重名（409）
  → serverRepository.save
  → 事务提交后抛出 GatewayConfigChangedEvent
  → McpServerManager.onConfigChanged → syncAll()
```

`syncAll()`（`mcp/McpServerManager.java`，全类唯一的状态收敛入口）：
1. 从 DB 读全部 server（`McpServerService.findAllInitialized`，懒加载集合在此初始化）
2. 期望集 = enabled 的 server；已挂载但不再期望（删除/禁用）或协议已变的 → `closeGracefully()` 卸载
3. 新出现的 → `mount()`：按 transport 创建 SDK 传输实例
   - SSE → `WebMvcSseServerTransportProvider`（端点 `/mcp/{name}/sse` + `/mcp/{name}/messages`）
   - Streamable → `WebMvcStreamableServerTransportProvider`（端点 `/mcp/{name}/mcp`）
4. 对每个挂载中的 server 做工具 diff（见 3.5）

**请求路由**：`mcp/McpRouterConfig.java` 注册一张**静态路由表**（`/mcp/{serverName}/sse|messages|mcp`），所有请求进 `McpServerManager.dispatch`，按 `serverName` 找到对应传输实例的 `RouterFunction` 再委托。这张表不变，server 动态增删不需要改路由。

### 3.2 配置工具（两种来源）

**来源一：OpenAPI 导入（纯前端解析）**
```
ToolImportDialog.tsx
  ① 下拉选择目标 Server
  ② 上传 Swagger 2.0 / OpenAPI 3.x JSON
  ③ openapi-parser.ts: parseOpenApiDocument  → ParsedImport
     - operations 展开；参数 dataType 从 schema.type 推断（非 integer/number/boolean 一律 string）
     - OAS3 requestBody / Swagger 2.0 body 参数的 properties 展开为 in=body 参数
  ④ 勾选 operations → buildTools → GatewayTool[]
     - 工具名：operationId 优先（sanitizeName 清洗+截断64），否则 method+path 生成
  ⑤ POST /api/servers/{id}/tools/batch   # 整批提交，任一冲突整批 409
```

**来源二：手动新增**
```
ToolDialog.tsx（新建/编辑共用）
  Server 下拉 + name/method/path + parameters 可编辑表格（Name/In/Type/Required/Description/Default）
  → POST /api/servers/{id}/tools  （编辑为 PUT /api/tools/{id}）
```

**后端**：`GatewayToolController` + `service/GatewayToolService.java`
- 校验：工具名正则、method 白名单、参数名重复、`in`/`dataType` 合法值
- 工具名 server 内唯一（`ensureNameFree`，409）
- 更新时 parameters 整体替换（ElementCollection 无 id 概念）
- 同样发 `GatewayConfigChangedEvent` 触发同步

### 3.3 Agent 连接与工具发现

两种传输都由 SDK 实现，行为差异只在传输层：

**Streamable HTTP**（推荐，单端点 `/mcp/{name}/mcp`）
```
POST initialize  → 响应头 Mcp-Session-Id（后续请求必须携带）
POST notifications/initialized   ← 必须！SDK 收到前不处理其他请求（规范行为）
POST tools/list  → 该 server 全部 enabled 工具（inputSchema 带类型）
```

**旧版 HTTP+SSE**（双端点）
```
GET  /mcp/{name}/sse       → event: endpoint，data 为 /mcp/{name}/messages?sessionId=xxx
POST /mcp/{name}/messages  → initialize / notifications/initialized / tools/list ...
                             响应经 SSE 连接的 event: message 推送
```

工具描述/Schema 生成：`mcp/ToolSchemaMapper.java`（`toMcpTool` / `buildInputSchema`，type 取 `dataType`，required 数组、default 透传）。

### 3.4 工具调用链路（tools/call）

```
Agent tools/call
  → SDK 分发到注册时的 callHandler 闭包          # McpServerManager.ServerRuntime.syncTools
    闭包只捕获 toolId（不捕获任何配置快照）
  → McpServerManager.callTool(toolId, arguments)
  → GatewayToolInvoker.invoke(toolId, args)      # service/GatewayToolInvoker.java
    - 现查 DB：tool + server 最新配置（这就是"改配置不用重注册"的关键）
    - server/tool 被禁用 → 抛错 → isError(true) 结果
  → RestApiExecutor.execute(server, tool, args)  # service/RestApiExecutor.java
    ① 参数取值：args → defaultValue → required 校验
    ② coerce() 按 dataType 转类型（"5"→5L / "true"→true）
    ③ 按 in 放置：path 替换 {name} 占位 / query 追加 / header 覆盖 / body 收集为 JSON map
    ④ applyAuth() 注入 server 级鉴权（BEARER/BASIC/API_KEY），工具 header 参数可覆盖
    ⑤ RestTemplate.exchange，非 2xx 抛异常
  → 响应体包装为 CallToolResult（文本内容 + isError）
```

异常不抛出协议层，一律转成 `isError: true` 的 CallToolResult（Agent 能看到失败原因）。

旁路：`POST /api/tools/{id}/invoke` 直接走 ③④⑤，供 UI 调试，不经过 MCP。

### 3.5 配置变更同步（去指纹设计的核心）

旧设计的痛点：callHandler 闭包捕获注册时刻的配置快照，鉴权一变就得用"指纹"比对并重建工具。

现设计：
- **调用时解析**（3.4）：baseUrl/鉴权/参数改了，下一次调用自然用新值，**零同步动作**
- 只有"工具集合或工具 spec（name/description/inputSchema）变化"才需要动作，`ServerRuntime.syncTools` 做轻量 diff：
  - 工具被删/禁用 → `removeTool(name)`
  - spec 变化（`McpSchema.Tool` 是 record，值相等比较）→ 先 remove 再 add
  - add/remove 由 SDK 自动向已连接客户端广播 `notifications/tools/list_changed`

### 3.6 网关测试（chat 对话式测试）

```
UI views/gateway-test/ → POST /api/chat → chat/ChatController → chat/ChatService
```
- 进程内 function-calling 测试台，不走 MCP 回环
- 把所有 enabled server 的 enabled 工具包成 Spring AI `ToolCallback`（chat 内工具名加 `{server}_` 前缀避免跨 server 撞名），复用 `ToolSchemaMapper` + `GatewayToolInvoker`
- `chat/ChatConfig.java`：仅当环境变量 `DEEPSEEK_API_KEY` 存在才创建 ChatClient bean（`@ConditionalOnProperty`），未配置时接口返回友好提示，不影响其他功能

---

## 4. 代码地图

**后端** `mcp-gateway-server/src/main/java/com/aura/mcp/gateway/`

| 包 | 类 | 职责 |
|---|---|---|
| entity | `McpServerEntity` / `GatewayTool` / `ToolParameter` | 见 §2 |
| repository | `McpServerRepository` / `GatewayToolRepository` | JPA，按名/按 server 查询 |
| service | `McpServerService` | server CRUD + 校验 + 发变更事件 |
| service | `GatewayToolService` | tool CRUD/batch + 校验 + ToolView 组装 |
| service | `GatewayToolInvoker` | 调用时按 toolId 现查配置并执行（去指纹的关键） |
| service | `RestApiExecutor` | 参数类型转换、HTTP 组装与执行、下游鉴权注入 |
| mcp | `McpServerManager` | 核心。挂载/卸载 SDK 传输、工具 diff 同步、请求分发 |
| mcp | `McpRouterConfig` | 静态路由表 `/mcp/{serverName}/...` |
| mcp | `ToolSchemaMapper` | 工具 → MCP Tool/inputSchema |
| mcp | `GatewayConfigChangedEvent` | 配置变更 marker 事件（事务提交后触发同步） |
| controller | `McpServerController` / `GatewayToolController` | 管理 REST API |
| chat | `ChatConfig` / `ChatService` / `ChatController` | 网关测试页后端 |
| config | `AppConfig` | RestTemplate / ObjectMapper bean |

**前端** `mcp-gateway-ui/src/`

| 位置 | 职责 |
|---|---|
| `api/types.ts` + `api/servers.ts` + `api/tools.ts` + `api/http.ts` | 契约类型与 REST 封装（共享 axios 实例） |
| `lib/mcp.ts` | 端点 URL 拼接、协议 label、名称清洗、剪贴板 |
| `views/mcp-servers/` | MCP 服务页（列表 + ServerDialog 表单） |
| `views/gateway-tools/` | 工具页（列表 + ToolDialog 手动新增 + ToolImportDialog OpenAPI 导入 + openapi-parser.ts） |
| `views/dashboard/` | 工作台（统计 + 各 server 端点 URL 列表） |
| `views/gateway-test/` + `api/chat.ts` | 对话式测试页 |
| `components/`（DataTable、useTable 等） | 页面骨架与表格体系（页面约定：`index.tsx` + `<page>.api.ts` + `<page>.data.tsx` + 对话框） |

---

## 5. 关键设计决策（为什么这么写）

1. **一 server 一端点，而不是全局单端点**：工具按 server 隔离，不同 Agent 各取所需；工具名不需要 `{group}_` 前缀，server 内唯一即可。
2. **协议类型是 server 的字段**：SSE（兼容旧客户端）与 Streamable HTTP（新规范）并存，SDK 两种传输都在 classpath 上，挂载时按字段二选一。
3. **调用时解析配置**：闭包只捕获不可变的 toolId，消灭"配置快照 + 指纹 diff"一整类复杂度；代价是每次调用一次 DB 读（本地/内网 PostgreSQL，可忽略）。
4. **OpenAPI 解析放前端**：无新增后端依赖、离线可用；批量提交用 `/tools/batch` 保证原子性（任一冲突整批 409）。
5. **参数类型只有四种标量**（string/integer/number/boolean）：body 只支持扁平 JSON 对象，不支持嵌套 schema——这是当前明确的边界，需要嵌套 body 时要扩展模型。

## 6. 已知约束与注意点

- MCP 客户端必须在 initialize 后发送 `notifications/initialized`，SDK 才处理后续请求（规范要求，主流客户端自动完成）。
- `/api/**` 无认证、CORS 全开：`/api/tools/{id}/invoke` 等于一个受限的 HTTP 出口，仅限内网/本地使用。
- 旧版数据表（`api_group`/`api_endpoint`）与新表（`mcp_server`/`gateway_tool`）不通用，升级后需重新配置。
- 配置持久化在 PostgreSQL；建表语句在 `mcp-gateway-server/src/main/resources/db/schema.sql`（应用以 `ddl-auto: validate` 启动，表必须先由该脚本创建；compose 部署时首启自动执行）。实体变更后要同步更新该文件（重新生成方式见文件头注释）。
- 网关测试页依赖 `DEEPSEEK_API_KEY` 环境变量。
