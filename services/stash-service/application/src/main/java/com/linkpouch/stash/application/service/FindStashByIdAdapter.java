package com.linkpouch.stash.application.service;

import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Component;

import com.linkpouch.stash.domain.model.StashInfo;
import com.linkpouch.stash.domain.port.in.FindStashByIdQuery;

import lombok.RequiredArgsConstructor;

/**
 * Thin adapter that exposes {@link FindStashByIdQuery} without conflicting with
 * {@code DeleteStashUseCase}'s {@code void execute(UUID)} signature on
 * {@link StashManagementService}.
 */
@Component
@RequiredArgsConstructor
public class FindStashByIdAdapter implements FindStashByIdQuery {

    private final StashManagementService stashManagementService;

    @Override
    public Optional<StashInfo> execute(final UUID stashId) {
        return stashManagementService.findStashById(stashId);
    }
}
