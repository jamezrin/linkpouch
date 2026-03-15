package com.linkpouch.stash.domain.model;

/** Controls write access for non-owner visitors on a claimed stash. */
public enum StashLinkPermissions {
    /** Anyone with the URL can add, delete, reorder, and refresh links. */
    FULL,
    /** Only the claimer can perform write operations. */
    READ_ONLY
}
