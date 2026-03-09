package com.linkpouch.stash.domain.port.in;

import com.linkpouch.stash.domain.model.StashLinksAggregate;

@FunctionalInterface
public interface SetStashPasswordUseCase {

    StashLinksAggregate execute(SetStashPasswordCommand command);
}
