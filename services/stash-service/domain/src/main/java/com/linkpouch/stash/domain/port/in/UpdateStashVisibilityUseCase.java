package com.linkpouch.stash.domain.port.in;

@FunctionalInterface
public interface UpdateStashVisibilityUseCase {

    /** Allows the claiming account to change the stash visibility between PRIVATE and SHARED. */
    void execute(UpdateStashVisibilityCommand command);
}
