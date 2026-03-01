package com.linkpouch.stash.domain.port.in;

import java.util.List;
import java.util.UUID;

public record ReorderLinksCommand(UUID stashId, List<UUID> movedLinkIds, UUID insertAfterId) {}
