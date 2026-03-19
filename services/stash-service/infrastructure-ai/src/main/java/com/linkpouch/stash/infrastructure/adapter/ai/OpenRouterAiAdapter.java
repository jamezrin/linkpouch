package com.linkpouch.stash.infrastructure.adapter.ai;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import com.linkpouch.stash.domain.model.AiProvider;

import lombok.extern.slf4j.Slf4j;

/**
 * Handles both INCLUDED (server-side OpenRouter key) and OPENROUTER (user-supplied key).
 * Both use the OpenAI-compatible endpoint at api.openrouter.ai.
 */
@Slf4j
@Component
public class OpenRouterAiAdapter implements AiProviderAdapter {

    private static final String OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
    private static final int MAX_CONTENT_CHARS = 80_000;

    @Value("${linkpouch.ai.included-api-key:}")
    private String includedApiKey;

    @Value("${linkpouch.ai.included-model:google/gemini-flash-1.5}")
    private String includedModel;

    private final RestClient restClient;

    public OpenRouterAiAdapter() {
        this.restClient = RestClient.builder().baseUrl(OPENROUTER_BASE_URL).build();
    }

    @Override
    public AiProvider supportedProvider() {
        return AiProvider.OPENROUTER;
    }

    @Override
    public String generateSummary(
            final String apiKey, final String model, final String systemPrompt, final String pageContent) {
        final String effectiveKey = (apiKey != null && !apiKey.isBlank()) ? apiKey : includedApiKey;
        final String effectiveModel = (model != null && !model.isBlank()) ? model : includedModel;

        if (effectiveKey == null || effectiveKey.isBlank()) {
            throw new IllegalStateException("No OpenRouter API key available");
        }

        final String truncated = pageContent != null && pageContent.length() > MAX_CONTENT_CHARS
                ? pageContent.substring(0, MAX_CONTENT_CHARS)
                : pageContent;

        final Map<String, Object> requestBody = Map.of(
                "model",
                effectiveModel,
                "messages",
                List.of(
                        Map.of("role", "system", "content", systemPrompt),
                        Map.of("role", "user", "content", truncated != null ? truncated : "")));

        @SuppressWarnings("unchecked")
        final Map<String, Object> response = restClient
                .post()
                .uri("/chat/completions")
                .header("Authorization", "Bearer " + effectiveKey)
                .header("Content-Type", "application/json")
                .body(requestBody)
                .retrieve()
                .body(Map.class);

        return extractContent(response);
    }

    @SuppressWarnings("unchecked")
    private String extractContent(final Map<String, Object> response) {
        if (response == null) throw new IllegalStateException("Empty response from OpenRouter");
        final List<Map<String, Object>> choices = (List<Map<String, Object>>) response.get("choices");
        if (choices == null || choices.isEmpty()) throw new IllegalStateException("No choices in OpenRouter response");
        final Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
        if (message == null) throw new IllegalStateException("No message in OpenRouter choice");
        final Object content = message.get("content");
        return content != null ? content.toString() : "";
    }
}
