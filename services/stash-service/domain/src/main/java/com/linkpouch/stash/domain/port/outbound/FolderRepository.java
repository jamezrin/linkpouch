package com.linkpouch.stash.domain.port.outbound;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.linkpouch.stash.domain.model.Folder;

/** Driven Port: Folder Repository */
public interface FolderRepository {

    Folder save(Folder folder);

    Optional<Folder> findById(UUID id);

    /** Returns all folders in the stash as a flat list (ordered by parentFolderId, position). */
    List<Folder> findByStashId(UUID stashId);

    /** Deletes a folder by ID. DB cascade deletes child folders; sets links.folder_id = NULL. */
    void deleteById(UUID id);

    /**
     * Returns the IDs of all descendant folders (including self) using a recursive CTE.
     * Used for S3 cleanup before deletion.
     */
    List<UUID> findDescendantIds(UUID folderId);

    /** Returns the link IDs whose folder_id is in the given set (used for S3 cleanup). */
    List<UUID> findLinkIdsByFolderIds(List<UUID> folderIds);

    /** Increments position of all folders in the given scope by 1 (makes room at position 0). */
    void shiftFolderPositionsDown(UUID stashId, UUID parentFolderId);

    /**
     * Reorders folders within a parent scope. Moves movedFolderIds to immediately after
     * insertAfterId. If insertAfterId is null, places them at the beginning.
     */
    void reorderFolders(UUID stashId, UUID parentFolderId, List<UUID> movedFolderIds, UUID insertAfterId);
}
