package com.linkpouch.stash.domain.port.outbound;

/**
 * Driven Port: Event Publisher For publishing domain events to external systems (e.g., indexer
 * service).
 */
public interface EventPublisher {

    /** Publish a link added event. */
    void publishLinkAdded(LinkAddedEvent event);

    /** Publish a screenshot refresh requested event. */
    void publishScreenshotRefreshRequested(ScreenshotRefreshEvent event);

    record LinkAddedEvent(String linkId, String url, String stashId) {}

    record ScreenshotRefreshEvent(String linkId, String url, String stashId) {}
}
