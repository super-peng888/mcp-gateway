package com.aura.mcp.gateway.repository;

import com.aura.mcp.gateway.entity.ApiGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ApiGroupRepository extends JpaRepository<ApiGroup, Long> {

    Optional<ApiGroup> findByName(String name);
}
