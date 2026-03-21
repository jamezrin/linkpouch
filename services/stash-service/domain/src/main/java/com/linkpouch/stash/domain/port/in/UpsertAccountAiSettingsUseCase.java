package com.linkpouch.stash.domain.port.in;

import com.linkpouch.stash.domain.model.AccountAiSettings;

public interface UpsertAccountAiSettingsUseCase {

    AccountAiSettings execute(UpsertAccountAiSettingsCommand command);
}
