package com.aura.mcp.gateway.entity;

import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Embeddable
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApiParameter {

    private String name;

    /** path / query / header / body */
    private String type;

    private boolean required;

    private String description;

    private String defaultValue;
}
