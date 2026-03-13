package com.linkpouch.stash.domain.port.in;

@FunctionalInterface
public interface DisownStashUseCase {

    void execute(DisownStashCommand command);
}
