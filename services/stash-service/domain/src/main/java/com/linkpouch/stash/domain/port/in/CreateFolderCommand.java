package com.linkpouch.stash.domain.port.in;

import java.util.UUID;

public record CreateFolderCommand(UUID stashId, UUID parentFolderId, String name) {}
