package com.linkpouch.stash.domain.port.in;

import java.util.UUID;

import com.linkpouch.stash.domain.model.Link;

@FunctionalInterface
public interface ListLinksQuery {

    PagedResult<Link> execute(UUID stashId, String search, int page, int size);
}
