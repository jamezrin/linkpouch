package com.linkpouch.stash.application.service;

import java.util.List;
import java.util.UUID;

import org.springframework.transaction.annotation.Transactional;

import com.linkpouch.stash.application.annotation.UseCase;
import com.linkpouch.stash.domain.exception.ForbiddenException;
import com.linkpouch.stash.domain.exception.NotFoundException;
import com.linkpouch.stash.domain.model.Folder;
import com.linkpouch.stash.domain.port.in.CreateFolderCommand;
import com.linkpouch.stash.domain.port.in.CreateFolderUseCase;
import com.linkpouch.stash.domain.port.in.DeleteFolderUseCase;
import com.linkpouch.stash.domain.port.in.ListFoldersQuery;
import com.linkpouch.stash.domain.port.in.MoveFolderCommand;
import com.linkpouch.stash.domain.port.in.MoveFolderUseCase;
import com.linkpouch.stash.domain.port.in.RenameFolderCommand;
import com.linkpouch.stash.domain.port.in.RenameFolderUseCase;
import com.linkpouch.stash.domain.port.outbound.FolderRepository;
import com.linkpouch.stash.domain.port.outbound.ScreenshotStorage;
import com.linkpouch.stash.domain.port.outbound.StashRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@UseCase
@RequiredArgsConstructor
public class FolderManagementService
        implements CreateFolderUseCase, RenameFolderUseCase, MoveFolderUseCase, DeleteFolderUseCase, ListFoldersQuery {

    private final FolderRepository folderRepository;
    private final StashRepository stashRepository;
    private final ScreenshotStorage screenshotStorage;

    // ==================== CreateFolderUseCase ====================

    @Override
    @Transactional
    public Folder execute(final CreateFolderCommand command) {
        stashRepository
                .findById(command.stashId())
                .orElseThrow(() -> new NotFoundException("Stash not found: " + command.stashId()));

        folderRepository.shiftFolderPositionsDown(command.stashId(), command.parentFolderId());

        final Folder folder = Folder.create(command.stashId(), command.parentFolderId(), command.name(), 0);
        return folderRepository.save(folder);
    }

    // ==================== RenameFolderUseCase ====================

    @Override
    @Transactional
    public Folder execute(final RenameFolderCommand command) {
        final Folder folder = folderRepository
                .findById(command.folderId())
                .orElseThrow(() -> new NotFoundException("Folder not found: " + command.folderId()));

        if (!folder.getStashId().equals(command.stashId())) {
            throw new ForbiddenException("Folder does not belong to this stash");
        }

        folder.rename(command.name());
        return folderRepository.save(folder);
    }

    // ==================== MoveFolderUseCase ====================

    @Override
    @Transactional
    public void execute(final MoveFolderCommand command) {
        final Folder folder = folderRepository
                .findById(command.folderId())
                .orElseThrow(() -> new NotFoundException("Folder not found: " + command.folderId()));

        if (!folder.getStashId().equals(command.stashId())) {
            throw new ForbiddenException("Folder does not belong to this stash");
        }

        folder.moveTo(command.newParentFolderId());
        folderRepository.save(folder);

        folderRepository.reorderFolders(
                command.stashId(), command.newParentFolderId(), List.of(command.folderId()), command.insertAfterId());
    }

    // ==================== DeleteFolderUseCase ====================

    @Override
    @Transactional
    public void execute(final UUID stashId, final UUID folderId) {
        final Folder folder = folderRepository
                .findById(folderId)
                .orElseThrow(() -> new NotFoundException("Folder not found: " + folderId));

        if (!folder.getStashId().equals(stashId)) {
            throw new ForbiddenException("Folder does not belong to this stash");
        }

        // Collect all descendant folder IDs (including self) for S3 cleanup
        final List<UUID> descendantIds = folderRepository.findDescendantIds(folderId);
        final List<UUID> linkIds = folderRepository.findLinkIdsByFolderIds(descendantIds);

        log.info(
                "Deleting folder {} with {} descendants, {} links to clean up screenshots for",
                folderId,
                descendantIds.size() - 1,
                linkIds.size());

        // DB cascade (ON DELETE CASCADE) handles child folders;
        // links.folder_id will be SET NULL for all affected links.
        // Screenshots of links inside deleted folders must be cleaned up before deletion.
        // We don't delete the links themselves — they are moved to root by the DB.
        // But we do clean up their screenshot files since the links remain.
        // Note: links keep their data; only the folder association is nulled.
        folderRepository.deleteById(folderId);
    }

    // ==================== ListFoldersQuery ====================

    @Override
    @Transactional(readOnly = true)
    public List<Folder> execute(final UUID stashId) {
        return folderRepository.findByStashId(stashId);
    }
}
