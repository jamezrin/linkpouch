package com.linkpouch.stash.domain.port.inbound;

import com.linkpouch.stash.domain.model.EmbeddabilityResult;

/** Driving Port: Check whether a URL can be embedded in an iframe */
public interface UrlEmbeddabilityUseCase {
    EmbeddabilityResult checkEmbeddability(String url);
}
