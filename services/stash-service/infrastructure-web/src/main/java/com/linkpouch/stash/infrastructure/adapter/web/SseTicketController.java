package com.linkpouch.stash.infrastructure.adapter.web;

import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

import com.linkpouch.stash.domain.port.outbound.SseTicketPort;

import lombok.RequiredArgsConstructor;

/**
 * REST Controller: SSE Ticket Issuance
 *
 * <p>Clients exchange their Bearer stash-access token for a short-lived ticket before opening an
 * SSE connection. The ticket is used as the {@code ?ticket=} query parameter on the SSE endpoint
 * so that the Bearer token never appears in server access logs.
 *
 * <p>Authentication is handled by {@link StashJwtInterceptor} — the stash-access JWT must be
 * present and valid before this handler is reached.
 */
@RestController
@RequiredArgsConstructor
public class SseTicketController {

    private final SseTicketPort sseTicketPort;

    public record SseTicketResponse(String ticket, int expiresIn) {}

    @PostMapping("/stashes/{stashId}/sse-ticket")
    public ResponseEntity<SseTicketResponse> issueSseTicket(@PathVariable("stashId") final UUID stashId) {
        final String ticket = sseTicketPort.issue(stashId);
        return ResponseEntity.ok(new SseTicketResponse(ticket, 900));
    }
}
