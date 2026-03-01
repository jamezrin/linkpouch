package com.linkpouch.stash.domain.port.outbound;

import com.linkpouch.stash.domain.event.LinkAddedEvent;
import com.linkpouch.stash.domain.event.ScreenshotRefreshRequestedEvent;

/**
 * Driven Port: Event Publisher For publishing domain events to external systems (e.g., indexer
 * service).
 */
public interface EventPublisher {

    /** Publish a link added event. */
    void publishLinkAdded(LinkAddedEvent event);

    /** Publish a screenshot refresh requested event. */
    void publishScreenshotRefreshRequested(ScreenshotRefreshRequestedEvent event);
}
