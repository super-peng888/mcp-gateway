package com.aura.mcp.gateway.mcp;

import com.aura.mcp.gateway.entity.ApiEndpoint;
import com.aura.mcp.gateway.entity.ApiGroup;
import com.aura.mcp.gateway.service.ApiRegistryService;
import com.aura.mcp.gateway.service.RestApiExecutor;
import io.modelcontextprotocol.server.McpServerFeatures;
import io.modelcontextprotocol.server.McpSyncServer;
import io.modelcontextprotocol.spec.McpSchema;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Registers every persisted REST endpoint as an MCP tool on the framework-managed
 * {@link McpSyncServer} (session handling, JSON-RPC and protocol negotiation are
 * handled by the MCP Java SDK auto-configured by Spring AI).
 *
 * <p>Tools are synced from the database at startup and after every registry change
 * (see {@link ApiRegistryChangedEvent}); add/remove automatically emits
 * {@code notifications/tools/list_changed} to connected clients.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class GatewayToolRegistry implements ApplicationRunner {

    private final McpSyncServer mcpSyncServer;
    private final ApiRegistryService registryService;
    private final RestApiExecutor restApiExecutor;

    /** toolName -> fingerprint of the currently registered definition. */
    private final Map<String, ToolFingerprint> registered = new ConcurrentHashMap<>();

    @Override
    public void run(ApplicationArguments args) {
        syncTools();
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onRegistryChanged(ApiRegistryChangedEvent event) {
        syncTools();
    }

    /** Rebuild tool definitions from the database and diff them into the MCP server. */
    public synchronized void syncTools() {
        Map<String, DesiredTool> desired = new LinkedHashMap<>();
        for (ApiGroup group : registryService.findAllInitialized()) {
            for (ApiEndpoint endpoint : group.getEndpoints()) {
                if (!endpoint.isEnabled()) {
                    continue;
                }
                String toolName = registryService.buildToolName(group, endpoint);
                desired.put(toolName, new DesiredTool(group, endpoint,
                        buildTool(group, endpoint, toolName)));
            }
        }

        Iterator<String> it = registered.keySet().iterator();
        while (it.hasNext()) {
            String name = it.next();
            if (!desired.containsKey(name)) {
                mcpSyncServer.removeTool(name);
                it.remove();
                log.info("Removed MCP tool: {}", name);
            }
        }

        desired.forEach((name, d) -> {
            ToolFingerprint next = fingerprint(d);
            ToolFingerprint current = registered.get(name);
            if (next.equals(current)) {
                return;
            }
            if (current != null) {
                mcpSyncServer.removeTool(name);
            }
            mcpSyncServer.addTool(toSpec(d));
            registered.put(name, next);
            log.info("Registered MCP tool: {}", name);
        });
    }

    private ToolFingerprint fingerprint(DesiredTool d) {
        ApiGroup g = d.group();
        return new ToolFingerprint(g.getBaseUrl(), d.tool(), g.getAuthType(), g.getAuthToken(),
                g.getAuthUsername(), g.getAuthPassword(), g.getAuthHeaderName(), g.getAuthHeaderValue());
    }

    private McpServerFeatures.SyncToolSpecification toSpec(DesiredTool d) {
        return McpServerFeatures.SyncToolSpecification.builder()
                .tool(d.tool())
                .callHandler((exchange, request) -> callEndpoint(d.group(), d.endpoint(), request.arguments()))
                .build();
    }

    private McpSchema.CallToolResult callEndpoint(ApiGroup group, ApiEndpoint endpoint, Map<String, Object> arguments) {
        try {
            String body = restApiExecutor.execute(group, endpoint, arguments);
            return McpSchema.CallToolResult.builder().addTextContent(body).isError(false).build();
        } catch (Exception e) {
            log.error("Tool execution failed: {}", endpoint.getName(), e);
            return McpSchema.CallToolResult.builder()
                    .addTextContent("Execution failed: " + e.getMessage())
                    .isError(true)
                    .build();
        }
    }

    private McpSchema.Tool buildTool(ApiGroup group, ApiEndpoint endpoint, String toolName) {
        Map<String, Object> schema = ToolSchemaMapper.buildInputSchema(endpoint);
        @SuppressWarnings("unchecked")
        Map<String, Object> properties = (Map<String, Object>) schema.get("properties");
        @SuppressWarnings("unchecked")
        List<String> required = (List<String>) schema.get("required");
        return McpSchema.Tool.builder()
                .name(toolName)
                .description(ToolSchemaMapper.toolDescription(group, endpoint))
                .inputSchema(new McpSchema.JsonSchema("object", properties, required, null, null, null))
                .build();
    }

    /** Definition parts that must trigger re-registration when changed. */
    private record ToolFingerprint(String baseUrl, McpSchema.Tool tool, String authType, String authToken,
                                   String authUsername, String authPassword, String authHeaderName,
                                   String authHeaderValue) {
    }

    private record DesiredTool(ApiGroup group, ApiEndpoint endpoint, McpSchema.Tool tool) {
    }
}
