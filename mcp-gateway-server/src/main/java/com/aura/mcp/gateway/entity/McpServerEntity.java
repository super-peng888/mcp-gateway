package com.aura.mcp.gateway.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.ColumnDefault;

import java.util.ArrayList;
import java.util.List;

/**
 * A configured MCP server exposed by the gateway. Each enabled server is mounted at
 * its own MCP endpoint ({@code /mcp/{name}/sse} or {@code /mcp/{name}/mcp}, depending
 * on {@link #transport}) and exposes its tools to connected agents.
 */
@Entity
@Table(name = "mcp_server")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class McpServerEntity {

    public static final String TRANSPORT_SSE = "SSE";
    public static final String TRANSPORT_STREAMABLE_HTTP = "STREAMABLE_HTTP";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Unique server name; becomes the MCP endpoint path segment. ^[a-zA-Z0-9_-]{1,64}$ */
    @Column(nullable = false, unique = true)
    private String name;

    @Column(length = 2000)
    private String description;

    /** SSE (legacy HTTP+SSE transport) or STREAMABLE_HTTP (MCP spec 2025-03-26+). */
    @Column(nullable = false)
    @ColumnDefault("'STREAMABLE_HTTP'")
    private String transport = TRANSPORT_STREAMABLE_HTTP;

    /** Whether the MCP endpoint is mounted. */
    @Column(nullable = false)
    @ColumnDefault("true")
    private boolean enabled = true;

    /** Base URL of the downstream REST API backing this server's tools. */
    @Column(nullable = false)
    private String baseUrl;

    /** Downstream auth type applied to every call of this server: NONE | BEARER | BASIC | API_KEY. */
    @Column(nullable = false)
    @ColumnDefault("'NONE'")
    private String authType = "NONE";

    /** BEARER token. */
    @Column(length = 2000)
    private String authToken;

    /** BASIC auth username. */
    private String authUsername;

    /** BASIC auth password. */
    private String authPassword;

    /** API_KEY header name (e.g. X-Api-Key). */
    private String authHeaderName;

    /** API_KEY header value. */
    @Column(length = 2000)
    private String authHeaderValue;

    @OneToMany(mappedBy = "server", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<GatewayTool> tools = new ArrayList<>();
}
