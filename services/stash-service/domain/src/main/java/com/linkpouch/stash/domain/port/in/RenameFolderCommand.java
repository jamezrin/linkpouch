package com.linkpouch.stash.domain.port.in;

import java.util.UUID;

public record RenameFolderCommand(UUID stashId, UUID folderId, String name) {}
