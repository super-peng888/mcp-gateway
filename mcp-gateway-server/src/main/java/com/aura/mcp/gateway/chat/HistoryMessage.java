package com.aura.mcp.gateway.chat;

/**
 * One message in the chat history sent by the client (role: "user" | "assistant").
 */
public record HistoryMessage(String role, String content) {
}
