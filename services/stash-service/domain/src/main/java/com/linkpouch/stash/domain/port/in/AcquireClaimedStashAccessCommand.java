package com.linkpouch.stash.domain.port.in;

import java.util.UUID;

public record AcquireClaimedStashAccessCommand(UUID accountId, UUID stashId) {}
