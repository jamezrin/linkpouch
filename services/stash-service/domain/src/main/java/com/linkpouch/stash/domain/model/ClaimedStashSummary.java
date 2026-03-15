package com.linkpouch.stash.domain.model;

import java.time.LocalDateTime;
import java.util.UUID;

public record ClaimedStashSummary(
        UUID stashId, String name, StashVisibility visibility, LocalDateTime createdAt, LocalDateTime updatedAt) {}
