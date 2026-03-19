package com.linkpouch.stash.domain.port.outbound;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.linkpouch.stash.domain.model.AccountAiSettings;
import com.linkpouch.stash.domain.model.AiProvider;

public interface AccountAiSettingsRepository {

    AccountAiSettings save(AccountAiSettings settings);

    List<AccountAiSettings> findAllByAccountId(UUID accountId);

    Optional<AccountAiSettings> findByAccountIdAndProvider(UUID accountId, AiProvider provider);

    void deleteByAccountIdAndProvider(UUID accountId, AiProvider provider);
}
