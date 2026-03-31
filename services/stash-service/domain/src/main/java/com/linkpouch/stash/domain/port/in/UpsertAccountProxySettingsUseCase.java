package com.linkpouch.stash.domain.port.in;

import com.linkpouch.stash.domain.model.AccountProxySettings;

public interface UpsertAccountProxySettingsUseCase {

    AccountProxySettings execute(UpsertAccountProxySettingsCommand command);
}
