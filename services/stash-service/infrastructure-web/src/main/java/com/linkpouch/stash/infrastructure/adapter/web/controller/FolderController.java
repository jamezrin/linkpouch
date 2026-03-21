package com.linkpouch.stash.infrastructure.adapter.web.controller;

import java.util.List;
import java.util.UUID;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import com.linkpouch.stash.api.controller.FoldersApi;
import com.linkpouch.stash.api.model.*;
import com.linkpouch.stash.domain.exception.ForbiddenException;
import com.linkpouch.stash.domain.exception.NotFoundException;
import com.linkpouch.stash.domain.exception.UnauthorizedException;
import com.linkpouch.stash.domain.model.Folder;
import com.linkpouch.stash.domain.model.Stash;
import com.linkpouch.stash.domain.port.in.CreateFolderCommand;
import com.linkpouch.stash.domain.port.in.CreateFolderUseCase;
import com.linkpouch.stash.domain.port.in.DeleteFolderUseCase;
import com.linkpouch.stash.domain.port.in.FindStashByIdQuery;
import com.linkpouch.stash.domain.port.in.ListFoldersQuery;
import com.linkpouch.stash.domain.port.in.MoveFolderCommand;
import com.linkpouch.stash.domain.port.in.MoveFolderUseCase;
import com.linkpouch.stash.domain.port.in.MoveLinkToFolderCommand;
import com.linkpouch.stash.domain.port.in.MoveLinkToFolderUseCase;
import com.linkpouch.stash.domain.port.in.RenameFolderCommand;
import com.linkpouch.stash.domain.port.in.RenameFolderUseCase;
import com.linkpouch.stash.domain.service.StashAccessClaims;
import com.linkpouch.stash.infrastructure.adapter.web.interceptor.StashJwtInterceptor;
import com.linkpouch.stash.infrastructure.adapter.web.mapper.ApiDtoMapper;

import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class FolderController implements FoldersApi {

    private final CreateFolderUseCase createFolderUseCase;
    private final RenameFolderUseCase renameFolderUseCase;
    private final MoveFolderUseCase moveFolderUseCase;
    private final DeleteFolderUseCase deleteFolderUseCase;
    private final ListFoldersQuery listFoldersQuery;
    private final MoveLinkToFolderUseCase moveLinkToFolderUseCase;
    private final FindStashByIdQuery findStashByIdQuery;
    private final ApiDtoMapper mapper;
    private final HttpServletRequest httpRequest;

    @Override
    public ResponseEntity<List<FolderResponseDTO>> listFolders(final UUID stashId) {
        final Stash stash = findStashByIdQuery
                .execute(stashId)
                .orElseThrow(() -> new NotFoundException("Stash not found: " + stashId));

        final List<Folder> folders = listFoldersQuery.execute(stashId);
        return ResponseEntity.ok(mapper.mapOutFolders(folders));
    }

    @Override
    public ResponseEntity<FolderResponseDTO> createFolder(
            final UUID stashId, final CreateFolderRequestDTO createFolderRequestDTO) {
        final Stash stash = findStashByIdQuery
                .execute(stashId)
                .orElseThrow(() -> new NotFoundException("Stash not found: " + stashId));

        requireWriteAccess(stash);

        final UUID parentFolderId = createFolderRequestDTO.getParentFolderId() != null
                        && createFolderRequestDTO.getParentFolderId().isPresent()
                ? createFolderRequestDTO.getParentFolderId().get()
                : null;

        final Folder folder = createFolderUseCase.execute(
                new CreateFolderCommand(stashId, parentFolderId, createFolderRequestDTO.getName()));

        return ResponseEntity.status(HttpStatus.CREATED).body(mapper.mapOut(folder));
    }

    @Override
    public ResponseEntity<FolderResponseDTO> renameFolder(
            final UUID stashId, final UUID folderId, final RenameFolderRequestDTO renameFolderRequestDTO) {
        final Stash stash = findStashByIdQuery
                .execute(stashId)
                .orElseThrow(() -> new NotFoundException("Stash not found: " + stashId));

        requireWriteAccess(stash);

        final Folder folder = renameFolderUseCase.execute(
                new RenameFolderCommand(stashId, folderId, renameFolderRequestDTO.getName()));

        return ResponseEntity.ok(mapper.mapOut(folder));
    }

    @Override
    public ResponseEntity<Void> moveFolder(
            final UUID stashId, final UUID folderId, final MoveFolderRequestDTO moveFolderRequestDTO) {
        final Stash stash = findStashByIdQuery
                .execute(stashId)
                .orElseThrow(() -> new NotFoundException("Stash not found: " + stashId));

        requireWriteAccess(stash);

        final UUID newParentFolderId = moveFolderRequestDTO.getNewParentFolderId() != null
                        && moveFolderRequestDTO.getNewParentFolderId().isPresent()
                ? moveFolderRequestDTO.getNewParentFolderId().get()
                : null;

        final UUID insertAfterId = moveFolderRequestDTO.getInsertAfterId() != null
                        && moveFolderRequestDTO.getInsertAfterId().isPresent()
                ? moveFolderRequestDTO.getInsertAfterId().get()
                : null;

        moveFolderUseCase.execute(new MoveFolderCommand(stashId, folderId, newParentFolderId, insertAfterId));
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<Void> deleteFolder(final UUID stashId, final UUID folderId) {
        final Stash stash = findStashByIdQuery
                .execute(stashId)
                .orElseThrow(() -> new NotFoundException("Stash not found: " + stashId));

        requireWriteAccess(stash);

        deleteFolderUseCase.execute(stashId, folderId);
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<Void> moveLinkToFolder(
            final UUID stashId, final UUID linkId, final MoveLinkToFolderRequestDTO moveLinkToFolderRequestDTO) {
        final Stash stash = findStashByIdQuery
                .execute(stashId)
                .orElseThrow(() -> new NotFoundException("Stash not found: " + stashId));

        requireWriteAccess(stash);

        final UUID targetFolderId = moveLinkToFolderRequestDTO.getFolderId() != null
                        && moveLinkToFolderRequestDTO.getFolderId().isPresent()
                ? moveLinkToFolderRequestDTO.getFolderId().get()
                : null;

        moveLinkToFolderUseCase.execute(new MoveLinkToFolderCommand(stashId, linkId, targetFolderId));
        return ResponseEntity.noContent().build();
    }

    private void requireWriteAccess(final Stash stash) {
        if (!stash.isReadOnly()) return;
        final StashAccessClaims claims = getRequiredClaims();
        if (!claims.stashClaimed()) return;
        if (claims.claimer()) return;
        throw new ForbiddenException("This pouch is read-only");
    }

    private StashAccessClaims getRequiredClaims() {
        final Object claims = httpRequest.getAttribute(StashJwtInterceptor.CLAIMS_ATTR);
        if (!(claims instanceof StashAccessClaims)) {
            throw new UnauthorizedException("Access token is missing");
        }
        return (StashAccessClaims) claims;
    }
}
