package com.linkpouch.stash.domain.port.inbound;

import com.linkpouch.stash.domain.model.Link;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Driving Port: Link Management Use Cases
 */
public interface LinkManagementUseCase {
    
    /**
     * Add a new link to a stash.
     */
    Link addLink(UUID stashId, String url);
    
    /**
     * Find a link by its ID.
     */
    Optional<Link> findLinkById(UUID linkId);
    
    /**
     * Get all links in a stash, ordered by creation date.
     */
    List<Link> getLinksByStashId(UUID stashId);
    
    /**
     * Search links in a stash using full-text search.
     */
    List<Link> searchLinks(UUID stashId, String query);
    
    /**
     * Delete a link from a stash.
     */
    void deleteLink(UUID linkId);
    
    /**
     * Update link metadata (called by indexer after scraping).
     */
    Link updateLinkMetadata(UUID linkId, String title, String description,
                            String faviconUrl, String pageContent, String finalUrl);

    /**
     * Update link screenshot key (called by indexer after upload).
     */
    Link updateLinkScreenshot(UUID linkId, String screenshotKey);

    /**
     * Request a screenshot refresh for a link.
     */
    void requestScreenshotRefresh(UUID linkId);
}
