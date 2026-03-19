package com.linkpouch.stash.domain.port.in;

import java.util.UUID;

import com.linkpouch.stash.domain.model.AiProvider;

public interface DeleteAccountAiSettingsUseCase {

    void execute(UUID accountId, AiProvider provider);
}
