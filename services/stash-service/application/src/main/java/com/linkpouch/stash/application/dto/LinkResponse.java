package com.linkpouch.stash.application.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record LinkResponse(
    UUID id,
    String url,
    String title,
    String description,
    String faviconUrl,
    String finalUrl,
    String screenshotKey,
    LocalDateTime screenshotGeneratedAt,
    LocalDateTime createdAt
) {}
