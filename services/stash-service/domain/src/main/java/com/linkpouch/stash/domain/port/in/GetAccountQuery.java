package com.linkpouch.stash.domain.port.in;

import java.util.Optional;
import java.util.UUID;

import com.linkpouch.stash.domain.model.Account;

@FunctionalInterface
public interface GetAccountQuery {

    Optional<Account> execute(UUID accountId);
}
