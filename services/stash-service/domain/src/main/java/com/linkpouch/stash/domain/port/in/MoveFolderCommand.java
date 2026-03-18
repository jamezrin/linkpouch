package com.linkpouch.stash.domain.port.in;

import java.util.UUID;

public record MoveFolderCommand(UUID stashId, UUID folderId, UUID newParentFolderId, UUID insertAfterId) {}
