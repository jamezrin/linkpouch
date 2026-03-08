package com.linkpouch.stash.domain.port.in;

import java.util.List;
import java.util.UUID;

@FunctionalInterface
public interface PutBatchLinkScreenshotUseCase {
    void execute(UUID stashId, List<UUID> linkIds);
}
