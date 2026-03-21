package com.linkpouch.stash.domain.model;

import java.util.UUID;

import lombok.Getter;
import lombok.ToString;

/** Domain entity: per-account AI provider configuration. */
@Getter
@ToString
public class AccountAiSettings {

    private final UUID id;
    private final UUID accountId;
    private AiProvider provider;
    private String apiKey;
    private String model;
    private String customPrompt;

    public AccountAiSettings(
            final UUID id,
            final UUID accountId,
            final AiProvider provider,
            final String apiKey,
            final String model,
            final String customPrompt) {
        this.id = id != null ? id : UUID.randomUUID();
        this.accountId = accountId;
        this.provider = provider;
        this.apiKey = apiKey;
        this.model = model;
        this.customPrompt = customPrompt;
    }

    public static AccountAiSettings create(
            final UUID accountId,
            final AiProvider provider,
            final String apiKey,
            final String model,
            final String customPrompt) {
        return new AccountAiSettings(null, accountId, provider, apiKey, model, customPrompt);
    }

    public void update(final AiProvider provider, final String apiKey, final String model, final String customPrompt) {
        this.provider = provider;
        this.apiKey = apiKey;
        this.model = model;
        this.customPrompt = customPrompt;
    }
}
