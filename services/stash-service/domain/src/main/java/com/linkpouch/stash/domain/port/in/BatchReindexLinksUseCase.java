package com.linkpouch.stash.domain.port.in;

public interface BatchReindexLinksUseCase {
    void execute(BatchReindexLinksCommand command);
}
