package com.aura.mcp.gateway.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.ColumnDefault;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "api_group")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApiGroup {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;

    @Column(nullable = false)
    private String baseUrl;

    @Column(length = 2000)
    private String description;

    /** Downstream auth type applied to every call in this group: NONE | BEARER | BASIC | API_KEY. */
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

    @OneToMany(mappedBy = "group", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<ApiEndpoint> endpoints = new ArrayList<>();
}
