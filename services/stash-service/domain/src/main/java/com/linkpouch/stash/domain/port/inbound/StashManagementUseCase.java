package com.linkpouch.stash.domain.port.inbound;

import java.util.Optional;
import java.util.UUID;

import com.linkpouch.stash.domain.model.Stash;

/** Driving Port: Stash Management Use Cases */
public interface StashManagementUseCase {

    /** Create a new stash with the given name. */
    Stash createStash(String name);

    /** Find a stash by its ID. */
    Optional<Stash> findStashById(UUID stashId);

    /** Update the name of a stash. */
    Stash updateStashName(UUID stashId, String newName);

    /** Delete a stash by its ID. */
    void deleteStash(UUID stashId);
}
