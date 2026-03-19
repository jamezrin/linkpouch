package com.linkpouch.stash.infrastructure.adapter.ai;

import com.linkpouch.stash.domain.model.AiProvider;

/** Internal SPI: each Spring bean implementing this handles one AI provider. */
public interface AiProviderAdapter {

    AiProvider supportedProvider();

    /**
     * Calls the provider's chat completion endpoint and returns the markdown summary.
     *
     * @param apiKey      user's API key (null for INCLUDED — uses server-side key)
     * @param model       model identifier, e.g. "google/gemini-flash-1.5"
     * @param systemPrompt server-side system prompt
     * @param pageContent  page text to summarise
     */
    String generateSummary(String apiKey, String model, String systemPrompt, String pageContent);
}
