package com.linkpouch.stash.application.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record StashResponse(
    UUID id,
    String name,
    String signature,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {}
