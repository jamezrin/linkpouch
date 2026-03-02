package com.linkpouch.stash.domain.port.in;

import com.linkpouch.stash.domain.model.Stash;

@FunctionalInterface
public interface SetStashPasswordUseCase {

    Stash execute(SetStashPasswordCommand command);
}
