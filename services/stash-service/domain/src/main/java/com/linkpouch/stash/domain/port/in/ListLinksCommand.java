package com.linkpouch.stash.domain.port.in;

import java.util.UUID;

/**
 * Command for listing links with optional folder scoping.
 *
 * <p>When {@code filterByFolder} is false, returns all links in the stash (search mode).
 * When {@code filterByFolder} is true and {@code folderId} is null, returns root-level links only.
 * When {@code filterByFolder} is true and {@code folderId} is non-null, returns links in that folder.
 */
public record ListLinksCommand(UUID stashId, String search, int page, int size, boolean filterByFolder, UUID folderId) {

    public static ListLinksCommand forStash(UUID stashId, String search, int page, int size) {
        return new ListLinksCommand(stashId, search, page, size, false, null);
    }

    public static ListLinksCommand forFolder(UUID stashId, UUID folderId, int page, int size) {
        return new ListLinksCommand(stashId, null, page, size, true, folderId);
    }

    public static ListLinksCommand forRoot(UUID stashId, int page, int size) {
        return new ListLinksCommand(stashId, null, page, size, true, null);
    }
}
