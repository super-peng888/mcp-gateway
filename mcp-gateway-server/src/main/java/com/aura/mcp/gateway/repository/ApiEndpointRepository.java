package com.aura.mcp.gateway.repository;

import com.aura.mcp.gateway.entity.ApiEndpoint;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ApiEndpointRepository extends JpaRepository<ApiEndpoint, Long> {
}
