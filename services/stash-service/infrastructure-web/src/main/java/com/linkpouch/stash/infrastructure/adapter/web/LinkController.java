package com.linkpouch.stash.infrastructure.adapter.web;

import java.net.URI;
import java.util.List;
import java.util.UUID;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import com.linkpouch.stash.api.controller.LinksApi;
import com.linkpouch.stash.api.model.*;
import com.linkpouch.stash.domain.exception.ForbiddenException;
import com.linkpouch.stash.domain.exception.NotFoundException;
import com.linkpouch.stash.domain.exception.UnauthorizedException;
import com.linkpouch.stash.domain.model.Link;
import com.linkpouch.stash.domain.model.LinkStatus;
import com.linkpouch.stash.domain.port.in.AddLinkCommand;
import com.linkpouch.stash.domain.port.in.AddLinkUseCase;
import com.linkpouch.stash.domain.port.in.AddLinksBatchCommand;
import com.linkpouch.stash.domain.port.in.AddLinksBatchUseCase;
import com.linkpouch.stash.domain.port.in.DeleteLinkUseCase;
import com.linkpouch.stash.domain.port.in.DeleteLinksBatchCommand;
import com.linkpouch.stash.domain.port.in.DeleteLinksBatchUseCase;
import com.linkpouch.stash.domain.port.in.FindLinkByIdQuery;
import com.linkpouch.stash.domain.port.in.FindStashByIdQuery;
import com.linkpouch.stash.domain.port.in.ListLinksQuery;
import com.linkpouch.stash.domain.port.in.PutBatchLinkScreenshotUseCase;
import com.linkpouch.stash.domain.port.in.ReorderLinksCommand;
import com.linkpouch.stash.domain.port.in.ReorderLinksUseCase;
import com.linkpouch.stash.domain.port.in.RequestScreenshotRefreshUseCase;
import com.linkpouch.stash.domain.port.in.UpdateLinkMetadataCommand;
import com.linkpouch.stash.domain.port.in.UpdateLinkMetadataUseCase;
import com.linkpouch.stash.domain.port.in.UpdateLinkScreenshotUseCase;
import com.linkpouch.stash.domain.port.in.UpdateLinkStatusUseCase;
import com.linkpouch.stash.domain.model.Stash;
import com.linkpouch.stash.domain.port.outbound.AccountRepository;
import com.linkpouch.stash.domain.service.StashAccessClaims;
import com.linkpouch.stash.domain.service.StashTokenService;
import com.linkpouch.stash.infrastructure.adapter.web.mapper.ApiDtoMapper;

