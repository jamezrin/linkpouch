package com.linkpouch.stash.domain.port.inbound;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.linkpouch.stash.domain.model.Link;
import com.linkpouch.stash.domain.model.LinkStatus;

/** Driving Port: Link Management Use Cases */
public interface LinkManagementUseCase {

    /** Add a new link to a stash. */
    Link addLink(UUID stashId, String url);

    /** Add multiple links to a stash in bulk. */
    AddLinksBatchResult addLinks(UUID stashId, List<String> urls);

    record AddLinksBatchResult(int imported, int skipped, List<BatchLinkError> errors, List<Link> links) {}
    record BatchLinkError(String url, String reason) {}

    /** Find a link by its ID. */
    Optional<Link> findLinkById(UUID linkId);

    /** Get all links in a stash, ordered by creation date. */
    List<Link> getLinksByStashId(UUID stashId);

    /** Search links in a stash using full-text search. */
    List<Link> searchLinks(UUID stashId, String query);

    /** Delete a link from a stash. */
    void deleteLink(UUID linkId);

    /** Update link metadata (called by indexer after scraping). */
    Link updateLinkMetadata(
            UUID linkId,
            String title,
            String description,
            String faviconUrl,
            String pageContent,
            String finalUrl);

    /** Update link screenshot key (called by indexer after upload). */
    Link updateLinkScreenshot(UUID linkId, String screenshotKey);

    /** Request a screenshot refresh for a link. */
    void requestScreenshotRefresh(UUID linkId);

    /**
     * Move movedLinkIds to the position immediately after insertAfterId. If insertAfterId is null,
     * moved links are placed at the beginning.
     */
    void reorderLinks(UUID stashId, List<UUID> movedLinkIds, UUID insertAfterId);

    /** Update the indexing status of a link (called by indexer on failure). */
    Link updateLinkStatus(UUID linkId, LinkStatus status);
}
