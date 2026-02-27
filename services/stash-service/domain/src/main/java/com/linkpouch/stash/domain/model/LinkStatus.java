package com.linkpouch.stash.domain.model;

/** Represents the indexing lifecycle state of a Link. */
public enum LinkStatus {
    /** Link has been saved but not yet processed by the indexer. */
    PENDING,

    /** Indexer has successfully scraped metadata and (optionally) a screenshot. */
    INDEXED,

    /** Indexer encountered an unrecoverable error processing this link. */
    FAILED
}
