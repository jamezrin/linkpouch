package com.linkpouch.stash.infrastructure.adapter.web;

import java.net.URI;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

import com.linkpouch.stash.api.controller.LinksApi;
import com.linkpouch.stash.api.model.*;
import com.linkpouch.stash.application.exception.ForbiddenException;
import com.linkpouch.stash.application.exception.NotFoundException;
import com.linkpouch.stash.application.exception.UnauthorizedException;
import com.linkpouch.stash.application.service.LinkManagementService;
import com.linkpouch.stash.application.service.SignatureValidationService;
import com.linkpouch.stash.application.service.StashManagementService;
import com.linkpouch.stash.domain.model.Link;
import com.linkpouch.stash.domain.model.LinkStatus;
import com.linkpouch.stash.infrastructure.adapter.web.mapper.ApiDtoMapper;

import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class LinkController implements LinksApi {

    private final LinkManagementService linkService;
    private final StashManagementService stashService;
    private final SignatureValidationService signatureService;
    private final ApiDtoMapper mapper;

    @Value("${linkpouch.base-url:http://localhost:8080}")
    private String baseUrl;

    @Value("${linkpouch.indexer.callback-secret}")
    private String indexerCallbackSecret;

    @Override
    public ResponseEntity<AddLinksBatchResponseDTO> addLinksBatch(
            final UUID stashId,
            final String xStashSignature,
            final AddLinksBatchRequestDTO addLinksBatchRequestDTO) {
        final var stash =
                stashService
                        .findStashById(stashId)
                        .orElseThrow(() -> new NotFoundException("Stash not found: " + stashId));

        if (!signatureService.validateSignature(
                stashId, stash.getSecretKey().getValue(), xStashSignature)) {
            throw new UnauthorizedException("Invalid signature");
        }

        final var result = linkService.addLinks(stashId, addLinksBatchRequestDTO.getUrls());

        final var response = new AddLinksBatchResponseDTO();
        response.setImported(result.imported());
        response.setSkipped(result.skipped());
        response.setLinks(result.links().stream().map(this::toResponse).toList());
        response.setErrors(result.errors().stream().map(e -> {
            final var err = new BatchImportErrorDTO();
            err.setUrl(e.url());
            err.setReason(e.reason());
            return err;
        }).toList());

        return ResponseEntity.status(HttpStatus.MULTI_STATUS).body(response);
    }

    @Override
    public ResponseEntity<LinkResponseDTO> addLink(
            final UUID stashId,
            final String xStashSignature,
            final AddLinkRequestDTO addLinkRequestDTO) {
        final var stash =
                stashService
                        .findStashById(stashId)
                        .orElseThrow(() -> new NotFoundException("Stash not found: " + stashId));

        if (!signatureService.validateSignature(
                stashId, stash.getSecretKey().getValue(), xStashSignature)) {
            throw new UnauthorizedException("Invalid signature");
        }

        final var request = mapper.mapIn(addLinkRequestDTO);
        final var link = linkService.addLink(stashId, request.url());
        return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(link));
    }

    @Override
    public ResponseEntity<Void> deleteLink(
            final UUID stashId, final String xStashSignature, final UUID linkId) {
        final var stash =
                stashService
                        .findStashById(stashId)
                        .orElseThrow(() -> new NotFoundException("Stash not found: " + stashId));

        if (!signatureService.validateSignature(
                stashId, stash.getSecretKey().getValue(), xStashSignature)) {
            throw new UnauthorizedException("Invalid signature");
        }

        final var link =
                linkService
                        .findLinkById(linkId)
                        .orElseThrow(() -> new NotFoundException("Link not found: " + linkId));

        if (!link.getStashId().equals(stashId)) {
            throw new ForbiddenException("Link does not belong to this stash");
        }

        linkService.deleteLink(linkId);
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<PagedLinkResponseDTO> listLinks(
            final UUID stashId,
            final String xStashSignature,
            final String search,
            final Integer page,
            final Integer size) {
        final var stash =
                stashService
                        .findStashById(stashId)
                        .orElseThrow(() -> new NotFoundException("Stash not found: " + stashId));

        if (!signatureService.validateSignature(
                stashId, stash.getSecretKey().getValue(), xStashSignature)) {
            throw new UnauthorizedException("Invalid signature");
        }

        final var pagedResult = linkService.listLinks(stashId, search, page, size);

        final PagedLinkResponseDTO response = new PagedLinkResponseDTO();
        response.setContent(pagedResult.content().stream().map(this::toResponse).toList());
        response.setTotalElements(pagedResult.totalElements());
        response.setTotalPages(pagedResult.totalPages());
        response.setSize(pagedResult.size());
        response.setNumber(pagedResult.number());

        return ResponseEntity.ok(response);
    }

    @Override
    public ResponseEntity<Void> refreshScreenshot(
            final UUID stashId, final String xStashSignature, final UUID linkId) {
        final var stash =
                stashService
                        .findStashById(stashId)
                        .orElseThrow(() -> new NotFoundException("Stash not found: " + stashId));

        if (!signatureService.validateSignature(
                stashId, stash.getSecretKey().getValue(), xStashSignature)) {
            throw new UnauthorizedException("Invalid signature");
        }

        final var link =
                linkService
                        .findLinkById(linkId)
                        .orElseThrow(() -> new NotFoundException("Link not found: " + linkId));

        if (!link.getStashId().equals(stashId)) {
            throw new ForbiddenException("Link does not belong to this stash");
        }

        linkService.requestScreenshotRefresh(linkId);
        return ResponseEntity.accepted().build();
    }

    @Override
    public ResponseEntity<LinkResponseDTO> updateLinkMetadata(
            final UUID linkId,
            final String xIndexerSecret,
            final UpdateLinkMetadataRequestDTO dto) {
        if (!indexerCallbackSecret.equals(xIndexerSecret)) {
            throw new UnauthorizedException("Invalid indexer secret");
        }
        final var link =
                linkService.updateLinkMetadata(
                        linkId,
                        dto.getTitle(),
                        dto.getDescription(),
                        dto.getFaviconUrl(),
                        dto.getPageContent(),
                        dto.getFinalUrl());
        return ResponseEntity.ok(toResponse(link));
    }

    @PatchMapping("/links/{linkId}/status")
    public ResponseEntity<Void> updateLinkStatus(
            @PathVariable final UUID linkId,
            @RequestHeader("X-Indexer-Secret") final String xIndexerSecret,
            @RequestBody final UpdateLinkStatusRequestDTO dto) {
        if (!indexerCallbackSecret.equals(xIndexerSecret)) {
            throw new UnauthorizedException("Invalid indexer secret");
        }
        final LinkStatus status;
        try {
            status = LinkStatus.valueOf(dto.getStatus().getValue());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid status value: " + dto.getStatus());
        }
        linkService.updateLinkStatus(linkId, status);
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<LinkResponseDTO> updateLinkScreenshot(
            final UUID linkId,
            final String xIndexerSecret,
            final UpdateLinkScreenshotRequestDTO dto) {
        if (!indexerCallbackSecret.equals(xIndexerSecret)) {
            throw new UnauthorizedException("Invalid indexer secret");
        }
        final var link = linkService.updateLinkScreenshot(linkId, dto.getScreenshotKey());
        return ResponseEntity.ok(toResponse(link));
    }

    @Override
    public ResponseEntity<Void> reorderLinks(
            final UUID stashId,
            final String xStashSignature,
            final ReorderLinksRequestDTO reorderLinksRequestDTO) {
        final var stash =
                stashService
                        .findStashById(stashId)
                        .orElseThrow(() -> new NotFoundException("Stash not found: " + stashId));

        if (!signatureService.validateSignature(
                stashId, stash.getSecretKey().getValue(), xStashSignature)) {
            throw new UnauthorizedException("Invalid signature");
        }

        final var insertAfterIdNullable = reorderLinksRequestDTO.getInsertAfterId();
        final UUID insertAfterId =
                insertAfterIdNullable != null && insertAfterIdNullable.isPresent()
                        ? insertAfterIdNullable.get()
                        : null;
        linkService.reorderLinks(stashId, reorderLinksRequestDTO.getLinkIds(), insertAfterId);
        return ResponseEntity.noContent().build();
    }

    private LinkResponseDTO toResponse(final Link link) {
        final var dto = mapper.mapOut(link);
        if (link.getScreenshotKey() != null) {
            dto.setScreenshotUrl(
                    URI.create(
                            baseUrl
                                    + "/api/stashes/"
                                    + link.getStashId()
                                    + "/links/"
                                    + link.getId()
                                    + "/screenshot"));
        }
        return dto;
    }
}
