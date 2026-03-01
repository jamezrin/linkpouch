package com.linkpouch.stash.domain.port.in;

import java.util.UUID;

@FunctionalInterface
public interface DeleteLinkUseCase {

    void execute(UUID linkId);
}
