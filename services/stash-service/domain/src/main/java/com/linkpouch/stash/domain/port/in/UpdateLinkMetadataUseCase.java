package com.linkpouch.stash.domain.port.in;

import com.linkpouch.stash.domain.model.Link;

@FunctionalInterface
public interface UpdateLinkMetadataUseCase {

    Link execute(UpdateLinkMetadataCommand command);
}
