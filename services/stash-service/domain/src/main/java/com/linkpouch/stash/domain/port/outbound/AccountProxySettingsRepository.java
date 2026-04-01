package com.linkpouch.stash.domain.port.outbound;

import java.util.Optional;
import java.util.UUID;

import com.linkpouch.stash.domain.model.AccountProxySettings;

public interface AccountProxySettingsRepository {

    AccountProxySettings save(AccountProxySettings settings);

    Optional<AccountProxySettings> findByAccountId(UUID accountId);
}
