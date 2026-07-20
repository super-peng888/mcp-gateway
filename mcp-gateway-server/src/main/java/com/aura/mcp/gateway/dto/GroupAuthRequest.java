package com.aura.mcp.gateway.dto;

/**
 * Request body for updating a group's downstream auth config.
 */
public record GroupAuthRequest(
        String authType,
        String authToken,
        String authUsername,
        String authPassword,
        String authHeaderName,
        String authHeaderValue) {
}
