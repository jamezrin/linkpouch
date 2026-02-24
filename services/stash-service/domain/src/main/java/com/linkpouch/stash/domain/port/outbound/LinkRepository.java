package com.linkpouch.stash.domain.port.outbound;

import com.linkpouch.stash.domain.model.Link;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Driven Port: Link Repository
 */
public interface LinkRepository {
    
    /**
     * Save a link (create or update).
     */
    Link save(Link link);
    
    /**
     * Find a link by ID.
     */
    Optional<Link> findById(UUID id);
    
    /**
     * Find all links in a stash, ordered by creation date descending.
     */
    List<Link> findByStashIdOrderByCreatedAtDesc(UUID stashId);
    
    /**
     * Search links using PostgreSQL full-text search.
     */
    List<Link> searchByStashIdAndQuery(UUID stashId, String query);
    
    /**
     * Delete a link by ID.
     */
    void deleteById(UUID id);

    /**
     * Increment position of all links in stash by 1 (make room for new link at position 0).
     */
    void shiftPositionsDown(UUID stashId);

    /**
     * Set position of each link to its index in the given ordered list.
     */
    void reorderLinks(UUID stashId, List<UUID> orderedLinkIds);
}
