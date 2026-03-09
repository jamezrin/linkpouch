package com.linkpouch.stash.domain.port.outbound;

import java.util.Optional;
import java.util.UUID;

import com.linkpouch.stash.domain.model.Stash;
import com.linkpouch.stash.domain.model.StashLinksAggregate;

/** Driven Port: StashLinksAggregate Repository */
public interface StashRepository {

    /** Save a stash and its link collection (create or update via aggregate cascade). */
    StashLinksAggregate save(StashLinksAggregate stash);

    /** Find a stash by ID without loading its links. */
    Optional<Stash> findById(UUID id);

    /** Find a stash by ID with all its links eagerly loaded. */
    Optional<StashLinksAggregate> findByIdWithLinks(UUID id);

    /** Delete a stash by ID (cascades to links). */
    void deleteById(UUID id);
}
