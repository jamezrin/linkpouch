package com.linkpouch.stash.domain.port.in;

import java.util.UUID;

public record DisownStashCommand(UUID accountId, UUID stashId) {}
