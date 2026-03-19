package com.linkpouch.stash.infrastructure.adapter.ai;

import org.springframework.stereotype.Component;

import com.linkpouch.stash.domain.model.AiProvider;

import lombok.RequiredArgsConstructor;

/**
 * INCLUDED tier: delegates to OpenRouter using the server-side key.
 * The apiKey parameter is always null/ignored for this provider.
 */
@Component
@RequiredArgsConstructor
public class IncludedAiAdapter implements AiProviderAdapter {

    private final OpenRouterAiAdapter openRouterAdapter;

    @Override
    public AiProvider supportedProvider() {
        return AiProvider.INCLUDED;
    }

    @Override
    public String generateSummary(
            final String apiKey, final String model, final String systemPrompt, final String pageContent) {
        // Always use the server-side key — ignore apiKey
        return openRouterAdapter.generateSummary(null, model, systemPrompt, pageContent);
    }
}
