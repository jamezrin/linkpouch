package com.linkpouch.stash.domain.port.in;

import java.util.List;
import java.util.UUID;

import com.linkpouch.stash.domain.model.Folder;

public interface ListFoldersQuery {

    List<Folder> execute(UUID stashId);
}
