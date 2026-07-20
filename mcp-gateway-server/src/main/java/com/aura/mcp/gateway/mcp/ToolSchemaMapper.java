package com.aura.mcp.gateway.mcp;

import com.aura.mcp.gateway.entity.ApiEndpoint;
import com.aura.mcp.gateway.entity.ApiGroup;
import com.aura.mcp.gateway.entity.ApiParameter;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Builds JSON-Schema-shaped input definitions for gateway tools, shared by the
 * MCP tool registry and the chat test service.
 */
public final class ToolSchemaMapper {

    private ToolSchemaMapper() {
    }

    /** Returns {"type":"object","properties":{...},"required":[...]} for an endpoint. */
    public static Map<String, Object> buildInputSchema(ApiEndpoint endpoint) {
        Map<String, Object> properties = new LinkedHashMap<>();
        List<String> required = new ArrayList<>();
        for (ApiParameter param : endpoint.getParameters()) {
            Map<String, Object> prop = new LinkedHashMap<>();
            prop.put("type", "string");
            prop.put("description", param.getDescription() != null ? param.getDescription() : param.getName());
            if (param.getDefaultValue() != null && !param.getDefaultValue().isEmpty()) {
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

    public static String toolDescription(ApiGroup group, ApiEndpoint endpoint) {
        return endpoint.getDescription() != null ? endpoint.getDescription()
                : group.getName() + " " + endpoint.getName();
    }
}
