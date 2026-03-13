package com.linkpouch.stash.domain.port.outbound;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.linkpouch.stash.domain.model.Account;
import com.linkpouch.stash.domain.model.OAuthProvider;

public interface AccountRepository {

    Account save(Account account);

    Optional<Account> findById(UUID id);

    Optional<Account> findByProviderKey(OAuthProvider provider, String providerUserId);

    /** Returns the stash IDs claimed by the given account. */
    List<UUID> findClaimedStashIds(UUID accountId);

    void claimStash(UUID accountId, UUID stashId);

    void disownStash(UUID accountId, UUID stashId);

    boolean isStashClaimed(UUID accountId, UUID stashId);
}
