package com.linkpouch.stash.domain.port.outbound;

/** Driven Port: Screenshot Storage For managing screenshot files in object storage. */
public interface ScreenshotStorage {

    /** Delete the screenshot file for the given key. No-op if the key is null or does not exist. */
    void delete(String key);
}
