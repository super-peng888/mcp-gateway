package com.aura.mcp.gateway.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.ColumnDefault;

import java.util.ArrayList;
import java.util.List;

/**
 * A single MCP tool backed by a REST endpoint of the owning server's downstream API.
 */
@Entity
@Table(name = "gateway_tool")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GatewayTool {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** MCP tool name, unique within the owning server. ^[a-zA-Z0-9_-]{1,64}$ */
    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String method;

    @Column(nullable = false)
    private String path;

    @Column(length = 2000)
    private String description;

    /** Whether this tool is exposed via MCP. */
    @Column(nullable = false)
    @ColumnDefault("true")
    private boolean enabled = true;

    @ElementCollection
    @CollectionTable(name = "gateway_tool_parameter", joinColumns = @JoinColumn(name = "tool_id"))
    @Builder.Default
    private List<ToolParameter> parameters = new ArrayList<>();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "server_id")
    @JsonIgnore
    private McpServerEntity server;
}
