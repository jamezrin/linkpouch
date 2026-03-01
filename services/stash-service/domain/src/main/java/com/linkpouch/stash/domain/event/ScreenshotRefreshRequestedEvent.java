package com.linkpouch.stash.domain.event;

import java.util.UUID;

public record ScreenshotRefreshRequestedEvent(UUID linkId, UUID stashId, String url) implements DomainEvent {}
