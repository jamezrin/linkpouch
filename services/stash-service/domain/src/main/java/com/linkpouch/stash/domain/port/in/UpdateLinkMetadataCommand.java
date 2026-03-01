package com.linkpouch.stash.domain.port.in;

import java.util.UUID;

public record UpdateLinkMetadataCommand(
        UUID linkId, String title, String description, String faviconUrl, String pageContent, String finalUrl) {}
