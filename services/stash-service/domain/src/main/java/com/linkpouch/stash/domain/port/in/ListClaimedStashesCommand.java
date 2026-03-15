package com.linkpouch.stash.domain.port.in;

import java.util.UUID;

public record ListClaimedStashesCommand(UUID accountId, String search, String sort, String dir, int page, int size) {}
