# MCP Gateway

一个 **REST 接口自动转 MCP Tools** 的网关服务。管理员在 UI 里配置 MCP Server（选择传输协议），并从 OpenAPI 导入或手动新增工具；Agent 通过标准 MCP 协议连接对应 Server 的端点即可发现工具并调用，无需为每个下游服务手写 MCP Server。

> 协议层基于官方 MCP Java SDK（`io.modelcontextprotocol.sdk` 0.18.x，经 `spring-ai-starter-mcp-server-webmvc` 引入），同时支持 **Streamable HTTP**（MCP 2025-03-26+）与旧版 **HTTP+SSE** 两种传输。应用侧只做"配置 → MCP 工具"的映射与动态挂载。

---

## 项目结构

```
mcp-gateway/
├── mcp-gateway-server/      # Spring Boot 后端（端口 8082）
│   ├── src/main/java/...
│   ├── src/main/resources/db/schema.sql   # PostgreSQL 建表语句（迁移用）
│   ├── Dockerfile
│   └── pom.xml
├── mcp-gateway-ui/          # React 19 + TypeScript + shadcn/ui 前端（端口 5173）
│   ├── src/...
│   ├── Dockerfile + nginx.conf
│   ├── package.json
│   └── vite.config.ts
└── docker-compose.yml       # 一键部署（postgres + server + ui）
```

---

## 技术栈

- 后端：Spring Boot 3.5 + Spring Data JPA + PostgreSQL + MCP Java SDK 0.18
- 前端：React + TypeScript + shadcn/ui (radix-nova) + Ant Design 6 + Tailwind CSS v4 + Axios
- 设计：Luminous Aether: Blue-Green（玻璃拟态、Cyan–Emerald 渐变强调色、Hanken Grotesk 字体）
- 协议：Streamable HTTP / HTTP+SSE（JSON-RPC 2.0）

---

## 环境要求

- JDK 17+
- Maven 3.6+
- Node.js 18+ / npm 9+

本环境默认 Java 1.8，JDK 17 位于 `/c/MySoftware/jdk-17.0.15`，编译前请设置：

```bash
export JAVA_HOME=/c/MySoftware/jdk-17.0.15
export PATH=$JAVA_HOME/bin:$PATH
```

---

## 方式一：Docker Compose 一键部署（推荐）

```bash
# 先在宿主机打包后端 jar（容器内无法访问 Maven Central，依赖宿主机本地仓库缓存）
cd mcp-gateway-server && mvn clean package -DskipTests && cd ..
docker compose up --build -d
```

- UI：`http://localhost:8080`
- 后端（管理 API + MCP 端点）：`http://localhost:8082`
- PostgreSQL：`localhost:5432`（`postgres/postgres`，库名 `mcp_gateway`）
- 首次启动自动执行 `mcp-gateway-server/src/main/resources/db/schema.sql` 建表
- 重置数据库：`docker compose down -v`（清空数据卷后重新初始化）
- 覆盖配置：环境变量 `DB_USERNAME` / `DB_PASSWORD` / `PG_PORT` / `SERVER_PORT` / `DEEPSEEK_API_KEY`

---

## 方式二：本地开发

### 1. 准备数据库

需要一个 PostgreSQL 实例并建好表：

```bash
# 例如用 Docker 起一个（也可只用 compose 里的 postgres 服务）
docker run -d --name mcp-pg -e POSTGRES_DB=mcp_gateway -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16-alpine
psql -h localhost -U postgres -d mcp_gateway -f mcp-gateway-server/src/main/resources/db/schema.sql
```

### 2. 启动后端

```bash
cd mcp-gateway/mcp-gateway-server
mvn clean package -DskipTests
mvn spring-boot:run -DskipTests
```

后端默认端口 `8082`，连接 `jdbc:postgresql://localhost:5432/mcp_gateway`。数据源可用环境变量覆盖：`DB_URL` / `DB_USERNAME` / `DB_PASSWORD`。JPA 为 `ddl-auto: validate`，表结构以 `db/schema.sql` 为准，实体变更后需同步更新该文件（重新生成方式见文件头注释）。

---

## 启动前端（本地开发）

```bash
cd mcp-gateway/mcp-gateway-ui
npm install
npm run dev
```

前端默认端口 `5173`，代理已配置到 `http://localhost:8082`。前端页面不依赖后端启动即可正常加载，后端不可用时仅数据区域提示不可用。

---

## 使用流程

### 1. 配置 MCP Server

打开 `http://localhost:5173`，进入 **MCP 服务** 页面：

