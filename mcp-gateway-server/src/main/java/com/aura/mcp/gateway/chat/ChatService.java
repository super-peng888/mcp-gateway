package com.aura.mcp.gateway.chat;

import com.aura.mcp.gateway.entity.GatewayTool;
import com.aura.mcp.gateway.entity.McpServerEntity;
import com.aura.mcp.gateway.mcp.ToolSchemaMapper;
import com.aura.mcp.gateway.service.GatewayToolInvoker;
import com.aura.mcp.gateway.service.McpServerService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.ai.tool.definition.ToolDefinition;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Chat service for the gateway test page. Exposes the enabled gateway tools to the
 * LLM as function callbacks and lets Spring AI run the tool-calling loop in-process
 * (same registry + invoker the MCP servers use, without an MCP loopback).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ChatService {

    private static final String SYSTEM_PROMPT = """
            你是 MCP 网关的测试助手。网关中已配置的工具以 function 形式提供给你：
            - 当用户询问"当前有哪些 MCP 工具"时，根据工具定义列出名称和说明；
            - 当用户想调用某个工具时，直接发起 function call，并根据返回结果总结给用户；
            - 一律使用中文回答，回答简洁清晰。
            """;
    private static final int MAX_HISTORY = 20;

    private final ObjectProvider<ChatClient> chatClientProvider;
    private final McpServerService serverService;
    private final GatewayToolInvoker toolInvoker;
    private final ObjectMapper objectMapper;

    public String chat(String userMessage, List<HistoryMessage> history) {
        ChatClient chatClient = chatClientProvider.getIfAvailable();
        if (chatClient == null) {
            throw new RuntimeException("未配置 DEEPSEEK_API_KEY 环境变量，聊天功能不可用，请配置后重启服务");
        }
        List<Message> messages = new ArrayList<>();
        history.stream()
                .limit(MAX_HISTORY)
                .forEach(m -> messages.add("assistant".equals(m.role())
                        ? new AssistantMessage(m.content())
                        : new UserMessage(m.content())));

        try {
            String reply = chatClient.prompt()
                    .system(SYSTEM_PROMPT)
                    .messages(messages)
                    .user(userMessage)
                    .toolCallbacks(buildToolCallbacks())
                    .call()
                    .content();
            return reply != null ? reply : "（模型未返回内容）";
        } catch (Exception e) {
            log.error("Chat call failed", e);
            throw new RuntimeException("模型调用失败：" + e.getMessage(), e);
        }
    }

    private List<ToolCallback> buildToolCallbacks() {
        List<ToolCallback> callbacks = new ArrayList<>();
        for (McpServerEntity server : serverService.findAllInitialized()) {
            if (!server.isEnabled()) {
                continue;
            }
            for (GatewayTool tool : server.getTools()) {
                if (tool.isEnabled()) {
                    // Prefixed to keep names unique across servers inside the single chat session.
                    callbacks.add(new GatewayToolCallback(tool, server.getName() + "_" + tool.getName()));
                }
            }
        }
        return callbacks;
    }

    private class GatewayToolCallback implements ToolCallback {

        private final GatewayTool tool;
        private final String toolName;

        GatewayToolCallback(GatewayTool tool, String toolName) {
            this.tool = tool;
            this.toolName = toolName;
        }

        @Override
        public ToolDefinition getToolDefinition() {
            try {
                return ToolDefinition.builder()
                        .name(toolName)
                        .description(ToolSchemaMapper.toolDescription(tool))
                        .inputSchema(objectMapper.writeValueAsString(
                                ToolSchemaMapper.buildInputSchema(tool)))
                        .build();
            } catch (Exception e) {
                throw new IllegalStateException("Failed to build tool definition: " + toolName, e);
            }
        }

        @Override
        public String call(String toolInput) {
            try {
                Map<String, Object> args = toolInput == null || toolInput.isBlank()
                        ? Map.of()
                        : objectMapper.readValue(toolInput, new TypeReference<>() {
                        });
                return toolInvoker.invoke(tool.getId(), args);
            } catch (Exception e) {
                log.error("Tool execution failed: {}", toolName, e);
                return "Execution failed: " + e.getMessage();
            }
        }
    }
}
