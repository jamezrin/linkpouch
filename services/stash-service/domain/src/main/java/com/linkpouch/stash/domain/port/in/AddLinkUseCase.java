package com.linkpouch.stash.domain.port.in;

import com.linkpouch.stash.domain.model.Link;

@FunctionalInterface
public interface AddLinkUseCase {

    Link execute(AddLinkCommand command);
}
