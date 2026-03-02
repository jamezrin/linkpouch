package com.linkpouch.stash.domain.port.in;

@FunctionalInterface
public interface RemoveStashPasswordUseCase {

    void execute(RemoveStashPasswordCommand command);
}
