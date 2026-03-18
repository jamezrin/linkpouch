package com.linkpouch.stash.domain.port.in;

import java.util.UUID;

public record MoveLinkToFolderCommand(UUID stashId, UUID linkId, UUID targetFolderId) {}
