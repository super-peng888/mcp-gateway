package com.aura.mcp.gateway.chat;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.deepseek.DeepSeekChatModel;
import org.springframework.ai.deepseek.DeepSeekChatOptions;
import org.springframework.ai.deepseek.api.DeepSeekApi;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Builds the DeepSeek chat client manually instead of via Spring AI's autoconfiguration
 * (which fails the whole application at startup when the API key is absent). The bean
 * only exists when DEEPSEEK_API_KEY is set to a non-blank value in the environment,
 * so the gateway always boots and the chat endpoint can report a friendly message
 * when unconfigured.
 */
@Configuration
public class ChatConfig {

    @Bean
    @ConditionalOnExpression("T(org.springframework.util.StringUtils).hasText(environment.getProperty('DEEPSEEK_API_KEY'))")
    public ChatClient deepSeekChatClient(
            @Value("${spring.ai.deepseek.base-url:https://api.deepseek.com}") String baseUrl,
            @Value("${spring.ai.deepseek.chat.options.model:deepseek-v4-flash}") String model,
            @Value("${DEEPSEEK_API_KEY}") String apiKey) {
        DeepSeekApi api = DeepSeekApi.builder()
                .baseUrl(baseUrl)
                .apiKey(apiKey)
                .build();
        DeepSeekChatModel chatModel = DeepSeekChatModel.builder()
                .deepSeekApi(api)
                .defaultOptions(DeepSeekChatOptions.builder().model(model).build())
                .build();
        return ChatClient.builder(chatModel).build();
    }
}
