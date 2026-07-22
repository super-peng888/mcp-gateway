package com.aura.mcp.gateway.dto;

import com.aura.mcp.gateway.entity.ToolParameter;

import java.util.List;

/** A tool with its owning server's context, for cross-server listing pages. */
public record ToolView(
        Long id,
        Long serverId,
        String serverName,
        String serverTransport,
        boolean serverEnabled,
        String name,
        String description,
        String method,
        String path,
        boolean enabled,
        List<ToolParameter> parameters) {
}
