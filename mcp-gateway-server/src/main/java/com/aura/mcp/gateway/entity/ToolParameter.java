package com.aura.mcp.gateway.entity;

import jakarta.persistence.Column;
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
public class ToolParameter {

    private String name;

    /** Where the argument goes in the HTTP request: path | query | header | body. */
    @Column(name = "param_in")
    private String in;

    /** JSON schema type used for the tool inputSchema and argument coercion: string | integer | number | boolean. */
    @Column(name = "data_type")
    private String dataType = "string";

    @Column(name = "param_required")
    private boolean required;

    @Column(length = 1000)
    private String description;

    private String defaultValue;
}
