package com.linkpouch.stash.domain.port.in;

import java.util.Optional;
import java.util.UUID;

import com.linkpouch.stash.domain.model.StashInfo;

@FunctionalInterface
public interface FindStashByIdQuery {

    Optional<StashInfo> execute(UUID stashId);
}
