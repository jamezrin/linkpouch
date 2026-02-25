package com.linkpouch.stash.domain.port.outbound;

import java.util.Optional;
import java.util.UUID;

import com.linkpouch.stash.domain.model.Stash;

/** Driven Port: Stash Repository */
public interface StashRepository {

    /** Save a stash (create or update). */
    Stash save(Stash stash);

    /** Find a stash by ID. */
    Optional<Stash> findById(UUID id);

    /** Delete a stash by ID. */
    void deleteById(UUID id);
}
