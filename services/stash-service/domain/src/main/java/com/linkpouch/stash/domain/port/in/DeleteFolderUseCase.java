package com.linkpouch.stash.domain.port.in;

import java.util.UUID;

public interface DeleteFolderUseCase {

    void execute(UUID stashId, UUID folderId);
}
