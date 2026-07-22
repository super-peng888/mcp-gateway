package com.aura.mcp.gateway.controller;

import com.aura.mcp.gateway.dto.ToolView;
import com.aura.mcp.gateway.entity.GatewayTool;
import com.aura.mcp.gateway.service.GatewayToolInvoker;
import com.aura.mcp.gateway.service.GatewayToolService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class GatewayToolController {

    private final GatewayToolService toolService;
    private final GatewayToolInvoker toolInvoker;

    /** All tools across all servers, with server context. */
    @GetMapping("/tools")
    public List<ToolView> listAll() {
        return toolService.findAllViews();
    }

    @GetMapping("/servers/{serverId}/tools")
    public List<GatewayTool> listByServer(@PathVariable Long serverId) {
        return toolService.findByServer(serverId);
    }

    @PostMapping("/servers/{serverId}/tools")
    @ResponseStatus(HttpStatus.CREATED)
    public GatewayTool create(@PathVariable Long serverId, @RequestBody GatewayTool tool) {
        return toolService.create(serverId, tool);
    }

    /** Bulk creation used by OpenAPI import; the whole batch fails on any conflict. */
    @PostMapping("/servers/{serverId}/tools/batch")
    @ResponseStatus(HttpStatus.CREATED)
    public List<GatewayTool> createBatch(@PathVariable Long serverId, @RequestBody List<GatewayTool> tools) {
        return toolService.createBatch(serverId, tools);
    }

    @PutMapping("/tools/{id}")
    public GatewayTool update(@PathVariable Long id, @RequestBody GatewayTool tool) {
        return toolService.update(id, tool);
    }

    @DeleteMapping("/tools/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        toolService.delete(id);
    }

    /** Executes a tool's underlying REST call directly (test/debug). */
    @PostMapping("/tools/{id}/invoke")
    public String invoke(@PathVariable Long id,
                         @RequestBody(required = false) Map<String, Object> arguments) {
        return toolInvoker.invoke(id, arguments);
    }
}
