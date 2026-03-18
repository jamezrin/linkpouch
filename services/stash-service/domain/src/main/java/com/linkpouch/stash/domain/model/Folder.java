package com.linkpouch.stash.domain.model;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.ToString;

/** Entity: Folder — standalone entity (not part of Stash aggregate) */
@Getter
@EqualsAndHashCode(of = "id")
@ToString
public class Folder {

    private final UUID id;
    private final UUID stashId;
    private UUID parentFolderId;
    private FolderName name;
    private int position;
    private final LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public Folder(
            final UUID id,
            final UUID stashId,
            final UUID parentFolderId,
            final FolderName name,
            final int position,
            final LocalDateTime createdAt,
            final LocalDateTime updatedAt) {
        this.id = id != null ? id : UUID.randomUUID();
        this.stashId = stashId;
        this.parentFolderId = parentFolderId;
        this.name = name;
        this.position = position;
        this.createdAt = createdAt != null ? createdAt : LocalDateTime.now(ZoneOffset.UTC);
        this.updatedAt = updatedAt != null ? updatedAt : this.createdAt;
    }

    public static Folder create(final UUID stashId, final UUID parentFolderId, final String name, final int position) {
        return new Folder(null, stashId, parentFolderId, FolderName.of(name), position, null, null);
    }

    public void rename(final String newName) {
        this.name = FolderName.of(newName);
        this.updatedAt = LocalDateTime.now(ZoneOffset.UTC);
    }

    public void moveTo(final UUID newParentFolderId) {
        this.parentFolderId = newParentFolderId;
        this.updatedAt = LocalDateTime.now(ZoneOffset.UTC);
    }

    public void setPosition(final int position) {
        this.position = position;
        this.updatedAt = LocalDateTime.now(ZoneOffset.UTC);
    }
}
