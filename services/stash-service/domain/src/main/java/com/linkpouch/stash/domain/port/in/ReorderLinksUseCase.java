package com.linkpouch.stash.domain.port.in;

@FunctionalInterface
public interface ReorderLinksUseCase {

    void execute(ReorderLinksCommand command);
}
