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

@Entity
@Table(name = "api_endpoint")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApiEndpoint {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String method;

    @Column(nullable = false)
    private String path;

    @Column(length = 2000)
    private String description;

    /** Whether this endpoint is exposed as an MCP tool. */
    @Column(nullable = false)
    @ColumnDefault("false")
    private boolean enabled = false;

    @ElementCollection
    @CollectionTable(name = "api_endpoint_parameter", joinColumns = @JoinColumn(name = "endpoint_id"))
    @Builder.Default
    private List<ApiParameter> parameters = new ArrayList<>();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id")
    @JsonIgnore
    private ApiGroup group;
}
