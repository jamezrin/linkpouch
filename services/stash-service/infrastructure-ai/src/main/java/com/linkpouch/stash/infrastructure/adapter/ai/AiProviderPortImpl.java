package com.linkpouch.stash.infrastructure.adapter.ai;

import org.springframework.stereotype.Component;

import com.linkpouch.stash.domain.model.AccountAiSettings;
import com.linkpouch.stash.domain.port.outbound.AiProviderPort;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@RequiredArgsConstructor
public class AiProviderPortImpl implements AiProviderPort {

    private final AiProviderRegistry registry;

    @Override
    public String generateSummary(
            final AccountAiSettings settings, final String systemPrompt, final String pageContent) {
        final AiProviderAdapter adapter = registry.findAdapter(settings.getProvider())
                .orElseThrow(() -> new IllegalArgumentException(
                        "No AI adapter registered for provider: " + settings.getProvider()));
        return adapter.generateSummary(settings.getApiKey(), settings.getModel(), systemPrompt, pageContent);
    }
}
