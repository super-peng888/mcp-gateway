package com.aura.mcp.gateway.mcp;

/**
 * Marker event published after any MCP server / tool config mutation commits.
 * {@link McpServerManager} listens and re-syncs mounted servers and tools.
 */
public record GatewayConfigChangedEvent() {
}
