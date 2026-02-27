package com.linkpouch.stash.domain.port.outbound;

import java.util.UUID;

import com.linkpouch.stash.domain.model.Link;

/**
 * Driven Port: Link Status Broadcaster Broadcasts link state changes to connected real-time clients
 * (e.g., via SSE).
 */
public interface LinkStatusBroadcaster {

    /** Broadcast the updated state of a link to all clients subscribed to its stash. */
    void broadcastLinkUpdated(UUID stashId, Link link);
}
