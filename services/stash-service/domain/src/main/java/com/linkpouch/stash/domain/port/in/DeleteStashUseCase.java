package com.linkpouch.stash.domain.port.in;

import java.util.UUID;

@FunctionalInterface
public interface DeleteStashUseCase {

    void execute(UUID stashId);
}
