package com.linkpouch.stash.application.service;

import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Service;

import com.linkpouch.stash.domain.port.outbound.SseTicketPort;

import lombok.RequiredArgsConstructor;

/**
 * Application Service: SSE Ticket Issuance Exchanges a validated stash signature for a short-lived
 * SSE access ticket, preventing the permanent HMAC signature from appearing in server access logs.
 */
@Service
@RequiredArgsConstructor
public class SseTicketService {

    private final SseTicketPort sseTicketPort;

    /**
     * Issues a new short-lived ticket for the given stash.
     *
     * @param stashId the stash the ticket grants access to
     * @return an opaque ticket token
     */
    public String issue(final UUID stashId) {
        return sseTicketPort.issue(stashId);
    }

    /**
     * Validates a ticket and returns the stash it was issued for.
     *
     * @param ticket the ticket token to validate
     * @return the stashId the ticket was issued for, or empty if invalid or expired
     */
    public Optional<UUID> validate(final String ticket) {
        return sseTicketPort.validate(ticket);
    }
}
