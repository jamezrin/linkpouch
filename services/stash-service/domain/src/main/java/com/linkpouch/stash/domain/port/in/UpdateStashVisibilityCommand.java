package com.linkpouch.stash.domain.port.in;

import java.util.UUID;

import com.linkpouch.stash.domain.model.StashVisibility;

public record UpdateStashVisibilityCommand(UUID accountId, UUID stashId, StashVisibility visibility) {}
