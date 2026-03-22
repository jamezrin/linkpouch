package com.linkpouch.stash.infrastructure.adapter.web.controller;

import java.net.URI;
import java.util.List;
import java.util.UUID;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import com.linkpouch.stash.api.controller.LinksApi;
import com.linkpouch.stash.api.model.*;
import com.linkpouch.stash.domain.exception.ForbiddenException;
import com.linkpouch.stash.domain.exception.NotFoundException;
import com.linkpouch.stash.domain.exception.UnauthorizedException;
import com.linkpouch.stash.domain.model.Link;
import com.linkpouch.stash.domain.model.Stash;
import com.linkpouch.stash.domain.port.in.AddLinkCommand;
import com.linkpouch.stash.domain.port.in.AddLinkUseCase;
import com.linkpouch.stash.domain.port.in.AddLinksBatchCommand;
import com.linkpouch.stash.domain.port.in.AddLinksBatchUseCase;
import com.linkpouch.stash.domain.port.in.BatchReindexLinksCommand;
import com.linkpouch.stash.domain.port.in.BatchReindexLinksUseCase;
import com.linkpouch.stash.domain.port.in.DeleteLinkUseCase;
import com.linkpouch.stash.domain.port.in.DeleteLinksBatchCommand;
import com.linkpouch.stash.domain.port.in.DeleteLinksBatchUseCase;
import com.linkpouch.stash.domain.port.in.FindLinkByIdQuery;
import com.linkpouch.stash.domain.port.in.FindStashByIdQuery;
import com.linkpouch.stash.domain.port.in.ListLinksCommand;
import com.linkpouch.stash.domain.port.in.ListLinksQuery;
import com.linkpouch.stash.domain.port.in.ReindexLinkCommand;
import com.linkpouch.stash.domain.port.in.ReindexLinkUseCase;
import com.linkpouch.stash.domain.port.in.ReorderLinksCommand;
import com.linkpouch.stash.domain.port.in.ReorderLinksUseCase;
import com.linkpouch.stash.domain.port.in.RequestScreenshotRefreshUseCase;
import com.linkpouch.stash.domain.service.StashAccessClaims;
import com.linkpouch.stash.infrastructure.adapter.web.interceptor.StashJwtInterceptor;
import com.linkpouch.stash.infrastructure.adapter.web.mapper.LinkDtoMapper;

import lombok.RequiredArgsConstructor;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;

@RestController
@RequiredArgsConstructor
public class LinkController implements LinksApi {

    private final BatchReindexLinksUseCase batchReindexLinksUseCase;
    private final ReindexLinkUseCase reindexLinkUseCase;
    private final AddLinkUseCase addLinkUseCase;
    private final AddLinksBatchUseCase addLinksBatchUseCase;
    private final DeleteLinkUseCase deleteLinkUseCase;
    private final DeleteLinksBatchUseCase deleteLinksBatchUseCase;
    private final RequestScreenshotRefreshUseCase requestScreenshotRefreshUseCase;
    private final ReorderLinksUseCase reorderLinksUseCase;
    private final FindLinkByIdQuery findLinkByIdQuery;
    private final ListLinksQuery listLinksQuery;
    private final FindStashByIdQuery findStashByIdQuery;
    private final S3Client s3Client;
    private final LinkDtoMapper mapper;
    private final HttpServletRequest httpRequest;

    @Value("${linkpouch.base-url:http://localhost:8080}")
    private String baseUrl;

    @Value("${linkpouch.s3.bucket}")
    private String s3Bucket;

    @Override
    public ResponseEntity<AddLinksBatchResponseDTO> addLinksBatch(
            final UUID stashId, final AddLinksBatchRequestDTO addLinksBatchRequestDTO) {
        final var stash = findStashByIdQuery
                .execute(stashId)
                .orElseThrow(() -> new NotFoundException("Stash not found: " + stashId));

        requireWriteAccess(stash);

        final var result =
                addLinksBatchUseCase.execute(new AddLinksBatchCommand(stashId, addLinksBatchRequestDTO.getUrls()));

        final var response = new AddLinksBatchResponseDTO();
        response.setImported(result.imported());
        response.setSkipped(result.skipped());
        response.setLinks(result.links().stream().map(this::toResponse).toList());
        response.setErrors(result.errors().stream()
                .map(e -> {
                    final var err = new BatchImportErrorDTO();
                    err.setUrl(e.url());
                    err.setReason(e.reason());
                    return err;
                })
                .toList());

        return ResponseEntity.status(HttpStatus.MULTI_STATUS).body(response);
    }

