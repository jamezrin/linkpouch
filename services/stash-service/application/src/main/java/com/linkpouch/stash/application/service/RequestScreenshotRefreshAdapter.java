package com.linkpouch.stash.application.service;

import java.util.UUID;

import org.springframework.stereotype.Component;

import com.linkpouch.stash.domain.port.in.RequestScreenshotRefreshUseCase;

import lombok.RequiredArgsConstructor;

/**
 * Thin adapter that exposes {@link RequestScreenshotRefreshUseCase} without conflicting with
 * {@code DeleteLinkUseCase}'s {@code void execute(UUID)} signature on
 * {@link LinkManagementService}.
 */
@Component
@RequiredArgsConstructor
public class RequestScreenshotRefreshAdapter implements RequestScreenshotRefreshUseCase {

    private final LinkManagementService linkManagementService;

    @Override
    public void execute(final UUID linkId) {
        linkManagementService.requestScreenshotRefresh(linkId);
    }
}
