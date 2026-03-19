package com.linkpouch.stash.domain.port.outbound;

import com.linkpouch.stash.domain.model.AccountAiSettings;

public interface AiProviderPort {

    /** Calls the configured AI provider and returns the generated markdown summary. */
    String generateSummary(AccountAiSettings settings, String systemPrompt, String pageContent);
}
