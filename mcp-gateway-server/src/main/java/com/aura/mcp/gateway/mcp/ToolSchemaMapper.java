package com.aura.mcp.gateway.mcp;

import com.aura.mcp.gateway.entity.GatewayTool;
import com.aura.mcp.gateway.entity.ToolParameter;
import io.modelcontextprotocol.spec.McpSchema;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Builds JSON-Schema-shaped input definitions and {@link McpSchema.Tool} specs for
 * gateway tools, shared by the MCP server manager and the chat test service.
 */
public final class ToolSchemaMapper {

    private ToolSchemaMapper() {
    }

    /** Returns {"type":"object","properties":{...},"required":[...]} for a tool. */
    public static Map<String, Object> buildInputSchema(GatewayTool tool) {
        Map<String, Object> properties = new LinkedHashMap<>();
        List<String> required = new ArrayList<>();
        for (ToolParameter param : tool.getParameters()) {
            Map<String, Object> prop = new LinkedHashMap<>();
            prop.put("type", StringUtils.hasText(param.getDataType()) ? param.getDataType() : "string");
            prop.put("description", StringUtils.hasText(param.getDescription())
                    ? param.getDescription() : param.getName());
            if (StringUtils.hasText(param.getDefaultValue())) {
                prop.put("default", param.getDefaultValue());
            }
            properties.put(param.getName(), prop);
            if (param.isRequired()) {
                required.add(param.getName());
            }
        }
        Map<String, Object> schema = new LinkedHashMap<>();
        schema.put("type", "object");
        schema.put("properties", properties);
        schema.put("required", required);
        return schema;
    }

    /** Builds the MCP tool descriptor advertised via tools/list. */
    public static McpSchema.Tool toMcpTool(GatewayTool tool) {
        Map<String, Object> schema = buildInputSchema(tool);
        @SuppressWarnings("unchecked")
        Map<String, Object> properties = (Map<String, Object>) schema.get("properties");
        @SuppressWarnings("unchecked")
        List<String> required = (List<String>) schema.get("required");
        return McpSchema.Tool.builder()
                .name(tool.getName())
                .description(toolDescription(tool))
                .inputSchema(new McpSchema.JsonSchema("object", properties, required, null, null, null))
                .build();
    }

    public static String toolDescription(GatewayTool tool) {
        return StringUtils.hasText(tool.getDescription()) ? tool.getDescription() : tool.getName();
    }
}
