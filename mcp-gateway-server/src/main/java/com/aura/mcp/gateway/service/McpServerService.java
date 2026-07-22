package com.aura.mcp.gateway.service;

import com.aura.mcp.gateway.entity.GatewayTool;
import com.aura.mcp.gateway.entity.McpServerEntity;
import com.aura.mcp.gateway.mcp.GatewayConfigChangedEvent;
import com.aura.mcp.gateway.repository.McpServerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class McpServerService {

    /** Server names double as MCP endpoint path segments and must stay URL-safe. */
    private static final Pattern NAME_PATTERN = Pattern.compile("^[a-zA-Z0-9_-]{1,64}$");
    private static final Set<String> TRANSPORTS =
            Set.of(McpServerEntity.TRANSPORT_SSE, McpServerEntity.TRANSPORT_STREAMABLE_HTTP);

    private final McpServerRepository serverRepository;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional(readOnly = true)
    public List<McpServerEntity> findAll() {
        return serverRepository.findAll();
    }

    /** Returns all servers with tools and parameters initialized; safe outside a session. */
    @Transactional(readOnly = true)
    public List<McpServerEntity> findAllInitialized() {
        List<McpServerEntity> servers = serverRepository.findAll();
        servers.forEach(s -> s.getTools().forEach(t -> t.getParameters().size()));
        return servers;
    }

    @Transactional(readOnly = true)
    public McpServerEntity findById(Long id) {
        return serverRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "MCP server not found: " + id));
    }

    @Transactional(readOnly = true)
    public McpServerEntity findByIdInitialized(Long id) {
        McpServerEntity server = findById(id);
        server.getTools().forEach(t -> t.getParameters().size());
        return server;
    }

    @Transactional
    public McpServerEntity create(McpServerEntity server) {
        validate(server);
        if (serverRepository.findByName(server.getName()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "MCP server name already exists: " + server.getName());
        }
        bindTools(server);
        McpServerEntity saved = serverRepository.save(server);
        eventPublisher.publishEvent(new GatewayConfigChangedEvent());
        return saved;
    }

    @Transactional
    public McpServerEntity update(Long id, McpServerEntity server) {
        McpServerEntity existing = findById(id);
        validate(server);
        if (!existing.getName().equals(server.getName())
                && serverRepository.findByName(server.getName()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "MCP server name already exists: " + server.getName());
        }
        existing.setName(server.getName());
        existing.setDescription(server.getDescription());
        existing.setTransport(server.getTransport());
        existing.setEnabled(server.isEnabled());
        existing.setBaseUrl(server.getBaseUrl());
        existing.setAuthType(server.getAuthType() != null ? server.getAuthType() : "NONE");
        existing.setAuthToken(server.getAuthToken());
        existing.setAuthUsername(server.getAuthUsername());
        existing.setAuthPassword(server.getAuthPassword());
        existing.setAuthHeaderName(server.getAuthHeaderName());
        existing.setAuthHeaderValue(server.getAuthHeaderValue());
        McpServerEntity saved = serverRepository.save(existing);
        eventPublisher.publishEvent(new GatewayConfigChangedEvent());
        return saved;
    }

    @Transactional
    public void delete(Long id) {
        serverRepository.deleteById(id);
        eventPublisher.publishEvent(new GatewayConfigChangedEvent());
    }

    private void validate(McpServerEntity server) {
        if (!StringUtils.hasText(server.getName()) || !NAME_PATTERN.matcher(server.getName()).matches()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Server name must match ^[a-zA-Z0-9_-]{1,64}$: " + server.getName());
        }
        if (server.getTransport() == null || !TRANSPORTS.contains(server.getTransport())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Transport must be one of " + TRANSPORTS + ": " + server.getTransport());
        }
        if (!StringUtils.hasText(server.getBaseUrl())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Base URL must not be empty");
        }
    }

    private void bindTools(McpServerEntity server) {
        if (server.getTools() != null) {
            for (GatewayTool tool : server.getTools()) {
                tool.setServer(server);
            }
        }
    }
}
