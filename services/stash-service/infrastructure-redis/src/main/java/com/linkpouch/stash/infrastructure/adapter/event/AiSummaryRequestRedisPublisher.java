package com.linkpouch.stash.infrastructure.adapter.event;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import org.springframework.data.redis.connection.stream.MapRecord;
import org.springframework.data.redis.connection.stream.RecordId;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import com.linkpouch.stash.domain.model.AiProvider;
import com.linkpouch.stash.domain.port.outbound.AiSummaryRequestPublisher;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Redis Streams implementation of AiSummaryRequestPublisher. Publishes AI summary requests to the
 * indexer-service for async processing with durability and retry support.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AiSummaryRequestRedisPublisher implements AiSummaryRequestPublisher {

    private static final String AI_SUMMARY_STREAM_KEY = "linkpouch:events:ai-summary";

    private final StringRedisTemplate redisTemplate;

    @Override
    public void publishRequest(
            final UUID linkId,
            final UUID stashId,
            final String pageContent,
            final AiProvider provider,
            final String model,
            final String systemPrompt) {
        try {
            final Map<String, String> eventData = new HashMap<>();
            eventData.put("eventType", "ai.summary.requested");
            eventData.put("linkId", linkId.toString());
            eventData.put("stashId", stashId.toString());
            eventData.put("pageContent", pageContent != null ? pageContent : "");
            eventData.put("provider", provider.name());
            // apiKey intentionally omitted — indexer fetches credentials at processing time
            eventData.put("model", model != null ? model : "");
            eventData.put("systemPrompt", systemPrompt != null ? systemPrompt : "");
            eventData.put("timestamp", Instant.now().toString());

            final RecordId recordId =
                    redisTemplate.opsForStream().add(MapRecord.create(AI_SUMMARY_STREAM_KEY, eventData));

            log.info(
                    "Published ai.summary.requested event to Redis Stream: linkId={}, provider={}, recordId={}",
                    linkId,
                    provider,
                    recordId);
        } catch (Exception e) {
            log.error("Failed to publish ai.summary.requested event for linkId={}: {}", linkId, e.getMessage(), e);
            // Don't throw - event publishing should not break the main flow
        }
    }
}
