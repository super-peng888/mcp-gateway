package com.aura.mcp.gateway.repository;

import com.aura.mcp.gateway.entity.GatewayTool;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface GatewayToolRepository extends JpaRepository<GatewayTool, Long> {

    List<GatewayTool> findByServerId(Long serverId);

    Optional<GatewayTool> findByServerIdAndName(Long serverId, String name);
}
