package com.linkpouch.stash.domain.port.in;

import java.util.UUID;

public record AddLinkCommand(UUID stashId, String url) {}
