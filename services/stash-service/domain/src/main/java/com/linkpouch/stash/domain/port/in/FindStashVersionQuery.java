package com.linkpouch.stash.domain.port.in;

import java.util.Optional;
import java.util.UUID;

public interface FindStashVersionQuery {
    Optional<Integer> execute(UUID stashId);
}
