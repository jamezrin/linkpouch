package com.linkpouch.stash.domain.port.in;

import java.util.Optional;
import java.util.UUID;

import com.linkpouch.stash.domain.model.AccountAiSettings;

public interface GetAccountAiSettingsQuery {

    Optional<AccountAiSettings> execute(UUID accountId);
}
