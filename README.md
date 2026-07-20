# MCP Gateway

一个 **REST 接口自动转 MCP Tools** 的网关服务。管理员在 UI 里注册下游 REST API Group 与 Endpoint，Agent 通过标准 MCP over SSE 连接即可发现工具并调用，无需为每个下游服务手写 MCP Server。

> 说明：由于当前环境无法从 Maven Central/阿里云下载 `spring-ai-starter-mcp-server-webmvc:1.0.0`，本服务采用**手动实现 MCP over SSE**（JSON-RPC 2.0 + SSE），仅依赖 Spring Boot / Web / JPA / H2。

---

## 项目结构

```
mcp-gateway/
├── mcp-gateway-server/      # Spring Boot 后端（端口 8082）
│   ├── src/main/java/...
│   └── pom.xml
└── mcp-gateway-ui/          # React 18/19 + TypeScript + shadcn/ui 前端（端口 5173）
    ├── src/...
    ├── package.json
    └── vite.config.ts
```

---

## 技术栈

- 后端：Spring Boot 3.3.5 + Spring Data JPA + H2（文件数据库）
- 前端：React + TypeScript + shadcn/ui (radix-nova) + Ant Design 6 + Tailwind CSS v4 + Axios
- 设计：Luminous Aether: Blue-Green（玻璃拟态、Cyan–Emerald 渐变强调色、Hanken Grotesk 字体）
- 协议：MCP over SSE（JSON-RPC 2.0）

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

## 启动后端

```bash
cd mcp-gateway/mcp-gateway-server
mvn clean package -DskipTests
mvn spring-boot:run -DskipTests
```

后端默认端口 `8082`，H2 控制台：`http://localhost:8082/h2-console`。

---

## 启动前端

```bash
cd mcp-gateway/mcp-gateway-ui
npm install
npm run dev
```

前端默认端口 `5173`，代理已配置到 `http://localhost:8082`。前端页面不依赖后端启动即可正常加载，后端不可用时仅数据区域提示不可用。

---

## 使用流程

### 1. 注册 API Group

打开 `http://localhost:5173`，在 Protocol Config 页面：

- 点击右上角 **New Endpoint** 或表格空白处右键 → **New API Group**
- 填写 Group 信息：
  - **Name**：服务标识，会作为 tool name 前缀，例如 `httpbin`
  - **Base URL**：下游服务根地址，例如 `https://httpbin.org`
  - **Description**：描述
- 在对话框内动态添加 **Endpoints**：
  - `name`：会作为 tool name 后缀，例如 `getIp`
  - `method` / `path`：HTTP 方法路径
  - `parameters`：支持 `path` / `query` / `header` / `body`

最终生成的 MCP tool name 为 `{groupName}_{endpointName}`，例如 `httpbin_getIp`。

表格每一行支持**右键菜单**（ContextMenu），包含 Edit / Delete 操作。

### 2. Gateway Tools 页面

访问 `http://localhost:5173/gateway-tools`，可查看由已注册 API Group / Endpoint 自动衍生的工具列表：

- 每一行对应一个 Endpoint，Gateway ID 为所属 Group
- Tool ID 为 `{groupName}_{endpointName}`
- 支持按 Gateway ID / Tool ID 过滤、分页
- 行内操作：Edit / Delete
- 右键菜单：Refresh Data / Gateway Config
- 点击 **New Tool** 或行内 Edit 打开 `Configure Gateway Tool` 弹窗

> 当前工具元数据（type、version、protocol）由前端根据 endpoint 信息推导/占位，持久化逻辑待后端扩展。

### 3. Agent 连接 MCP Gateway

Agent 使用 SSE 传输连接：

```
GET http://localhost:8082/mcp/sse
```

连接成功后，服务端会先发送 `endpoint` 事件，内容类似：

```
event: endpoint
data: http://localhost:8082/mcp/messages?sessionId=xxxxx
```

Agent 向该 URL POST JSON-RPC 请求。

### 4. 初始化

```bash
curl -X POST "http://localhost:8082/mcp/messages?sessionId=xxxxx" \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{}}}'
```

### 5. 获取工具列表

```bash
curl -X POST "http://localhost:8082/mcp/messages?sessionId=xxxxx" \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'
```

### 6. 调用工具

```bash
curl -X POST "http://localhost:8082/mcp/messages?sessionId=xxxxx" \
  -H 'Content-Type: application/json' \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "httpbin_get",
      "arguments": {"foo": "hello"}
    }
  }'
```

响应通过 SSE `message` 事件返回：

```
event: message
data: {"jsonrpc":"2.0","id":3,"result":{"content":[{"type":"text","text":"..."}],"isError":false}}
```

---

## 在 Agent 中配置

以支持 MCP SSE 的 Agent 为例：

```json
{
  "mcpServers": {
    "aura-gateway": {
      "url": "http://localhost:8082/mcp/sse"
    }
  }
}
```

Agent 会自动拉取 `tools/list`，并在需要时调用 `tools/call`。

---

## 已实现的方法

- `initialize`
- `tools/list`
- `tools/call`

后续可按 MCP 规范扩展 `notifications/initialized`、`tools/list_changed` 等。

---

## 注意事项

- H2 使用文件数据库 `./data/mcp-gateway`，重启后数据保留。
- `path` 类型参数必须在 `path` 中存在同名占位符，例如 `/users/{id}`。
- `body` 类型参数会合并成一个 JSON body，仅对 POST/PUT/PATCH 生效。
- 如果不需要前端，可单独使用后端，通过 `/api/registry` CRUD 管理 API。
