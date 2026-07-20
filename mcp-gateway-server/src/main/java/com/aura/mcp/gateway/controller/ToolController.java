package com.aura.mcp.gateway.controller;

import com.aura.mcp.gateway.dto.ToolView;
import com.aura.mcp.gateway.entity.ApiEndpoint;
import com.aura.mcp.gateway.service.ApiRegistryService;
import com.aura.mcp.gateway.service.RestApiExecutor;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/tools")
@CrossOrigin(origins = "*")
public class ToolController {

    private final ApiRegistryService registryService;
    private final RestApiExecutor restApiExecutor;

    @GetMapping
    public List<ToolView> list() {
        return registryService.findEnabledTools();
    }

    @PostMapping("/{endpointId}")
    public void enable(@PathVariable Long endpointId) {
        registryService.setEndpointEnabled(endpointId, true);
    }

    @DeleteMapping("/{endpointId}")
    public void disable(@PathVariable Long endpointId) {
        registryService.setEndpointEnabled(endpointId, false);
    }

    /** Executes a tool's underlying REST call (used by the gateway test chat page). */
    @PostMapping("/{endpointId}/invoke")
    public String invoke(@PathVariable Long endpointId,
                         @RequestBody(required = false) Map<String, Object> arguments) {
        ApiEndpoint endpoint = registryService.findEndpointInitialized(endpointId);
        return restApiExecutor.execute(endpoint.getGroup(), endpoint, arguments);
    }
}
