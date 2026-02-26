package com.linkpouch.stash.domain.port.outbound;

import com.linkpouch.stash.domain.model.FetchedUrlInfo;

/** Driven Port: Fetch HTTP response headers for a URL */
public interface UrlInfoPort {
    FetchedUrlInfo fetch(String url);
}
