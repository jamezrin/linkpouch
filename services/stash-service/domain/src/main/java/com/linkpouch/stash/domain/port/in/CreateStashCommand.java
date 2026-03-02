package com.linkpouch.stash.domain.port.in;

public record CreateStashCommand(String name, String password) {

    public CreateStashCommand(String name) {
        this(name, null);
    }
}
