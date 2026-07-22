package com.aura.mcp.gateway.service;

import com.aura.mcp.gateway.entity.GatewayTool;
import com.aura.mcp.gateway.entity.McpServerEntity;
import com.aura.mcp.gateway.repository.GatewayToolRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

/**
 * Resolves a tool by id at call time and executes its downstream REST call against the
 * <em>current</em> persisted configuration. MCP call handlers capture only the tool id,
 * so auth/baseUrl/parameter edits take effect without re-registering tools.
 */
@Service
@RequiredArgsConstructor
public class GatewayToolInvoker {

    private final GatewayToolRepository toolRepository;
    private final RestApiExecutor restApiExecutor;

    @Transactional(readOnly = true)
    public String invoke(Long toolId, Map<String, Object> args) {
        GatewayTool tool = toolRepository.findById(toolId)
                .orElseThrow(() -> new IllegalStateException("Tool no longer exists: " + toolId));
        tool.getParameters().size();
        McpServerEntity server = tool.getServer();
        if (!server.isEnabled()) {
            throw new IllegalStateException("MCP server is disabled: " + server.getName());
        }
        if (!tool.isEnabled()) {
            throw new IllegalStateException("Tool is disabled: " + tool.getName());
        }
        return restApiExecutor.execute(server, tool, args);
    }
}
