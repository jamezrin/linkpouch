package com.linkpouch.stash.domain.port.in;

import java.util.UUID;

import com.linkpouch.stash.domain.model.AiProvider;

public record UpsertAccountAiSettingsCommand(
        UUID accountId, AiProvider provider, String apiKey, String model, boolean enabled, String customPrompt) {}
