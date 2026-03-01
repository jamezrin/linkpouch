package com.linkpouch.stash.domain.port.in;

import java.util.List;

import com.linkpouch.stash.domain.model.Link;

@FunctionalInterface
public interface AddLinksBatchUseCase {

    AddLinksBatchResult execute(AddLinksBatchCommand command);

    record AddLinksBatchResult(
            int imported, int skipped, List<BatchLinkError> errors, List<Link> links) {}

    record BatchLinkError(String url, String reason) {}
}
