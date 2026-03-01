package com.linkpouch.stash.domain.port.in;

import java.util.UUID;

import com.linkpouch.stash.domain.model.Link;
import com.linkpouch.stash.domain.model.LinkStatus;

@FunctionalInterface
public interface UpdateLinkStatusUseCase {

    Link execute(UUID linkId, LinkStatus status);
}
