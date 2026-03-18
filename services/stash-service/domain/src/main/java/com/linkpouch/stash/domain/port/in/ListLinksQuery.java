package com.linkpouch.stash.domain.port.in;

import com.linkpouch.stash.domain.model.Link;

@FunctionalInterface
public interface ListLinksQuery {

    PagedResult<Link> execute(ListLinksCommand command);
}
