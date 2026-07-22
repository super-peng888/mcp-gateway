package com.aura.mcp.gateway.controller;

import com.aura.mcp.gateway.entity.McpServerEntity;
import com.aura.mcp.gateway.service.McpServerService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/servers")
@CrossOrigin(origins = "*")
public class McpServerController {

    private final McpServerService serverService;

    @GetMapping
    public List<McpServerEntity> list() {
        return serverService.findAllInitialized();
    }

    @GetMapping("/{id}")
    public McpServerEntity get(@PathVariable Long id) {
        return serverService.findByIdInitialized(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public McpServerEntity create(@RequestBody McpServerEntity server) {
        return serverService.create(server);
    }

    @PutMapping("/{id}")
    public McpServerEntity update(@PathVariable Long id, @RequestBody McpServerEntity server) {
        return serverService.update(id, server);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        serverService.delete(id);
    }
}
