package com.aura.mcp.gateway.mcp;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.function.RouterFunction;
import org.springframework.web.servlet.function.RouterFunctions;
import org.springframework.web.servlet.function.ServerResponse;

/**
 * Static route table for all gateway-hosted MCP servers. Paths are stable; the
 * {@link McpServerManager#dispatch} resolves the actual mounted transport by server
 * name, so servers can be mounted/unmounted at runtime without touching the route table.
 */
@Configuration
public class McpRouterConfig {

    @Bean
    public RouterFunction<ServerResponse> gatewayMcpRoutes(McpServerManager manager) {
        return RouterFunctions.route()
                // Legacy HTTP+SSE transport
                .GET("/mcp/{serverName}/sse", manager::dispatch)
                .POST("/mcp/{serverName}/messages", manager::dispatch)
                // Streamable HTTP transport (session open/message/close)
                .GET("/mcp/{serverName}/mcp", manager::dispatch)
                .POST("/mcp/{serverName}/mcp", manager::dispatch)
                .DELETE("/mcp/{serverName}/mcp", manager::dispatch)
                .build();
    }
}
