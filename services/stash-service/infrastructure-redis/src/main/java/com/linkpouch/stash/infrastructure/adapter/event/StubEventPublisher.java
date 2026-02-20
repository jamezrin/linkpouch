package com.linkpouch.stash.infrastructure.adapter.event;

import com.linkpouch.stash.domain.port.outbound.EventPublisher;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * Stub implementation of EventPublisher.
 * TODO: Replace with Redis pub/sub or message broker implementation.
 */
@Component
@Slf4j
public class StubEventPublisher implements EventPublisher {
    
    @Override
    public void publishLinkAdded(LinkAddedEvent event) {
        log.info("Link added event published: linkId={}, url={}, stashId={}", 
                event.linkId(), event.url(), event.stashId());
    }
    
    @Override
    public void publishScreenshotRefreshRequested(ScreenshotRefreshEvent event) {
        log.info("Screenshot refresh requested: linkId={}, url={}", 
                event.linkId(), event.url());
    }
}
