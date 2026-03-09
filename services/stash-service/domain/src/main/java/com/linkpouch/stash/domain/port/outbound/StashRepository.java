package com.linkpouch.stash.domain.port.outbound;

import java.util.Optional;
import java.util.UUID;

import com.linkpouch.stash.domain.model.Stash;
import com.linkpouch.stash.domain.model.StashInfo;

/** Driven Port: Stash Repository */
public interface StashRepository {

    /** Save a stash and its link collection (create or update via aggregate cascade). */
    Stash save(Stash stash);

    /** Find a stash by ID without loading its links. */
    Optional<StashInfo> findById(UUID id);

    /** Find a stash by ID with all its links eagerly loaded. */
    Optional<Stash> findByIdWithLinks(UUID id);

    /** Delete a stash by ID (cascades to links). */
    void deleteById(UUID id);
}
