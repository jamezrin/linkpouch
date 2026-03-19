package com.linkpouch.stash.domain.port.in;

import java.util.List;
import java.util.UUID;

import com.linkpouch.stash.domain.model.AccountAiSettings;

public interface GetAccountAiSettingsQuery {

    List<AccountAiSettings> execute(UUID accountId);
}
