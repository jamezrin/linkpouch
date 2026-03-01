package com.linkpouch.stash.domain.port.in;

import java.util.UUID;

@FunctionalInterface
public interface RequestScreenshotRefreshUseCase {

    void execute(UUID linkId);
}
