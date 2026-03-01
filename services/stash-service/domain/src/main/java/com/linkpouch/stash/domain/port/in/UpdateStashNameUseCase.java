package com.linkpouch.stash.domain.port.in;

import java.util.UUID;

import com.linkpouch.stash.domain.model.Stash;

@FunctionalInterface
public interface UpdateStashNameUseCase {

    Stash execute(UUID stashId, String newName);
}
