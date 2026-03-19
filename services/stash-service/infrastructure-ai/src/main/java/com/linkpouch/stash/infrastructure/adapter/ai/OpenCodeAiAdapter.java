package com.linkpouch.stash.infrastructure.adapter.ai;

import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import com.linkpouch.stash.domain.model.AiProvider;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
public class OpenCodeAiAdapter implements AiProviderAdapter {

    private static final String OPENCODE_BASE_URL = "https://api.opencode.ai/v1";
    private static final int MAX_CONTENT_CHARS = 80_000;

    private final RestClient restClient;

    public OpenCodeAiAdapter() {
        this.restClient = RestClient.builder().baseUrl(OPENCODE_BASE_URL).build();
    }

    @Override
    public AiProvider supportedProvider() {
        return AiProvider.OPENCODE;
    }

    @Override
    public String generateSummary(
            final String apiKey, final String model, final String systemPrompt, final String pageContent) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException("OpenCode API key is required");
        }

        final String truncated = pageContent != null && pageContent.length() > MAX_CONTENT_CHARS
                ? pageContent.substring(0, MAX_CONTENT_CHARS)
                : pageContent;

        final Map<String, Object> requestBody = Map.of(
                "model",
                model,
                "messages",
                List.of(
                        Map.of("role", "system", "content", systemPrompt),
                        Map.of("role", "user", "content", truncated != null ? truncated : "")));

        @SuppressWarnings("unchecked")
        final Map<String, Object> response = restClient
                .post()
                .uri("/chat/completions")
                .header("Authorization", "Bearer " + apiKey)
                .header("Content-Type", "application/json")
                .body(requestBody)
                .retrieve()
                .body(Map.class);

        return extractContent(response);
    }

    @SuppressWarnings("unchecked")
    private String extractContent(final Map<String, Object> response) {
        if (response == null) throw new IllegalStateException("Empty response from OpenCode");
        final List<Map<String, Object>> choices = (List<Map<String, Object>>) response.get("choices");
        if (choices == null || choices.isEmpty()) throw new IllegalStateException("No choices in OpenCode response");
        final Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
        if (message == null) throw new IllegalStateException("No message in OpenCode choice");
        final Object content = message.get("content");
        return content != null ? content.toString() : "";
    }
}
