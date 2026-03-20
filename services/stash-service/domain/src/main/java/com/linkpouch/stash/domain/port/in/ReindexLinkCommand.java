package com.linkpouch.stash.domain.port.in;

import java.util.UUID;

public record ReindexLinkCommand(UUID linkId, UUID stashId) {}