- 点击 **New Server**，填写：
  - **Name**：服务标识（`^[a-zA-Z0-9_-]{1,64}$`），同时是 MCP 端点的路径段
  - **协议类型**：
    - `Streamable HTTP`（推荐，MCP 2025-03-26+）→ 暴露 `http://localhost:8082/mcp/{name}/mcp`
    - `SSE`（旧版，兼容老客户端）→ 暴露 `http://localhost:8082/mcp/{name}/sse`
  - **Base URL**：下游 REST 服务根地址，例如 `https://httpbin.org`
  - **鉴权**：NONE / BEARER / BASIC / API_KEY，对该 Server 下所有工具调用生效
- 表格内可直接开关启用状态；禁用后该 Server 的 MCP 端点立即卸载（404）。

### 2. 配置工具（两种来源）

进入 **MCP 工具** 页面：

- **从 OpenAPI 导入**：选择目标 Server，上传 Swagger 2.0 / OpenAPI 3.x JSON 文件，勾选 operations 后批量生成工具。参数位置（path/query/header/body）与数据类型（string/integer/number/boolean）自动从 spec 推断。
- **手动新增**：选择 Server，填写 `name`（MCP 工具名）、`method` / `path`、描述，并在参数表中逐个声明参数的 `in`（path/query/header/body）与 `dataType`。

工具创建后即时生效（SDK 自动向已连接客户端广播 `tools/list_changed`）；禁用工具即从 `tools/list` 移除。

### 3. Agent 连接

按 Server 的协议类型选择连接方式：

```json
{
  "mcpServers": {
    "httpbin-streamable": {
      "url": "http://localhost:8082/mcp/httpbin/mcp"
    },
    "httpbin-legacy-sse": {
      "url": "http://localhost:8082/mcp/httpbin/sse"
    }
  }
}
```

每个 Server 只暴露自己的工具，工具名即配置的工具 `name`（不再带分组前缀）。

### 4. 验证（以 Streamable HTTP 为例）

```bash
# initialize（响应头返回 Mcp-Session-Id，后续请求携带）
curl -X POST "http://localhost:8082/mcp/httpbin/mcp" \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"curl","version":"1.0"}}}'

# 必须先发送 initialized 通知，SDK 才会处理后续请求
curl -X POST "http://localhost:8082/mcp/httpbin/mcp" \
  -H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream' \
  -H 'Mcp-Session-Id: <sessionId>' \
  -d '{"jsonrpc":"2.0","method":"notifications/initialized"}'

# tools/list / tools/call
curl -X POST "http://localhost:8082/mcp/httpbin/mcp" \
  -H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream' \
  -H 'Mcp-Session-Id: <sessionId>' \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'
```

SSE Server 走旧版流程：`GET /mcp/{name}/sse` 拿到 `endpoint` 事件（`/mcp/{name}/messages?sessionId=...`），再向该 URL POST JSON-RPC（同样需要 `notifications/initialized`）。

---

## 管理 REST API

```
GET/POST         /api/servers              GET/PUT/DELETE /api/servers/{id}
GET              /api/tools                （跨 Server 工具视图）
GET/POST         /api/servers/{id}/tools   POST /api/servers/{id}/tools/batch（OpenAPI 导入）
PUT/DELETE       /api/tools/{id}           POST /api/tools/{id}/invoke（直接调用测试）
POST             /api/chat                 （网关测试页，需 DEEPSEEK_API_KEY 环境变量）
```

---

## 架构说明

> 完整的业务流程梳理与代码导读见 [docs/business-flows.md](docs/business-flows.md)。

- **动态挂载**：`McpServerManager` 为每个启用的 MCP Server 创建一个官方 SDK 传输实例（`WebMvcStreamableServerTransportProvider` 或 `WebMvcSseServerTransportProvider`），经 `/mcp/{serverName}/...` 静态路由表按名称分发；Server 增删/禁用/改协议时动态挂载与卸载。
- **调用时解析**：MCP call handler 只捕获工具 id，调用时现查数据库（baseUrl/鉴权/参数全读最新值），因此修改配置无需重新注册工具；仅工具增删/改名/定义变化会触发 `tools/list_changed`。
- **类型化参数**：参数声明 `dataType`（string/integer/number/boolean），inputSchema 按类型生成，调用前对参数做类型转换后放入 path/query/header/body。

---

## 注意事项

- 配置持久化在 PostgreSQL（compose 部署时为 `pgdata` 数据卷）；建表语句在 `mcp-gateway-server/src/main/resources/db/schema.sql`，实体变更后需同步更新。
- `path` 类型参数必须在 `path` 中存在同名占位符，例如 `/users/{id}`。
- `body` 类型参数会合并成一个 JSON body，仅对 POST/PUT/PATCH 生效。
- 网关测试页（对话式工具测试）需要设置 `DEEPSEEK_API_KEY` 环境变量，未设置时该功能给出友好提示、不影响其他功能。
- 如果不需要前端，可单独使用后端，通过 `/api/servers` + `/api/tools` CRUD 管理配置。
