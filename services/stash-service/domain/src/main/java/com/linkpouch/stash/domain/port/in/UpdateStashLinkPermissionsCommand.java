package com.linkpouch.stash.domain.port.in;

import java.util.UUID;

import com.linkpouch.stash.domain.model.StashLinkPermissions;

public record UpdateStashLinkPermissionsCommand(UUID accountId, UUID stashId, StashLinkPermissions permissions) {}
