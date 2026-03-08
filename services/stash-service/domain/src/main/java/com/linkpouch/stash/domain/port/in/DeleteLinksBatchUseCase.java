package com.linkpouch.stash.domain.port.in;

@FunctionalInterface
public interface DeleteLinksBatchUseCase {
    void execute(DeleteLinksBatchCommand command);
}
