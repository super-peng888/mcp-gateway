package com.aura.mcp.gateway.service;

import com.aura.mcp.gateway.entity.GatewayTool;
import com.aura.mcp.gateway.entity.McpServerEntity;
import com.aura.mcp.gateway.entity.ToolParameter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Executes the downstream REST call backing a gateway tool. Arguments are coerced to
 * the declared parameter dataType before being placed into path/query/header/body.
 */
@Service
@RequiredArgsConstructor
public class RestApiExecutor {

    private final RestTemplate restTemplate;

    public String execute(McpServerEntity server, GatewayTool tool, Map<String, Object> args) {
        String path = tool.getPath();
        HttpHeaders headers = new HttpHeaders();
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));
        applyAuth(server, headers);

        Map<String, Object> bodyMap = new HashMap<>();
        Map<String, String> queryParams = new LinkedHashMap<>();

        for (ToolParameter param : tool.getParameters()) {
            Object value = args != null ? args.get(param.getName()) : null;
            if (value == null && StringUtils.hasText(param.getDefaultValue())) {
                value = param.getDefaultValue();
            }
            if (value == null) {
                if (param.isRequired()) {
                    throw new IllegalArgumentException("Missing required parameter: " + param.getName());
                }
                continue;
            }
            Object typed = coerce(value, param.getDataType());
            String location = param.getIn() != null ? param.getIn().toLowerCase() : "query";
            switch (location) {
                case "path" -> path = path.replace("{" + param.getName() + "}", String.valueOf(typed));
                case "query" -> queryParams.put(param.getName(), String.valueOf(typed));
                case "header" -> headers.set(param.getName(), String.valueOf(typed));
                case "body" -> bodyMap.put(param.getName(), typed);
                default -> throw new IllegalArgumentException(
                        "Unsupported parameter location '" + param.getIn() + "' for: " + param.getName());
            }
        }

        // Query params are applied after path placeholder substitution.
        UriComponentsBuilder uriBuilder = UriComponentsBuilder.fromPath(path);
        queryParams.forEach(uriBuilder::queryParam);
        String pathWithQuery = uriBuilder.build(false).toUriString();
        String baseUrl = server.getBaseUrl();
        String url = baseUrl.endsWith("/") && pathWithQuery.startsWith("/")
                ? baseUrl + pathWithQuery.substring(1)
                : baseUrl + pathWithQuery;

        HttpMethod method = HttpMethod.valueOf(tool.getMethod().toUpperCase());

        HttpEntity<?> entity;
        if (bodyMap.isEmpty() || method == HttpMethod.GET || method == HttpMethod.DELETE) {
            entity = new HttpEntity<>(headers);
        } else {
            headers.setContentType(MediaType.APPLICATION_JSON);
            entity = new HttpEntity<>(bodyMap, headers);
        }

        ResponseEntity<String> response = restTemplate.exchange(url, method, entity, String.class);
        if (response.getStatusCode().is2xxSuccessful()) {
            return response.getBody() != null ? response.getBody() : "{}";
        }
        throw new RuntimeException("Downstream returned " + response.getStatusCode() + ": " + response.getBody());
    }

    /** Coerces an argument to the declared dataType (integer/number/boolean/string). */
    private Object coerce(Object value, String dataType) {
        if (value == null || !StringUtils.hasText(dataType)) {
            return value;
        }
        try {
            return switch (dataType.toLowerCase()) {
                case "integer" -> value instanceof Number n ? n.longValue() : Long.parseLong(String.valueOf(value));
                case "number" -> value instanceof Number n ? n.doubleValue() : Double.parseDouble(String.valueOf(value));
                case "boolean" -> value instanceof Boolean b ? b : Boolean.parseBoolean(String.valueOf(value));
                default -> value;
            };
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("Cannot coerce value '" + value + "' to " + dataType);
        }
    }

    /** Injects server-level downstream credentials; tool header params may override them. */
    private void applyAuth(McpServerEntity server, HttpHeaders headers) {
        String authType = server.getAuthType() != null ? server.getAuthType() : "NONE";
        switch (authType.toUpperCase()) {
            case "BEARER" -> {
                if (StringUtils.hasText(server.getAuthToken())) {
                    headers.setBearerAuth(server.getAuthToken());
                }
            }
            case "BASIC" -> {
                if (StringUtils.hasText(server.getAuthUsername())) {
                    headers.setBasicAuth(server.getAuthUsername(),
                            server.getAuthPassword() != null ? server.getAuthPassword() : "");
                }
            }
            case "API_KEY" -> {
                if (StringUtils.hasText(server.getAuthHeaderName())) {
                    headers.set(server.getAuthHeaderName(),
                            server.getAuthHeaderValue() != null ? server.getAuthHeaderValue() : "");
                }
            }
            default -> {
                // NONE or unknown: no credentials injected
            }
        }
    }
}