    @Override
    public ResponseEntity<LinkResponseDTO> addLink(final UUID stashId, final AddLinkRequestDTO addLinkRequestDTO) {
        final var stash = findStashByIdQuery
                .execute(stashId)
                .orElseThrow(() -> new NotFoundException("Stash not found: " + stashId));

        requireWriteAccess(stash);

        final String url =
                addLinkRequestDTO.getUrl() != null ? addLinkRequestDTO.getUrl().toString() : null;
        final UUID folderId = addLinkRequestDTO.getFolderId() != null
                        && addLinkRequestDTO.getFolderId().isPresent()
                ? addLinkRequestDTO.getFolderId().get()
                : null;
        final var link = addLinkUseCase.execute(new AddLinkCommand(stashId, url, folderId));
        return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(link));
    }

    @Override
    public ResponseEntity<Void> deleteLink(final UUID stashId, final UUID linkId) {
        final var stash = findStashByIdQuery
                .execute(stashId)
                .orElseThrow(() -> new NotFoundException("Stash not found: " + stashId));

        requireWriteAccess(stash);

        final var link =
                findLinkByIdQuery.execute(linkId).orElseThrow(() -> new NotFoundException("Link not found: " + linkId));

        if (!link.getStashId().equals(stashId)) {
            throw new ForbiddenException("Link does not belong to this stash");
        }

        deleteLinkUseCase.execute(linkId);
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<PagedLinkResponseDTO> listLinks(
            final UUID stashId, final String search, final Integer page, final Integer size, final String folderId) {
        final ListLinksCommand command;
        if (folderId != null) {
            // folderId param present: filter by folder (empty string → root, UUID string → specific folder)
            if (folderId.isEmpty()) {
                command = ListLinksCommand.forRoot(stashId, page != null ? page : 0, size != null ? size : 20);
            } else {
                command = ListLinksCommand.forFolder(
                        stashId, UUID.fromString(folderId), page != null ? page : 0, size != null ? size : 20);
            }
        } else {
            command = ListLinksCommand.forStash(stashId, search, page != null ? page : 0, size != null ? size : 20);
        }
        final var pagedResult = listLinksQuery.execute(command);

        final PagedLinkResponseDTO response = new PagedLinkResponseDTO();
        response.setContent(pagedResult.content().stream().map(this::toResponse).toList());
        response.setTotalElements(pagedResult.totalElements());
        response.setTotalPages(pagedResult.totalPages());
        response.setSize(pagedResult.size());
        response.setNumber(pagedResult.number());

        return ResponseEntity.ok(response);
    }

    @Override
    public ResponseEntity<Void> putLinkScreenshot(final UUID stashId, final UUID linkId) {
        final var stash = findStashByIdQuery
                .execute(stashId)
                .orElseThrow(() -> new NotFoundException("Stash not found: " + stashId));

        requireWriteAccess(stash);

        final var link =
                findLinkByIdQuery.execute(linkId).orElseThrow(() -> new NotFoundException("Link not found: " + linkId));

        if (!link.getStashId().equals(stashId)) {
            throw new ForbiddenException("Link does not belong to this stash");
        }

        requestScreenshotRefreshUseCase.execute(linkId);
        return ResponseEntity.accepted().build();
    }

    @Override
    public ResponseEntity<Void> reindexLink(final UUID stashId, final UUID linkId) {
        final var stash = findStashByIdQuery
                .execute(stashId)
                .orElseThrow(() -> new NotFoundException("Stash not found: " + stashId));

        requireWriteAccess(stash);

        final var link =
                findLinkByIdQuery.execute(linkId).orElseThrow(() -> new NotFoundException("Link not found: " + linkId));

        if (!link.getStashId().equals(stashId)) {
            throw new ForbiddenException("Link does not belong to this stash");
        }

        reindexLinkUseCase.execute(new ReindexLinkCommand(linkId, stashId));
        return ResponseEntity.accepted().build();
    }

    @Override
    public ResponseEntity<Void> deleteLinksBatch(
            final UUID stashId, final DeleteLinksBatchRequestDTO deleteLinksBatchRequestDTO) {
        final var stash = findStashByIdQuery
                .execute(stashId)
                .orElseThrow(() -> new NotFoundException("Stash not found: " + stashId));

        requireWriteAccess(stash);

        deleteLinksBatchUseCase.execute(
                new DeleteLinksBatchCommand(stashId, List.copyOf(deleteLinksBatchRequestDTO.getLinkIds())));
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<Void> batchReindexLinks(
            final UUID stashId, final BatchReindexLinksRequestDTO batchReindexLinksRequestDTO) {
        final var stash = findStashByIdQuery
                .execute(stashId)
                .orElseThrow(() -> new NotFoundException("Stash not found: " + stashId));

        requireWriteAccess(stash);

        batchReindexLinksUseCase.execute(
                new BatchReindexLinksCommand(stashId, List.copyOf(batchReindexLinksRequestDTO.getLinkIds())));
        return ResponseEntity.accepted().build();
    }

    @Override
    public ResponseEntity<Void> reorderLinks(final UUID stashId, final ReorderLinksRequestDTO reorderLinksRequestDTO) {
        final var stash = findStashByIdQuery
                .execute(stashId)
                .orElseThrow(() -> new NotFoundException("Stash not found: " + stashId));

        requireWriteAccess(stash);

        final var insertAfterIdNullable = reorderLinksRequestDTO.getInsertAfterId();
        final UUID insertAfterId =
                insertAfterIdNullable != null && insertAfterIdNullable.isPresent() ? insertAfterIdNullable.get() : null;
        reorderLinksUseCase.execute(
                new ReorderLinksCommand(stashId, reorderLinksRequestDTO.getLinkIds(), insertAfterId));
        return ResponseEntity.noContent().build();
    }

    private void requireWriteAccess(final Stash stash) {
        if (!stash.isReadOnly()) return;
        final StashAccessClaims claims = getRequiredClaims();
        if (!claims.stashClaimed()) return; // unclaimed → anyone can write
        if (claims.claimer()) return;
        throw new ForbiddenException("This pouch is read-only");
    }

    @Override
    public ResponseEntity<Resource> getLinkScreenshot(final UUID stashId, final UUID linkId) {
        final var link =
                findLinkByIdQuery.execute(linkId).orElseThrow(() -> new NotFoundException("Link not found: " + linkId));
        if (!link.getStashId().equals(stashId)) {
            throw new ForbiddenException("Link does not belong to this stash");
        }
        if (link.getScreenshotKey() == null) {
            return ResponseEntity.notFound().build();
        }
        try {
            final var request = GetObjectRequest.builder()
                    .bucket(s3Bucket)
                    .key(link.getScreenshotKey().getValue())
                    .build();
            final byte[] bytes = s3Client.getObjectAsBytes(request).asByteArray();
            return ResponseEntity.ok()
                    .contentType(MediaType.IMAGE_PNG)
                    .header(HttpHeaders.CACHE_CONTROL, "public, max-age=86400")
                    .body(new ByteArrayResource(bytes));
        } catch (NoSuchKeyException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).build();
        }
    }

    private StashAccessClaims getRequiredClaims() {
        final Object claims = httpRequest.getAttribute(StashJwtInterceptor.CLAIMS_ATTR);
        if (!(claims instanceof StashAccessClaims)) {
            throw new UnauthorizedException("Access token is missing");
        }
        return (StashAccessClaims) claims;
    }

    private LinkResponseDTO toResponse(final Link link) {
        final var dto = mapper.mapOut(link);
        if (link.getScreenshotKey() != null) {
            dto.setScreenshotUrl(URI.create(
                    baseUrl + "/api/stashes/" + link.getStashId() + "/links/" + link.getId() + "/screenshot"));
        }
        return dto;
    }
}
