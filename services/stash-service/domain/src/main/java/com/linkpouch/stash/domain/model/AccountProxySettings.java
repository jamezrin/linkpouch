package com.linkpouch.stash.domain.model;

import java.util.UUID;

import lombok.Getter;
import lombok.ToString;

/** Domain entity: per-account proxy country preference. */
@Getter
@ToString
public class AccountProxySettings {

    private final UUID id;
    private final UUID accountId;
    private String proxyCountry;

    public AccountProxySettings(final UUID id, final UUID accountId, final String proxyCountry) {
        this.id = id != null ? id : UUID.randomUUID();
        this.accountId = accountId;
        this.proxyCountry = proxyCountry;
    }

    public static AccountProxySettings create(final UUID accountId, final String proxyCountry) {
        return new AccountProxySettings(null, accountId, proxyCountry);
    }

    public void update(final String proxyCountry) {
        this.proxyCountry = proxyCountry;
    }
}
