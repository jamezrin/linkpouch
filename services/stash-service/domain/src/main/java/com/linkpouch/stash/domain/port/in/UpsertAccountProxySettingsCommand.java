package com.linkpouch.stash.domain.port.in;

import java.util.UUID;

public record UpsertAccountProxySettingsCommand(UUID accountId, String proxyCountry) {}