import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class LinkController implements LinksApi {

    private final AddLinkUseCase addLinkUseCase;
    private final AddLinksBatchUseCase addLinksBatchUseCase;
    private final DeleteLinkUseCase deleteLinkUseCase;
    private final DeleteLinksBatchUseCase deleteLinksBatchUseCase;
    private final PutBatchLinkScreenshotUseCase putBatchLinkScreenshotUseCase;
    private final UpdateLinkMetadataUseCase updateLinkMetadataUseCase;
    private final UpdateLinkScreenshotUseCase updateLinkScreenshotUseCase;
    private final UpdateLinkStatusUseCase updateLinkStatusUseCase;
    private final RequestScreenshotRefreshUseCase requestScreenshotRefreshUseCase;
    private final ReorderLinksUseCase reorderLinksUseCase;
    private final FindLinkByIdQuery findLinkByIdQuery;
    private final ListLinksQuery listLinksQuery;
    private final FindStashByIdQuery findStashByIdQuery;
    private final AccountRepository accountRepository;
    private final StashTokenService tokenService;
    private final ApiDtoMapper mapper;
    private final HttpServletRequest httpRequest;

    @Value("${linkpouch.base-url:http://localhost:8080}")
    private String baseUrl;

    @Value("${linkpouch.indexer.callback-secret}")
    private String indexerCallbackSecret;

    @Override
    public ResponseEntity<AddLinksBatchResponseDTO> addLinksBatch(
            final UUID stashId, final AddLinksBatchRequestDTO addLinksBatchRequestDTO) {
        final var stash = findStashByIdQuery
                .execute(stashId)
                .orElseThrow(() -> new NotFoundException("Stash not found: " + stashId));

        validatePwdKeyIfProtected(stashId, stash.getPasswordHash(), stash.isPasswordProtected());
        requireWriteAccess(stashId, stash);

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

        validatePwdKeyIfProtected(stashId, stash.getPasswordHash(), stash.isPasswordProtected());
        requireWriteAccess(stashId, stash);

        final String url =
                addLinkRequestDTO.getUrl() != null ? addLinkRequestDTO.getUrl().toString() : null;
        final var link = addLinkUseCase.execute(new AddLinkCommand(stashId, url));
        return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(link));
    }

    @Override
    public ResponseEntity<Void> deleteLink(final UUID stashId, final UUID linkId) {
        final var stash = findStashByIdQuery
                .execute(stashId)
                .orElseThrow(() -> new NotFoundException("Stash not found: " + stashId));

        validatePwdKeyIfProtected(stashId, stash.getPasswordHash(), stash.isPasswordProtected());
        requireWriteAccess(stashId, stash);

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
            final UUID stashId, final String search, final Integer page, final Integer size) {
        final var stash = findStashByIdQuery
                .execute(stashId)
                .orElseThrow(() -> new NotFoundException("Stash not found: " + stashId));

        validatePwdKeyIfProtected(stashId, stash.getPasswordHash(), stash.isPasswordProtected());

        final var pagedResult = listLinksQuery.execute(stashId, search, page, size);

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

        validatePwdKeyIfProtected(stashId, stash.getPasswordHash(), stash.isPasswordProtected());
        requireWriteAccess(stashId, stash);

        final var link =
                findLinkByIdQuery.execute(linkId).orElseThrow(() -> new NotFoundException("Link not found: " + linkId));

        if (!link.getStashId().equals(stashId)) {
            throw new ForbiddenException("Link does not belong to this stash");
        }

        requestScreenshotRefreshUseCase.execute(linkId);
        return ResponseEntity.accepted().build();
    }

    @Override
    public ResponseEntity<Void> deleteLinksBatch(
            final UUID stashId, final DeleteLinksBatchRequestDTO deleteLinksBatchRequestDTO) {
        final var stash = findStashByIdQuery
                .execute(stashId)
                .orElseThrow(() -> new NotFoundException("Stash not found: " + stashId));

        validatePwdKeyIfProtected(stashId, stash.getPasswordHash(), stash.isPasswordProtected());
        requireWriteAccess(stashId, stash);

        deleteLinksBatchUseCase.execute(
                new DeleteLinksBatchCommand(stashId, List.copyOf(deleteLinksBatchRequestDTO.getLinkIds())));
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<Void> putBatchLinkScreenshot(
            final UUID stashId, final PutBatchLinkScreenshotRequestDTO putBatchLinkScreenshotRequestDTO) {
        final var stash = findStashByIdQuery
                .execute(stashId)
                .orElseThrow(() -> new NotFoundException("Stash not found: " + stashId));

        validatePwdKeyIfProtected(stashId, stash.getPasswordHash(), stash.isPasswordProtected());
        requireWriteAccess(stashId, stash);

        putBatchLinkScreenshotUseCase.execute(stashId, List.copyOf(putBatchLinkScreenshotRequestDTO.getLinkIds()));
        return ResponseEntity.accepted().build();
    }

    @Override
    public ResponseEntity<LinkResponseDTO> updateLinkMetadata(
            final UUID linkId, final String xIndexerSecret, final UpdateLinkMetadataRequestDTO dto) {
        if (!indexerCallbackSecret.equals(xIndexerSecret)) {
            throw new UnauthorizedException("Invalid indexer secret");
        }
        final var link = updateLinkMetadataUseCase.execute(new UpdateLinkMetadataCommand(
                linkId,
                dto.getTitle(),
                dto.getDescription(),
                dto.getFaviconUrl(),
                dto.getPageContent(),
                dto.getFinalUrl()));
        return ResponseEntity.ok(toResponse(link));
    }

    @Override
    public ResponseEntity<Void> updateLinkStatus(
            final UUID linkId, final String xIndexerSecret, final UpdateLinkStatusRequestDTO dto) {
        if (!indexerCallbackSecret.equals(xIndexerSecret)) {
            throw new UnauthorizedException("Invalid indexer secret");
        }
        final LinkStatus status;
        try {
            status = LinkStatus.valueOf(dto.getStatus().getValue());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid status value: " + dto.getStatus());
        }
        updateLinkStatusUseCase.execute(linkId, status);
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<LinkResponseDTO> updateLinkScreenshot(
            final UUID linkId, final String xIndexerSecret, final UpdateLinkScreenshotRequestDTO dto) {
        if (!indexerCallbackSecret.equals(xIndexerSecret)) {
            throw new UnauthorizedException("Invalid indexer secret");
        }
        final var link = updateLinkScreenshotUseCase.execute(linkId, dto.getScreenshotKey());
        return ResponseEntity.ok(toResponse(link));
    }

    @Override
    public ResponseEntity<Void> reorderLinks(final UUID stashId, final ReorderLinksRequestDTO reorderLinksRequestDTO) {
        final var stash = findStashByIdQuery
                .execute(stashId)
                .orElseThrow(() -> new NotFoundException("Stash not found: " + stashId));

        validatePwdKeyIfProtected(stashId, stash.getPasswordHash(), stash.isPasswordProtected());
        requireWriteAccess(stashId, stash);

        final var insertAfterIdNullable = reorderLinksRequestDTO.getInsertAfterId();
        final UUID insertAfterId =
                insertAfterIdNullable != null && insertAfterIdNullable.isPresent() ? insertAfterIdNullable.get() : null;
        reorderLinksUseCase.execute(
                new ReorderLinksCommand(stashId, reorderLinksRequestDTO.getLinkIds(), insertAfterId));
        return ResponseEntity.noContent().build();
    }

    private void requireWriteAccess(final UUID stashId, final Stash stash) {
        if (!stash.isReadOnly()) return;
        if (!accountRepository.isStashClaimedByAnyone(stashId)) return;
        if (isClaimer()) return;
        throw new ForbiddenException("This pouch is read-only");
    }

    private boolean isClaimer() {
        final Object claimsAttr = httpRequest.getAttribute(StashJwtInterceptor.CLAIMS_ATTR);
        return claimsAttr instanceof StashAccessClaims claims && claims.claimer();
    }

    private void validatePwdKeyIfProtected(
            final UUID stashId, final String passwordHash, final boolean isPasswordProtected) {
        if (!isPasswordProtected) return;
        final Object claimsAttr = httpRequest.getAttribute(StashJwtInterceptor.CLAIMS_ATTR);
        if (!(claimsAttr instanceof StashAccessClaims claims)) {
            throw new UnauthorizedException("Access token is missing");
        }
        tokenService.validatePwdKey(claims, stashId, passwordHash);
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
