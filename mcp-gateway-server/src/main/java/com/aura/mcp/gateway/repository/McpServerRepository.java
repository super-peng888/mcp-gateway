package com.aura.mcp.gateway.repository;

import com.aura.mcp.gateway.entity.McpServerEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface McpServerRepository extends JpaRepository<McpServerEntity, Long> {

    Optional<McpServerEntity> findByName(String name);
}
