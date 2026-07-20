package com.aura.mcp.gateway.controller;

import com.aura.mcp.gateway.dto.GroupAuthRequest;
import com.aura.mcp.gateway.entity.ApiGroup;
import com.aura.mcp.gateway.service.ApiRegistryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/registry")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ApiRegistryController {

    private final ApiRegistryService registryService;

    @GetMapping
    public List<ApiGroup> list() {
        return registryService.findAll();
    }

    @GetMapping("/{id}")
    public ApiGroup get(@PathVariable Long id) {
        return registryService.findById(id);
    }

    @PostMapping
    public ApiGroup create(@RequestBody ApiGroup group) {
        return registryService.create(group);
    }

    @PutMapping("/{id}")
    public ApiGroup update(@PathVariable Long id, @RequestBody ApiGroup group) {
        return registryService.update(id, group);
    }

    @PutMapping("/{id}/auth")
    public ApiGroup updateAuth(@PathVariable Long id, @RequestBody GroupAuthRequest auth) {
        return registryService.updateAuth(id, auth);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        registryService.delete(id);
        return ResponseEntity.ok().build();
    }
}
