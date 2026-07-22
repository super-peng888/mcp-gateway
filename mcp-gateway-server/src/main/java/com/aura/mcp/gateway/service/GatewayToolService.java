package com.aura.mcp.gateway.service;

import com.aura.mcp.gateway.dto.ToolView;
import com.aura.mcp.gateway.entity.GatewayTool;
import com.aura.mcp.gateway.entity.McpServerEntity;
import com.aura.mcp.gateway.entity.ToolParameter;
import com.aura.mcp.gateway.mcp.GatewayConfigChangedEvent;
import com.aura.mcp.gateway.repository.GatewayToolRepository;
import com.aura.mcp.gateway.repository.McpServerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class GatewayToolService {

    /** Tool names are advertised as MCP tool names and must match the MCP name rules. */
    private static final Pattern NAME_PATTERN = Pattern.compile("^[a-zA-Z0-9_-]{1,64}$");
    private static final Set<String> METHODS = Set.of("GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS");
    private static final Set<String> PARAM_INS = Set.of("path", "query", "header", "body");
    private static final Set<String> DATA_TYPES = Set.of("string", "integer", "number", "boolean");

    private final McpServerRepository serverRepository;
    private final GatewayToolRepository toolRepository;
    private final ApplicationEventPublisher eventPublisher;

    /** All tools across all servers, with server context for listing pages. */
    @Transactional(readOnly = true)
    public List<ToolView> findAllViews() {
        List<ToolView> views = new ArrayList<>();
        for (McpServerEntity server : serverRepository.findAll()) {
            for (GatewayTool tool : server.getTools()) {
                tool.getParameters().size();
                views.add(toView(server, tool));
            }
        }
        return views;
    }

    @Transactional(readOnly = true)
    public List<GatewayTool> findByServer(Long serverId) {
        List<GatewayTool> tools = toolRepository.findByServerId(serverId);
        tools.forEach(t -> t.getParameters().size());
        return tools;
    }

    @Transactional(readOnly = true)
    public GatewayTool findById(Long toolId) {
        GatewayTool tool = toolRepository.findById(toolId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Tool not found: " + toolId));
        tool.getParameters().size();
        return tool;
    }

    @Transactional
    public GatewayTool create(Long serverId, GatewayTool tool) {
        McpServerEntity server = findServer(serverId);
        validate(tool);
        ensureNameFree(serverId, tool.getName(), null);
        tool.setId(null);
        tool.setServer(server);
        GatewayTool saved = toolRepository.save(tool);
        eventPublisher.publishEvent(new GatewayConfigChangedEvent());
        return saved;
    }

    /** Bulk creation used by OpenAPI import; the whole batch fails on any conflict. */
    @Transactional
    public List<GatewayTool> createBatch(Long serverId, List<GatewayTool> tools) {
        McpServerEntity server = findServer(serverId);
        Set<String> seen = new HashSet<>();
        for (GatewayTool tool : tools) {
            validate(tool);
            ensureNameFree(serverId, tool.getName(), null);
            if (!seen.add(tool.getName())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Duplicate tool name in batch: " + tool.getName());
            }
        }
        List<GatewayTool> saved = new ArrayList<>();
        for (GatewayTool tool : tools) {
            tool.setId(null);
            tool.setServer(server);
            saved.add(toolRepository.save(tool));
        }
        eventPublisher.publishEvent(new GatewayConfigChangedEvent());
        return saved;
    }

    @Transactional
    public GatewayTool update(Long toolId, GatewayTool tool) {
        GatewayTool existing = findById(toolId);
        validate(tool);
        ensureNameFree(existing.getServer().getId(), tool.getName(), toolId);
        existing.setName(tool.getName());
        existing.setMethod(tool.getMethod().toUpperCase());
        existing.setPath(tool.getPath());
        existing.setDescription(tool.getDescription());
        existing.setEnabled(tool.isEnabled());
        existing.getParameters().clear();
        if (tool.getParameters() != null) {
            existing.getParameters().addAll(tool.getParameters());
        }
        GatewayTool saved = toolRepository.save(existing);
        eventPublisher.publishEvent(new GatewayConfigChangedEvent());
        return saved;
    }

    @Transactional
    public void delete(Long toolId) {
        toolRepository.deleteById(toolId);
        eventPublisher.publishEvent(new GatewayConfigChangedEvent());
    }

    private ToolView toView(McpServerEntity server, GatewayTool tool) {
        return new ToolView(
                tool.getId(),
                server.getId(),
                server.getName(),
                server.getTransport(),
                server.isEnabled(),
                tool.getName(),
                tool.getDescription(),
                tool.getMethod(),
                tool.getPath(),
                tool.isEnabled(),
                tool.getParameters());
    }

    private McpServerEntity findServer(Long serverId) {
        return serverRepository.findById(serverId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "MCP server not found: " + serverId));
    }

    private void ensureNameFree(Long serverId, String name, Long excludeToolId) {
        toolRepository.findByServerIdAndName(serverId, name).ifPresent(conflict -> {
            if (excludeToolId == null || !conflict.getId().equals(excludeToolId)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Tool name already exists in this server: " + name);
            }
        });
    }

    private void validate(GatewayTool tool) {
        if (!StringUtils.hasText(tool.getName()) || !NAME_PATTERN.matcher(tool.getName()).matches()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Tool name must match ^[a-zA-Z0-9_-]{1,64}$: " + tool.getName());
        }
        if (!StringUtils.hasText(tool.getMethod()) || !METHODS.contains(tool.getMethod().toUpperCase())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Method must be one of " + METHODS + ": " + tool.getMethod());
        }
        if (!StringUtils.hasText(tool.getPath())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Path must not be empty");
        }
        Set<String> paramNames = new HashSet<>();
        for (ToolParameter param : tool.getParameters()) {
            if (!StringUtils.hasText(param.getName())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Parameter name must not be empty");
            }
            if (!paramNames.add(param.getName())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Duplicate parameter name: " + param.getName());
            }
            if (param.getIn() == null || !PARAM_INS.contains(param.getIn().toLowerCase())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Parameter 'in' must be one of " + PARAM_INS + ": " + param.getIn());
            }
            if (param.getDataType() != null && !DATA_TYPES.contains(param.getDataType().toLowerCase())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Parameter dataType must be one of " + DATA_TYPES + ": " + param.getDataType());
            }
        }
    }
}
