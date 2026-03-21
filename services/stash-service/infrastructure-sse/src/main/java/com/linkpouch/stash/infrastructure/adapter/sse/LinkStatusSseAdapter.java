package com.linkpouch.stash.infrastructure.adapter.sse;

import java.net.URI;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import com.linkpouch.stash.domain.model.Link;
import com.linkpouch.stash.domain.port.outbound.LinkStatusBroadcaster;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

/**
 * Infrastructure Adapter: SSE implementation of LinkStatusBroadcaster. Serializes updated Link
 * state to JSON and pushes it to all connected SSE clients subscribed to the link's stash.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class LinkStatusSseAdapter implements LinkStatusBroadcaster {

    private final SseConnectionRegistry registry;
    private final ObjectMapper objectMapper;

    @Value("${linkpouch.base-url:http://localhost:8080}")
    private String baseUrl;

    @Override
    public void broadcastLinkUpdated(final UUID stashId, final Link link) {
        try {
            final String json = objectMapper.writeValueAsString(toPayload(link));
            final SseEmitter.SseEventBuilder event =
                    SseEmitter.event().name("link-updated").data(json);
            registry.send(stashId, event);
            log.debug("Broadcast link-updated SSE for stash {} link {}", stashId, link.getId());
        } catch (JacksonException e) {
            log.error("Failed to serialize link {} for SSE broadcast", link.getId(), e);
        }
    }

    private Map<String, Object> toPayload(final Link link) {
        final Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("id", link.getId().toString());
        payload.put("stashId", link.getStashId().toString());
        payload.put("url", link.getUrl().getValue());
        payload.put("title", link.getTitle() != null ? link.getTitle().getValue() : null);
        payload.put(
                "description",
                link.getDescription() != null ? link.getDescription().getValue() : null);
        payload.put(
                "faviconUrl",
                link.getFaviconUrl() != null ? link.getFaviconUrl().getValue() : null);

        if (link.getScreenshotKey() != null) {
            final URI screenshotUri = URI.create(
                    baseUrl + "/api/stashes/" + link.getStashId() + "/links/" + link.getId() + "/screenshot");
            payload.put("screenshotUrl", screenshotUri.toString());
        } else {
            payload.put("screenshotUrl", null);
        }

        payload.put("screenshotGeneratedAt", formatDateTime(link.getScreenshotGeneratedAt()));
        payload.put("createdAt", formatDateTime(link.getCreatedAt()));
        payload.put("updatedAt", formatDateTime(link.getUpdatedAt()));
        payload.put("position", link.getPosition());
        payload.put("status", link.getStatus() != null ? link.getStatus().name() : "PENDING");
        payload.put("aiSummary", link.getAiSummary());
        payload.put(
                "aiSummaryStatus",
                link.getAiSummaryStatus() != null ? link.getAiSummaryStatus().name() : "PENDING");

        return payload;
    }

    private String formatDateTime(final LocalDateTime dt) {
        if (dt == null) return null;
        final OffsetDateTime odt = dt.atOffset(ZoneOffset.UTC);
        return odt.format(DateTimeFormatter.ISO_OFFSET_DATE_TIME);
    }
}
