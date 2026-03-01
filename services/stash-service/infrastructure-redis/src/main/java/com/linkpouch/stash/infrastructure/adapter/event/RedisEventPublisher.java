package com.linkpouch.stash.infrastructure.adapter.event;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

import org.springframework.context.annotation.Primary;
import org.springframework.data.redis.connection.stream.MapRecord;
import org.springframework.data.redis.connection.stream.RecordId;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.ObjectMapper;

import com.linkpouch.stash.domain.event.LinkAddedEvent;
import com.linkpouch.stash.domain.event.ScreenshotRefreshRequestedEvent;
import com.linkpouch.stash.domain.port.outbound.EventPublisher;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Redis Streams implementation of EventPublisher. Publishes domain events to Redis Streams for
 * async processing by indexer service.
 */
@Component
@Primary
@RequiredArgsConstructor
@Slf4j
public class RedisEventPublisher implements EventPublisher {

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    private static final String LINK_STREAM_KEY = "linkpouch:events:link";
    private static final String SCREENSHOT_STREAM_KEY = "linkpouch:events:screenshot";

    @Override
    public void publishLinkAdded(final LinkAddedEvent event) {
        try {
            final Map<String, String> eventData = new HashMap<>();
            eventData.put("eventType", "link.added");
            eventData.put("linkId", event.linkId().toString());
            eventData.put("url", event.url());
            eventData.put("stashId", event.stashId().toString());
            eventData.put("timestamp", Instant.now().toString());

            final RecordId recordId = redisTemplate.opsForStream().add(MapRecord.create(LINK_STREAM_KEY, eventData));

            log.info("Published link.added event to Redis Stream: linkId={}, recordId={}", event.linkId(), recordId);
        } catch (Exception e) {
            log.error("Failed to publish link.added event: {}", event, e);
            // Don't throw - event publishing should not break the main flow
        }
    }

    @Override
    public void publishScreenshotRefreshRequested(final ScreenshotRefreshRequestedEvent event) {
        try {
            final Map<String, String> eventData = new HashMap<>();
            eventData.put("eventType", "screenshot.refresh.requested");
            eventData.put("linkId", event.linkId().toString());
            eventData.put("url", event.url());
            eventData.put("stashId", event.stashId().toString());
            eventData.put("timestamp", Instant.now().toString());

            final RecordId recordId =
                    redisTemplate.opsForStream().add(MapRecord.create(SCREENSHOT_STREAM_KEY, eventData));

            log.info(
                    "Published screenshot.refresh.requested event to Redis Stream: linkId={}," + " recordId={}",
                    event.linkId(),
                    recordId);
        } catch (Exception e) {
            log.error("Failed to publish screenshot.refresh.requested event: {}", event, e);
            // Don't throw - event publishing should not break the main flow
        }
    }
}
