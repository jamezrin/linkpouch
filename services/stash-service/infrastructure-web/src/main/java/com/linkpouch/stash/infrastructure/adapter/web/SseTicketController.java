package com.linkpouch.stash.infrastructure.adapter.web;

import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

import com.linkpouch.stash.application.exception.NotFoundException;
import com.linkpouch.stash.application.exception.UnauthorizedException;
import com.linkpouch.stash.application.service.SignatureValidationService;
import com.linkpouch.stash.application.service.SseTicketService;
import com.linkpouch.stash.application.service.StashManagementService;

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

    private final StashManagementService stashService;
    private final SignatureValidationService signatureService;
    private final SseTicketService sseTicketService;

    public record SseTicketResponse(String ticket, int expiresIn) {}

    @PostMapping("/stashes/{stashId}/sse-ticket")
    public ResponseEntity<SseTicketResponse> issueSseTicket(
            @PathVariable("stashId") final UUID stashId,
            @RequestHeader("X-Stash-Signature") final String xStashSignature) {

        final var stash =
                stashService
                        .findStashById(stashId)
                        .orElseThrow(() -> new NotFoundException("Stash not found: " + stashId));

        if (!signatureService.validateSignature(
                stashId, stash.getSecretKey().getValue(), xStashSignature)) {
            throw new UnauthorizedException("Invalid signature");
        }

        final String ticket = sseTicketService.issue(stashId);
        return ResponseEntity.ok(new SseTicketResponse(ticket, 900));
    }
}
