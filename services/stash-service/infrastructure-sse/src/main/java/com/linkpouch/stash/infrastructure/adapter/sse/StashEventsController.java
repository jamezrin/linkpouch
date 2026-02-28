package com.linkpouch.stash.infrastructure.adapter.sse;

import java.util.UUID;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import com.linkpouch.stash.application.exception.UnauthorizedException;
import com.linkpouch.stash.application.service.SseTicketService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * REST Controller: Stash Events Exposes an SSE endpoint that clients can subscribe to in order to
 * receive real-time link status updates for a stash.
 *
 * <p>Authentication: clients must first exchange their stash signature for a short-lived ticket via
 * {@code POST /stashes/{stashId}/sse-ticket}, then pass that ticket as the {@code ?ticket=} query
 * parameter. This prevents the permanent HMAC signature from appearing in server access logs.
 */
@Slf4j
@RestController
@RequiredArgsConstructor
public class StashEventsController {

    /** 10 minutes in milliseconds. EventSource auto-reconnects after timeout. */
    private static final long SSE_TIMEOUT_MS = 10L * 60 * 1_000;

    private final SseTicketService sseTicketService;
    private final SseConnectionRegistry registry;

    @GetMapping(value = "/stashes/{stashId}/events")
    public SseEmitter subscribeToStashEvents(
            @PathVariable("stashId") final UUID stashId,
            @RequestParam(name = "ticket") final String ticket) {

        final var ticketStashId = sseTicketService.validate(ticket);

        if (ticketStashId.isEmpty() || !ticketStashId.get().equals(stashId)) {
            throw new UnauthorizedException("Invalid or expired SSE ticket");
        }

        log.debug("New SSE subscription for stash {}", stashId);
        final SseEmitter emitter = new SseEmitter(SSE_TIMEOUT_MS);
        return registry.register(stashId, emitter);
    }
}
