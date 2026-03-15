package com.linkpouch.stash.domain.port.in;

import java.util.UUID;

/**
 * @param sort JSON:API sort string — prefix with {@code -} for descending (e.g. {@code -createdAt}).
 */
public record ListClaimedStashesCommand(UUID accountId, String search, String sort, int page, int size) {}
