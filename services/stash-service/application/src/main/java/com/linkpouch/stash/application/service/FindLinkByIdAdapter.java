package com.linkpouch.stash.application.service;

import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Component;

import com.linkpouch.stash.domain.model.Link;
import com.linkpouch.stash.domain.port.in.FindLinkByIdQuery;

import lombok.RequiredArgsConstructor;

/**
 * Thin adapter that exposes {@link FindLinkByIdQuery} without conflicting with
 * {@code DeleteLinkUseCase}'s {@code void execute(UUID)} signature on
 * {@link LinkManagementService}.
 */
@Component
@RequiredArgsConstructor
public class FindLinkByIdAdapter implements FindLinkByIdQuery {

    private final LinkManagementService linkManagementService;

    @Override
    public Optional<Link> execute(final UUID linkId) {
        return linkManagementService.findLinkById(linkId);
    }
}
