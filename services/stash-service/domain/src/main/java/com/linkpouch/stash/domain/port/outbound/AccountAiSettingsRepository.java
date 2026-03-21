package com.linkpouch.stash.domain.port.outbound;

import java.util.Optional;
import java.util.UUID;

import com.linkpouch.stash.domain.model.AccountAiSettings;

public interface AccountAiSettingsRepository {

    AccountAiSettings save(AccountAiSettings settings);

    Optional<AccountAiSettings> findByAccountId(UUID accountId);
}
