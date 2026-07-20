package com.aura.mcp.gateway.dto;

/**
 * Read view of an endpoint that is currently exposed as an MCP tool.
 */
public record ToolView(
        Long endpointId,
        String toolName,
        String endpointName,
        String method,
        String path,
        String description,
        Long groupId,
        String groupName,
        String baseUrl) {
}
