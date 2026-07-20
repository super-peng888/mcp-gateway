package com.aura.mcp.gateway.service;

import com.aura.mcp.gateway.entity.ApiEndpoint;
import com.aura.mcp.gateway.entity.ApiGroup;
import com.aura.mcp.gateway.entity.ApiParameter;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RestApiExecutor {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @SneakyThrows
    public String execute(ApiGroup group, ApiEndpoint endpoint, Map<String, Object> args) {
        String baseUrl = group.getBaseUrl();
        String path = endpoint.getPath();
        HttpHeaders headers = new HttpHeaders();
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));
        applyAuth(group, headers);

        Map<String, Object> bodyMap = new HashMap<>();

        for (ApiParameter param : endpoint.getParameters()) {
            Object value = args != null ? args.get(param.getName()) : null;
            if (value == null && param.getDefaultValue() != null && !param.getDefaultValue().isEmpty()) {
                value = param.getDefaultValue();
            }

            switch (param.getType().toLowerCase()) {
                case "path" -> {
                    if (value == null && param.isRequired()) {
                        throw new RuntimeException("Missing required path parameter: " + param.getName());
                    }
                    path = path.replace("{" + param.getName() + "}", String.valueOf(value));
                }
                case "query" -> {
                    if (value != null) {
                        path = UriComponentsBuilder.fromPath(path)
                                .queryParam(param.getName(), value)
                                .build(false)
                                .toUriString();
                    }
                }
                case "header" -> {
                    if (value != null) {
                        headers.set(param.getName(), String.valueOf(value));
                    }
                }
                case "body" -> {
                    if (value != null) {
                        bodyMap.put(param.getName(), value);
                    }
                }
            }
        }

        String url = baseUrl.endsWith("/") && path.startsWith("/")
                ? baseUrl + path.substring(1)
                : baseUrl + path;

        HttpMethod method = HttpMethod.valueOf(endpoint.getMethod().toUpperCase());

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

    /** Injects group-level downstream credentials; endpoint header params may override them. */
    private void applyAuth(ApiGroup group, HttpHeaders headers) {
        String authType = group.getAuthType() != null ? group.getAuthType() : "NONE";
        switch (authType.toUpperCase()) {
            case "BEARER" -> {
                if (StringUtils.hasText(group.getAuthToken())) {
                    headers.setBearerAuth(group.getAuthToken());
                }
            }
            case "BASIC" -> {
                if (StringUtils.hasText(group.getAuthUsername())) {
                    headers.setBasicAuth(group.getAuthUsername(),
                            group.getAuthPassword() != null ? group.getAuthPassword() : "");
                }
            }
            case "API_KEY" -> {
                if (StringUtils.hasText(group.getAuthHeaderName())) {
                    headers.set(group.getAuthHeaderName(),
                            group.getAuthHeaderValue() != null ? group.getAuthHeaderValue() : "");
                }
            }
            default -> {
                // NONE or unknown: no credentials injected
            }
        }
    }

    public Map<String, String> buildParameterDocs(List<ApiParameter> parameters) {
        return parameters.stream()
                .collect(Collectors.toMap(
                        ApiParameter::getName,
                        p -> (p.isRequired() ? "[required] " : "[optional] ") + p.getDescription(),
                        (a, b) -> a
                ));
    }
}
