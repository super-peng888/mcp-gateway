package com.aura.mcp.gateway.service;

import com.aura.mcp.gateway.entity.ApiEndpoint;
import com.aura.mcp.gateway.entity.ApiGroup;
import com.aura.mcp.gateway.entity.ApiParameter;
import com.aura.mcp.gateway.dto.GroupAuthRequest;
import com.aura.mcp.gateway.dto.ToolView;
import com.aura.mcp.gateway.mcp.ApiRegistryChangedEvent;
import com.aura.mcp.gateway.repository.ApiEndpointRepository;
import com.aura.mcp.gateway.repository.ApiGroupRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ApiRegistryService {

    private final ApiGroupRepository groupRepository;
    private final ApiEndpointRepository endpointRepository;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional(readOnly = true)
    public List<ApiGroup> findAll() {
        return groupRepository.findAll();
    }

    /** Returns all groups with lazy collections initialized; safe to use outside a session. */
    @Transactional(readOnly = true)
    public List<ApiGroup> findAllInitialized() {
        List<ApiGroup> groups = groupRepository.findAll();
        groups.forEach(g -> g.getEndpoints().forEach(e -> e.getParameters().size()));
        return groups;
    }

    @Transactional(readOnly = true)
    public ApiGroup findById(Long id) {
        return groupRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "API group not found: " + id));
    }

    @Transactional
    public ApiGroup create(ApiGroup group) {
        if (groupRepository.findByName(group.getName()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "API group name already exists: " + group.getName());
        }
        bindEndpoints(group);
        ApiGroup saved = groupRepository.save(group);
        eventPublisher.publishEvent(new ApiRegistryChangedEvent());
        return saved;
    }

    @Transactional
    public ApiGroup update(Long id, ApiGroup group) {
        ApiGroup existing = findById(id);
        existing.setName(group.getName());
        existing.setBaseUrl(group.getBaseUrl());
        existing.setDescription(group.getDescription());
        existing.getEndpoints().clear();
        if (group.getEndpoints() != null) {
            for (ApiEndpoint ep : group.getEndpoints()) {
                ep.setGroup(existing);
                existing.getEndpoints().add(ep);
            }
        }
        ApiGroup saved = groupRepository.save(existing);
        eventPublisher.publishEvent(new ApiRegistryChangedEvent());
        return saved;
    }

    @Transactional
    public void delete(Long id) {
        groupRepository.deleteById(id);
        eventPublisher.publishEvent(new ApiRegistryChangedEvent());
    }

    /** Enables or disables an endpoint's exposure as an MCP tool. */
    @Transactional
    public void setEndpointEnabled(Long endpointId, boolean enabled) {
        ApiEndpoint endpoint = endpointRepository.findById(endpointId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "API endpoint not found: " + endpointId));
        if (endpoint.isEnabled() != enabled) {
            endpoint.setEnabled(enabled);
            endpointRepository.save(endpoint);
            eventPublisher.publishEvent(new ApiRegistryChangedEvent());
        }
    }

    /** Loads an endpoint with parameters and owning group initialized; safe to use outside a session. */
    @Transactional(readOnly = true)
    public ApiEndpoint findEndpointInitialized(Long endpointId) {
        ApiEndpoint endpoint = endpointRepository.findById(endpointId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "API endpoint not found: " + endpointId));
        endpoint.getParameters().size();
        endpoint.getGroup().getBaseUrl();
        return endpoint;
    }

    /** Updates a group's downstream auth config and re-syncs MCP tools (call closures hold credentials). */
    @Transactional
    public ApiGroup updateAuth(Long id, GroupAuthRequest auth) {
        ApiGroup existing = findById(id);
        existing.setAuthType(auth.authType() != null ? auth.authType() : "NONE");
        existing.setAuthToken(auth.authToken());
        existing.setAuthUsername(auth.authUsername());
        existing.setAuthPassword(auth.authPassword());
        existing.setAuthHeaderName(auth.authHeaderName());
        existing.setAuthHeaderValue(auth.authHeaderValue());
        ApiGroup saved = groupRepository.save(existing);
        eventPublisher.publishEvent(new ApiRegistryChangedEvent());
        return saved;
    }

    /** Lists all endpoints currently exposed as MCP tools, with their group context. */
    @Transactional(readOnly = true)
    public List<ToolView> findEnabledTools() {
        List<ToolView> tools = new ArrayList<>();
        for (ApiGroup group : groupRepository.findAll()) {
            for (ApiEndpoint endpoint : group.getEndpoints()) {
                if (endpoint.isEnabled()) {
                    tools.add(new ToolView(
                            endpoint.getId(),
                            buildToolName(group, endpoint),
                            endpoint.getName(),
                            endpoint.getMethod(),
                            endpoint.getPath(),
                            endpoint.getDescription(),
                            group.getId(),
                            group.getName(),
                            group.getBaseUrl()));
                }
            }
        }
        return tools;
    }

    private void bindEndpoints(ApiGroup group) {
        if (group.getEndpoints() != null) {
            for (ApiEndpoint ep : group.getEndpoints()) {
                ep.setGroup(group);
            }
        }
    }

    public String buildToolName(ApiGroup group, ApiEndpoint endpoint) {
        return group.getName() + "_" + endpoint.getName();
    }
}
