package com.linkpouch.stash.infrastructure.adapter.web;

import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

import com.linkpouch.stash.domain.exception.NotFoundException;
import com.linkpouch.stash.domain.exception.UnauthorizedException;
import com.linkpouch.stash.domain.port.in.FindStashByIdQuery;
import com.linkpouch.stash.domain.port.outbound.SseTicketPort;
import com.linkpouch.stash.domain.service.StashSignatureService;

import lombok.RequiredArgsConstructor;

/**
 * REST Controller: SSE Ticket Issuance
 *
 * <p>Clients exchange a valid stash signature for a short-lived ticket before opening an SSE
 * connection. The ticket is used as the {@code ?ticket=} query parameter on the SSE endpoint so
 * that the permanent HMAC signature never appears in server access logs.
 */
@RestController
@RequiredArgsConstructor
public class SseTicketController {

    private final FindStashByIdQuery findStashByIdQuery;
    private final StashSignatureService signatureService;
    private final SseTicketPort sseTicketPort;

    public record SseTicketResponse(String ticket, int expiresIn) {}

    @PostMapping("/stashes/{stashId}/sse-ticket")
    public ResponseEntity<SseTicketResponse> issueSseTicket(
            @PathVariable("stashId") final UUID stashId,
            @RequestHeader("X-Stash-Signature") final String xStashSignature) {

        final var stash = findStashByIdQuery
                .execute(stashId)
                .orElseThrow(() -> new NotFoundException("Stash not found: " + stashId));

        if (!signatureService.validateSignature(stashId, stash.getSecretKey().getValue(), xStashSignature)) {
            throw new UnauthorizedException("Invalid signature");
        }

        final String ticket = sseTicketPort.issue(stashId);
        return ResponseEntity.ok(new SseTicketResponse(ticket, 900));
    }
}
