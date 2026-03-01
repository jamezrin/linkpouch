package com.linkpouch.stash.domain.port.in;

import java.util.UUID;

import com.linkpouch.stash.domain.model.Link;

@FunctionalInterface
public interface UpdateLinkScreenshotUseCase {

    Link execute(UUID linkId, String screenshotKey);
}
