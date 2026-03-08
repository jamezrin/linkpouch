package com.linkpouch.stash.domain.port.in;

import java.util.List;
import java.util.UUID;

public record DeleteLinksBatchCommand(UUID stashId, List<UUID> linkIds) {}
