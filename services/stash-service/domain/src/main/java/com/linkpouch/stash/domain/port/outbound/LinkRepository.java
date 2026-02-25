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
     * Find a paginated slice of links in a stash, ordered by position ascending.
     */
    List<Link> findByStashIdPaged(UUID stashId, int page, int size);

    /**
     * Count total links in a stash.
     */
    long countByStashId(UUID stashId);

    /**
     * Increment position of all links in stash by 1 (make room for new link at position 0).
     */
    void shiftPositionsDown(UUID stashId);

    /**
     * Move movedLinkIds to the position immediately after insertAfterId.
     * If insertAfterId is null, moved links are placed at the beginning.
     */
    void reorderLinks(UUID stashId, List<UUID> movedLinkIds, UUID insertAfterId);
}
