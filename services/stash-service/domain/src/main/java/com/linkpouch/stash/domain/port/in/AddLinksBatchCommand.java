package com.linkpouch.stash.domain.port.in;

import java.util.List;
import java.util.UUID;

public record AddLinksBatchCommand(UUID stashId, List<String> urls) {}
