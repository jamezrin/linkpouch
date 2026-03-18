package com.linkpouch.stash.domain.port.outbound;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import com.linkpouch.stash.domain.model.Link;

/** Driven Port: Link Repository */
public interface LinkRepository {

    /** Find a link by ID. */
    Optional<Link> findById(UUID id);

    /** Find all links in a stash, ordered by position ascending. */
    List<Link> findByStashIdOrderByCreatedAtDesc(UUID stashId);

    /** Search links using PostgreSQL full-text search (across entire stash). */
    List<Link> searchByStashIdAndQuery(UUID stashId, String query);

    /** Find a paginated slice of links in a stash, ordered by position ascending. */
    List<Link> findByStashIdPaged(UUID stashId, int page, int size);

    /** Count total links in a stash. */
    long countByStashId(UUID stashId);

    /** Find paginated root-level links (folder_id IS NULL) ordered by position. */
    List<Link> findByStashIdNullFolderPaged(UUID stashId, int page, int size);

    /** Count root-level links (folder_id IS NULL). */
    long countByStashIdNullFolder(UUID stashId);

    /** Find paginated links in a specific folder ordered by position. */
    List<Link> findByStashIdAndFolderIdPaged(UUID stashId, UUID folderId, int page, int size);

    /** Count links in a specific folder. */
    long countByStashIdAndFolderId(UUID stashId, UUID folderId);

    /**
     * Increment position of all links in the given scope by 1 (make room for new link at position 0).
     * When folderId is null, shifts root-level links only.
     */
    void shiftPositionsDown(UUID stashId, UUID folderId);

    /**
     * Increment position of all links in the stash by count (used for batch import — no folder scope).
     */
    void shiftPositionsDownBy(UUID stashId, int count);

    /** Return the set of URLs already stored in a stash (used for duplicate detection). */
    Set<String> findUrlsByStashId(UUID stashId);

    /**
     * Move movedLinkIds to the position immediately after insertAfterId. If insertAfterId is null,
     * moved links are placed at the beginning.
     */
    void reorderLinks(UUID stashId, List<UUID> movedLinkIds, UUID insertAfterId);
}
