package com.linkpouch.stash.domain.port.in;

import java.util.Optional;
import java.util.UUID;

import com.linkpouch.stash.domain.model.AccountProxySettings;

public interface GetAccountProxySettingsQuery {

    Optional<AccountProxySettings> execute(UUID accountId);
}
