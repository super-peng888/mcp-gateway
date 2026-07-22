package com.aura.mcp.gateway.mcp;

import com.aura.mcp.gateway.entity.GatewayTool;
import com.aura.mcp.gateway.entity.McpServerEntity;
import com.aura.mcp.gateway.service.GatewayToolInvoker;
import com.aura.mcp.gateway.service.McpServerService;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.modelcontextprotocol.json.McpJsonMapper;
import io.modelcontextprotocol.json.jackson.JacksonMcpJsonMapper;
import io.modelcontextprotocol.server.McpServer;
import io.modelcontextprotocol.server.McpServerFeatures;
import io.modelcontextprotocol.server.McpSyncServer;
import io.modelcontextprotocol.server.transport.WebMvcSseServerTransportProvider;
import io.modelcontextprotocol.server.transport.WebMvcStreamableServerTransportProvider;
import io.modelcontextprotocol.spec.McpSchema;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.util.StringUtils;
import org.springframework.web.servlet.function.HandlerFunction;
import org.springframework.web.servlet.function.RouterFunction;
import org.springframework.web.servlet.function.ServerRequest;
import org.springframework.web.servlet.function.ServerResponse;

import java.time.Duration;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Mounts one MCP server per configured {@link McpServerEntity} at its own endpoint
 * ({@code /mcp/{name}/sse} or {@code /mcp/{name}/mcp}) using the official MCP Java SDK
 * transports, and keeps registered tools in sync with the database.
 *
 * <p>Call handlers capture only the tool id and resolve configuration at call time
 * (see {@link GatewayToolInvoker}), so auth/baseUrl/parameter edits take effect
 * immediately; only tool add/remove/rename or tool-spec changes trigger
 * {@code notifications/tools/list_changed}.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class McpServerManager implements ApplicationRunner {

    private static final Duration KEEP_ALIVE = Duration.ofSeconds(30);

    private final McpServerService serverService;
    private final GatewayToolInvoker toolInvoker;
    private final ObjectMapper objectMapper;

    /** Mounted servers by server name. */
    private final Map<String, ServerRuntime> runtimes = new ConcurrentHashMap<>();

    @Override
    public void run(ApplicationArguments args) {
        syncAll();
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onConfigChanged(GatewayConfigChangedEvent event) {
        syncAll();
    }

    /** Reconciles mounted MCP servers and their tools with the database state. */
    public synchronized void syncAll() {
        Map<String, McpServerEntity> desired = new LinkedHashMap<>();
        for (McpServerEntity server : serverService.findAllInitialized()) {
            if (server.isEnabled()) {
                desired.put(server.getName(), server);
            }
        }

        Iterator<Map.Entry<String, ServerRuntime>> it = runtimes.entrySet().iterator();
        while (it.hasNext()) {
            Map.Entry<String, ServerRuntime> entry = it.next();
            McpServerEntity target = desired.get(entry.getKey());
            if (target == null || !entry.getValue().transport.equals(target.getTransport())) {
                entry.getValue().close();
                it.remove();
                log.info("Unmounted MCP server: {}", entry.getKey());
            }
        }

        desired.forEach((name, server) -> {
            ServerRuntime runtime = runtimes.computeIfAbsent(name, n -> mount(server));
            runtime.syncTools(server);
        });
    }

    /** Delegates an incoming /mcp/{serverName}/... request to the mounted server's transport. */
    public ServerResponse dispatch(ServerRequest request) throws Exception {
        String serverName = request.pathVariable("serverName");
        ServerRuntime runtime = runtimes.get(serverName);
        if (runtime == null) {
            return ServerResponse.status(HttpStatus.NOT_FOUND).body("Unknown MCP server: " + serverName);
        }
        Optional<HandlerFunction<ServerResponse>> handler = runtime.routerFunction.route(request);
        if (handler.isEmpty()) {
            return ServerResponse.status(HttpStatus.NOT_FOUND).build();
        }
        return handler.get().handle(request);
    }

    private ServerRuntime mount(McpServerEntity server) {
        String base = "/mcp/" + server.getName();
        McpJsonMapper jsonMapper = new JacksonMcpJsonMapper(objectMapper);
        McpSchema.ServerCapabilities capabilities = McpSchema.ServerCapabilities.builder().tools(true).build();

        RouterFunction<ServerResponse> routerFunction;
        McpSyncServer mcpServer;
        if (McpServerEntity.TRANSPORT_SSE.equals(server.getTransport())) {
            WebMvcSseServerTransportProvider provider = WebMvcSseServerTransportProvider.builder()
                    .jsonMapper(jsonMapper)
                    .messageEndpoint(base + "/messages")
                    .sseEndpoint(base + "/sse")
                    .keepAliveInterval(KEEP_ALIVE)
                    .build();
            routerFunction = provider.getRouterFunction();
            var spec = McpServer.sync(provider)
                    .serverInfo(server.getName(), "1.0.0")
                    .capabilities(capabilities);
            if (StringUtils.hasText(server.getDescription())) {
                spec.instructions(server.getDescription());
            }
            mcpServer = spec.build();
        } else {
            WebMvcStreamableServerTransportProvider provider = WebMvcStreamableServerTransportProvider.builder()
                    .jsonMapper(jsonMapper)
                    .mcpEndpoint(base + "/mcp")
                    .keepAliveInterval(KEEP_ALIVE)
                    .build();
            routerFunction = provider.getRouterFunction();
            var spec = McpServer.sync(provider)
                    .serverInfo(server.getName(), "1.0.0")
                    .capabilities(capabilities);
            if (StringUtils.hasText(server.getDescription())) {
                spec.instructions(server.getDescription());
            }
            mcpServer = spec.build();
        }
        log.info("Mounted MCP server '{}' ({}) at {}", server.getName(), server.getTransport(), base);
        return new ServerRuntime(server.getTransport(), routerFunction, mcpServer);
    }

    private McpSchema.CallToolResult callTool(Long toolId, Map<String, Object> arguments) {
        try {
            String body = toolInvoker.invoke(toolId, arguments);
            return McpSchema.CallToolResult.builder().addTextContent(body).isError(false).build();
        } catch (Exception e) {
            log.error("Tool execution failed: {}", toolId, e);
            return McpSchema.CallToolResult.builder()
                    .addTextContent("Execution failed: " + e.getMessage())
                    .isError(true)
                    .build();
        }
    }

    /** A mounted MCP server: its transport routes plus the registered tool set. */
    private final class ServerRuntime {

        private final String transport;
        private final RouterFunction<ServerResponse> routerFunction;
        private final McpSyncServer mcpServer;
        /** toolName -> tool spec as last advertised (diff basis for list_changed). */
        private final Map<String, McpSchema.Tool> registered = new LinkedHashMap<>();

        private ServerRuntime(String transport, RouterFunction<ServerResponse> routerFunction,
                              McpSyncServer mcpServer) {
            this.transport = transport;
            this.routerFunction = routerFunction;
            this.mcpServer = mcpServer;
        }

        private void syncTools(McpServerEntity server) {
            Map<String, GatewayTool> desired = new LinkedHashMap<>();
            for (GatewayTool tool : server.getTools()) {
                if (tool.isEnabled()) {
                    desired.put(tool.getName(), tool);
                }
            }

            registered.keySet().removeIf(name -> {
                if (!desired.containsKey(name)) {
                    mcpServer.removeTool(name);
                    log.info("Removed MCP tool: {}/{}", server.getName(), name);
                    return true;
                }
                return false;
            });

            desired.forEach((name, tool) -> {
                McpSchema.Tool spec = ToolSchemaMapper.toMcpTool(tool);
                if (spec.equals(registered.get(name))) {
                    return;
                }
                if (registered.containsKey(name)) {
                    mcpServer.removeTool(name);
                }
                mcpServer.addTool(McpServerFeatures.SyncToolSpecification.builder()
                        .tool(spec)
                        .callHandler((exchange, request) -> callTool(tool.getId(), request.arguments()))
                        .build());
                registered.put(name, spec);
                log.info("Registered MCP tool: {}/{}", server.getName(), name);
            });
        }

        private void close() {
            try {
                mcpServer.closeGracefully();
            } catch (Exception e) {
                log.warn("Failed to close MCP server gracefully", e);
                mcpServer.close();
            }
        }
    }
}
