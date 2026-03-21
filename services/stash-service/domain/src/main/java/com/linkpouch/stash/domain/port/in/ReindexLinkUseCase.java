package com.linkpouch.stash.domain.port.in;

public interface ReindexLinkUseCase {
    void execute(ReindexLinkCommand command);
}
