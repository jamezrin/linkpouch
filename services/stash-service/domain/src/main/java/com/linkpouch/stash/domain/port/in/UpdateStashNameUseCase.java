package com.linkpouch.stash.domain.port.in;

import java.util.UUID;

import com.linkpouch.stash.domain.model.StashLinksAggregate;

@FunctionalInterface
public interface UpdateStashNameUseCase {

    StashLinksAggregate execute(UUID stashId, String newName);
}
