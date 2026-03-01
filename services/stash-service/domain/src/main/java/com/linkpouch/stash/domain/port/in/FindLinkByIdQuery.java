package com.linkpouch.stash.domain.port.in;

import java.util.Optional;
import java.util.UUID;

import com.linkpouch.stash.domain.model.Link;

@FunctionalInterface
public interface FindLinkByIdQuery {

    Optional<Link> execute(UUID linkId);
}
