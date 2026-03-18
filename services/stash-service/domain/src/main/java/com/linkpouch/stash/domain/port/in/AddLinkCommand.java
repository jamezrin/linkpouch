package com.linkpouch.stash.domain.port.in;

import java.util.UUID;

public record AddLinkCommand(UUID stashId, String url, UUID folderId) {

    /** Backward-compatible factory: creates a root-level link (folderId = null). */
    public static AddLinkCommand of(final UUID stashId, final String url) {
        return new AddLinkCommand(stashId, url, null);
    }
}
