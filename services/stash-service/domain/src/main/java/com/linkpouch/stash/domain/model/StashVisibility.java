package com.linkpouch.stash.domain.model;

/** Controls who may access a stash. */
public enum StashVisibility {
    /** Anyone with the signed URL can access the stash. */
    SHARED,
    /** Only the account that claimed the stash can access it. */
    PRIVATE
}
