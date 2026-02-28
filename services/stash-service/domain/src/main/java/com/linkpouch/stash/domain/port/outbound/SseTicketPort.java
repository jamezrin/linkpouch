package com.linkpouch.stash.domain.port.outbound;

import java.util.Optional;
import java.util.UUID;

/**
 * Outbound port for issuing and validating short-lived SSE access tickets.
 *
 * <p>Tickets are issued in exchange for a valid stash signature and used as query parameters on the
 * SSE endpoint, preventing the permanent HMAC signature from appearing in server access logs.
 */
public interface SseTicketPort {

    /**
     * Issues a new short-lived ticket for the given stash.
     *
     * @param stashId the stash the ticket grants access to
     * @return an opaque ticket token (URL-safe, no padding)
     */
    String issue(UUID stashId);

    /**
     * Validates a ticket and returns the stash it was issued for.
     *
     * <p>Tickets are multi-use and expire after their configured TTL.
     *
     * @param ticket the ticket token to validate
     * @return the stashId the ticket was issued for, or empty if invalid / expired
     */
    Optional<UUID> validate(String ticket);
}
