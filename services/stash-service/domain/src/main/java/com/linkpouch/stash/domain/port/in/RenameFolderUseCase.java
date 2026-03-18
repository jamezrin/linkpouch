package com.linkpouch.stash.domain.port.in;

import com.linkpouch.stash.domain.model.Folder;

public interface RenameFolderUseCase {

    Folder execute(RenameFolderCommand command);
}
